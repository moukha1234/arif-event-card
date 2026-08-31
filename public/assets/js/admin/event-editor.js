/* ==========================================================================
   J'Y SERAI — ADMIN EVENT EDITOR MODULE
   
   Gère le formulaire de création/modification d'événements avec :
   - Formulaire complet (infos générales + design + images)
   - Prévisualisation canvas en temps réel (RÉUTILISE le moteur card-engine)
   - Upload logo vers Firebase Storage
   - Sauvegarde dans Firestore
   
   IMPORTANT : Ce module NE CRÉE PAS un nouveau moteur de rendu.
   Il utilise exclusivement renderCardOnCanvas() et getLayoutConfig()
   déjà définis dans /card-engine/.
   ========================================================================== */

const AdminEventEditor = (() => {

  let _db      = null;
  let _auth    = null;
  let _storage = null;
  let _currentEventId = null;
  let _isEditing      = false;
  let _previewDebounce = null;
  let _previewLogoImg  = null;

  // Canvas de prévisualisation admin
  let _canvas = null;
  let _ctx    = null;

  function init(db, auth, storage) {
    _db      = db;
    _auth    = auth;
    _storage = storage;
  }

  // ---------------------------------------------------------------------------
  // Chargement d'un événement à modifier
  // ---------------------------------------------------------------------------

  /**
   * Charge un événement et remplit le formulaire.
   * @param {string} eventId
   */
  async function loadEvent(eventId) {
    if (!_db || !eventId) return;

    try {
      const doc = await _db.collection('events').doc(eventId).get();
      if (!doc.exists) {
        AdminUI.showToast('Événement introuvable.', 'error');
        return;
      }
      const data = { id: doc.id, ...doc.data() };
      _currentEventId = eventId;
      _isEditing = true;
      fillForm(data);
      AdminUI.showSection('event-editor');
      schedulePreviewUpdate();
    } catch (err) {
      console.error('[EventEditor] Erreur chargement:', err);
      AdminUI.showToast('Erreur lors du chargement de l\'événement.', 'error');
    }
  }

  /**
   * Prépare le formulaire pour un nouvel événement.
   */
  function newEvent() {
    _currentEventId = null;
    _isEditing      = false;
    resetForm();
    AdminUI.showSection('event-editor');
    schedulePreviewUpdate();
  }

  // ---------------------------------------------------------------------------
  // Remplissage du formulaire
  // ---------------------------------------------------------------------------

  function fillForm(data) {
    const design = data.design || {};
    const layout = design.layout || {};

    setField('ev-name',         data.name || '');
    setField('ev-slug',         data.slug || '');
    setField('ev-description',  data.description || '');
    setField('ev-organization', data.organization || '');
    setField('ev-date',         data.date || '');
    setField('ev-time',         data.time || '');
    setField('ev-venue',        data.venue || '');
    setField('ev-status',       data.status || 'draft');

    // Prix
    const isFreeToggle = document.getElementById('ev-is-free');
    if (isFreeToggle) {
      isFreeToggle.checked = data.isFree !== false;
      togglePriceFields(data.isFree !== false);
    }
    setField('ev-price',    data.price || 0);
    setField('ev-currency', data.currency || 'XOF');

    // Design — Badge
    setField('ev-badge-day',   design.badgeDay   || '');
    setField('ev-badge-month', design.badgeMonth || '');
    setField('ev-badge-time',  design.badgeTime  || '');

    // Design — Couleurs
    setField('ev-primary-color',   design.primaryColor   || '#E2007A');
    setField('ev-secondary-color', design.secondaryColor || '#00A1C9');

    // Design — Logo
    if (design.logoURL) {
      const preview = document.getElementById('ev-logo-preview');
      if (preview) {
        preview.src = design.logoURL;
        preview.style.display = 'block';
      }
    }

    // Design — Textes
    setField('ev-confirmation-text', design.confirmationText || '');
    setField('ev-org-subtitle',      design.orgSubtitle      || '');

    // Design — Positionnement photo
    setField('ev-photo-radius', layout.photoRadius || 135);
    setField('ev-photo-x',      layout.photoX      || 400);
    setField('ev-photo-y',      layout.photoY      || 445);

    // Mettre à jour les titres du bouton
    const saveBtn = document.getElementById('btn-save-event');
    const editorTitle = document.getElementById('editor-section-title');
    if (saveBtn) saveBtn.textContent = 'Mettre à jour l\'événement';
    if (editorTitle) editorTitle.textContent = `Modifier : ${data.name || 'Événement'}`;
  }

  function resetForm() {
    const form = document.getElementById('event-editor-form');
    if (form) form.reset();

    // Valeurs par défaut
    setField('ev-status',          'draft');
    setField('ev-currency',        'XOF');
    setField('ev-primary-color',   '#E2007A');
    setField('ev-secondary-color', '#00A1C9');
    setField('ev-photo-radius',    135);
    setField('ev-photo-x',         400);
    setField('ev-photo-y',         445);

    // Masquer preview logo
    const preview = document.getElementById('ev-logo-preview');
    if (preview) { preview.src = ''; preview.style.display = 'none'; }

    // Réinitialiser l'état isFree
    const isFreeToggle = document.getElementById('ev-is-free');
    if (isFreeToggle) { isFreeToggle.checked = true; togglePriceFields(true); }

    // Réinitialiser logo preview admin
    _previewLogoImg = null;

    const saveBtn = document.getElementById('btn-save-event');
    const editorTitle = document.getElementById('editor-section-title');
    if (saveBtn) saveBtn.textContent = 'Créer l\'événement';
    if (editorTitle) editorTitle.textContent = 'Créer un événement';
  }

  function setField(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') {
      el.checked = !!value;
    } else {
      el.value = value !== null && value !== undefined ? value : '';
    }
  }

  function getField(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'number')   return parseFloat(el.value) || 0;
    return el.value || '';
  }

  // ---------------------------------------------------------------------------
  // Événements du formulaire
  // ---------------------------------------------------------------------------

  function initFormListeners() {

    // Auto-slug depuis le nom
    const nameInput = document.getElementById('ev-name');
    const slugInput = document.getElementById('ev-slug');
    if (nameInput && slugInput) {
      nameInput.addEventListener('input', () => {
        if (!_isEditing || !slugInput.value) {
          slugInput.value = AdminUI.generateSlug(nameInput.value);
        }
        schedulePreviewUpdate();
      });
    }

    // Tous les champs → déclencher preview
    const previewFields = [
      'ev-slug', 'ev-organization', 'ev-date', 'ev-time', 'ev-venue', 'ev-status',
      'ev-badge-day', 'ev-badge-month', 'ev-badge-time',
      'ev-primary-color', 'ev-secondary-color',
      'ev-confirmation-text', 'ev-org-subtitle',
      'ev-photo-radius', 'ev-photo-x', 'ev-photo-y'
    ];
    previewFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', schedulePreviewUpdate);
    });

    // Toggle gratuit/payant
    const isFreeToggle = document.getElementById('ev-is-free');
    if (isFreeToggle) {
      isFreeToggle.addEventListener('change', () => togglePriceFields(isFreeToggle.checked));
    }

    // Upload logo
    const logoInput = document.getElementById('ev-logo-input');
    if (logoInput) {
      logoInput.addEventListener('change', handleLogoUpload);
    }

    // Bouton Sauvegarder
    const saveBtn = document.getElementById('btn-save-event');
    if (saveBtn) saveBtn.addEventListener('click', saveEvent);

    // Bouton Annuler
    const cancelBtn = document.getElementById('btn-cancel-event');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        AdminUI.showSection('events');
      });
    }

    // Bouton Générer PNG depuis l'éditeur
    const pngBtn = document.getElementById('btn-preview-png');
    if (pngBtn) pngBtn.addEventListener('click', exportPreviewAsPNG);
  }

  function togglePriceFields(isFree) {
    const priceGroup = document.getElementById('price-group');
    if (priceGroup) {
      priceGroup.style.display = isFree ? 'none' : 'block';
    }
  }

  // ---------------------------------------------------------------------------
  // Upload Logo
  // ---------------------------------------------------------------------------

  async function handleLogoUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      AdminUI.showToast('Veuillez sélectionner un fichier image.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      AdminUI.showToast('L\'image dépasse 5 Mo.', 'error');
      return;
    }

    // Afficher aperçu local immédiatement
    const reader = new FileReader();
    reader.onload = (ev) => {
      const preview = document.getElementById('ev-logo-preview');
      if (preview) { preview.src = ev.target.result; preview.style.display = 'block'; }

      // Charger l'image pour le canvas
      const img = new Image();
      img.onload = () => {
        _previewLogoImg = img;
        schedulePreviewUpdate();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);

    // Upload Firebase Storage (si disponible et événement existant)
    if (_storage && _currentEventId) {
      await uploadLogoToStorage(file);
    } else if (!_currentEventId) {
      AdminUI.showToast('Le logo sera uploadé lors de la sauvegarde de l\'événement.', 'info');
    }
  }

  async function uploadLogoToStorage(file) {
    if (!_storage || !_currentEventId) return null;

    const ext      = file.name.split('.').pop();
    const path     = `events/${_currentEventId}/logo.${ext}`;
    const ref      = _storage.ref(path);

    try {
      AdminUI.showToast('Upload du logo en cours...', 'info', 2000);
      await ref.put(file);
      const url = await ref.getDownloadURL();

      // Mettre à jour Firestore immédiatement
      await _db.collection('events').doc(_currentEventId).update({
        'design.logoURL': url,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      AdminUI.showToast('Logo uploadé avec succès !', 'success');
      return url;
    } catch (err) {
      console.error('[EventEditor] Upload logo error:', err);
      AdminUI.showToast('Erreur lors de l\'upload du logo.', 'error');
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Prévisualisation Canvas (temps réel)
  // ---------------------------------------------------------------------------

  /**
   * Planifie une mise à jour du canvas (debounce 300ms).
   */
  function schedulePreviewUpdate() {
    clearTimeout(_previewDebounce);
    _previewDebounce = setTimeout(updatePreview, 300);
  }

  /**
   * Construit un eventConfig depuis le formulaire courant.
   */
  function buildEventConfigFromForm() {
    return {
      id:           _currentEventId || 'preview',
      name:         getField('ev-name')         || 'Événement',
      slug:         getField('ev-slug')         || 'preview',
      organization: getField('ev-organization') || '',
      venue:        getField('ev-venue')        || 'Lieu à préciser',
      time:         getField('ev-time')         || '09h00',
      date:         getField('ev-date')         || '',
      status:       getField('ev-status')       || 'draft',
      isFree:       getField('ev-is-free'),
      price:        getField('ev-price'),
      currency:     getField('ev-currency')     || 'XOF',
      design: {
        badgeDay:         getField('ev-badge-day')         || '20',
        badgeMonth:       getField('ev-badge-month')       || 'JUIN',
        badgeTime:        getField('ev-badge-time')        || getField('ev-time') || '09h00',
        primaryColor:     getField('ev-primary-color')     || '#E2007A',
        secondaryColor:   getField('ev-secondary-color')   || '#00A1C9',
        logoURL:          (document.getElementById('ev-logo-preview') && document.getElementById('ev-logo-preview').src) || '',
        confirmationText: getField('ev-confirmation-text') || '',
        orgSubtitle:      getField('ev-org-subtitle')      || '',
        layout: {
          photoRadius: parseFloat(getField('ev-photo-radius')) || 135,
          photoX:      parseFloat(getField('ev-photo-x'))      || 400,
          photoY:      parseFloat(getField('ev-photo-y'))      || 445
        }
      }
    };
  }

  /**
   * Met à jour le canvas de prévisualisation.
   * RÉUTILISE renderCardOnCanvas() et getLayoutConfig() du moteur existant.
   */
  async function updatePreview() {
    if (!_canvas || !_ctx) return;

    const eventConfig  = buildEventConfigFromForm();

    // getLayoutConfig() est défini dans card-engine/layout-config.js
    const layoutConfig = getLayoutConfig(eventConfig);

    // Charger le logo (depuis le formulaire ou la preview locale)
    let logoImg = _previewLogoImg;
    if (!logoImg && eventConfig.design.logoURL && !eventConfig.design.logoURL.startsWith('data:')) {
      try {
        logoImg = await loadImageAdmin(eventConfig.design.logoURL);
      } catch (e) { logoImg = null; }
    }

    // Nom d'exemple pour la preview
    const displayName = 'PRÉNOM NOM EXEMPLE';
    const nameFontSize = 32;

    // Textes de preview (basés sur le formulaire)
    const cardText = {
      badgeDay:   eventConfig.design.badgeDay,
      badgeMonth: eventConfig.design.badgeMonth,
      badgeTime:  eventConfig.design.badgeTime,
      venue:      eventConfig.venue,
      time:       eventConfig.time,
      orgSubtitle: eventConfig.design.orgSubtitle,
      statementSegments: eventConfig.design.confirmationText
        ? buildStatementSegments(eventConfig.design.confirmationText, eventConfig.design.primaryColor)
        : null
    };

    // Effacer le canvas
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);

    // renderCardOnCanvas() est défini dans card-engine/canvas-renderer.js
    renderCardOnCanvas(
      _ctx,
      _canvas,
      logoImg,         // logoImg
      null,            // scallopedImg (badge SVG — non disponible en admin)
      null,            // starImg
      null,            // pinImg
      null,            // clockImg
      null,            // userImg (photo placeholder)
      null,            // placeholderImg
      displayName,
      nameFontSize,
      layoutConfig,
      { zoom: 1, x: 0, y: 0 },
      cardText
    );

    // Rendre le badge date directement sur canvas (sans SVG)
    renderAdminBadge(_ctx, layoutConfig, eventConfig.design);
  }

  /**
   * Dessine le badge date directement (sans SVG intermédiaire, pour l'admin preview).
   */
  function renderAdminBadge(ctx, layout, design) {
    const bx = layout.dateBadge.x + layout.dateBadge.width / 2;
    const by = layout.dateBadge.y + layout.dateBadge.height / 2;
    const r  = layout.dateBadge.width / 2;

    // Cercle blanc
    ctx.save();
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = design.primaryColor || '#E2007A';
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Textes
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = design.primaryColor || '#E2007A';

    ctx.font = "900 34px 'Montserrat', sans-serif";
    ctx.fillText(design.badgeDay || '20', bx, by - 14);

    ctx.font = "800 16px 'Montserrat', sans-serif";
    ctx.fillText(design.badgeMonth || 'JUIN', bx, by + 8);

    ctx.font = "700 13px 'Montserrat', sans-serif";
    ctx.fillText(design.badgeTime || '09h00', bx, by + 28);

    ctx.restore();
  }

  /**
   * Construit les segments rich-text depuis le texte de confirmation.
   */
  function buildStatementSegments(text, primaryColor) {
    const defaultFont = "500 17px 'Inter', sans-serif";
    return [{ text, font: defaultFont, color: '#334155' }];
  }

  /**
   * Charge une image depuis une URL.
   */
  function loadImageAdmin(src) {
    return new Promise((resolve, reject) => {
      if (!src) { resolve(null); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  /**
   * Exporte la preview admin en PNG téléchargeable.
   */
  async function exportPreviewAsPNG() {
    if (!_canvas) return;

    // Forcer une mise à jour complète
    await updatePreview();

    _canvas.toBlob(blob => {
      if (!blob) return;
      const name  = getField('ev-name') || 'preview';
      const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const url   = URL.createObjectURL(blob);
      const link  = document.createElement('a');
      link.download = `ADMIN_PREVIEW_${clean}.png`;
      link.href     = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }, 'image/png');
  }

  // ---------------------------------------------------------------------------
  // Initialisation du canvas
  // ---------------------------------------------------------------------------

  function initCanvas() {
    _canvas = document.getElementById('admin-preview-canvas');
    if (!_canvas) return;

    _canvas.width  = 800;
    _canvas.height = 1000;
    _ctx = _canvas.getContext('2d');
    _ctx.imageSmoothingEnabled = true;
    _ctx.imageSmoothingQuality = 'high';
  }

  // ---------------------------------------------------------------------------
  // Sauvegarde Firestore
  // ---------------------------------------------------------------------------

  async function saveEvent() {
    const saveBtn = document.getElementById('btn-save-event');

    // Validation
    const name = getField('ev-name');
    const slug = getField('ev-slug');
    if (!name) { AdminUI.showToast('Le nom de l\'événement est requis.', 'error'); return; }
    if (!slug) { AdminUI.showToast('Le slug est requis.', 'error'); return; }

    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Enregistrement...'; }

    try {
      const currentUser = _auth && _auth.currentUser;

      // Upload logo si fichier local sélectionné et pas encore uploadé
      let logoURL = '';
      const logoPreview = document.getElementById('ev-logo-preview');
      if (logoPreview && logoPreview.src) {
        if (logoPreview.src.startsWith('data:') && _storage) {
          // Upload Storage d'abord (nécessite un ID)
          // Pour les nouveaux événements, on crée d'abord le doc
          logoURL = logoPreview.src; // On gardera le data URL temporairement
        } else {
          logoURL = logoPreview.src;
        }
      }

      // Données complètes de l'événement
      const photoRadius = parseFloat(getField('ev-photo-radius')) || 135;
      const photoX      = parseFloat(getField('ev-photo-x'))      || 400;
      const photoY      = parseFloat(getField('ev-photo-y'))      || 445;

      const eventData = {
        name:         getField('ev-name'),
        slug:         getField('ev-slug'),
        description:  getField('ev-description')  || '',
        organization: getField('ev-organization') || '',
        date:         getField('ev-date')         || '',
        time:         getField('ev-time')         || '',
        venue:        getField('ev-venue')        || '',
        status:       getField('ev-status')       || 'draft',
        isFree:       getField('ev-is-free'),
        price:        getField('ev-price')        || 0,
        currency:     getField('ev-currency')     || 'XOF',

        design: {
          badgeDay:         getField('ev-badge-day')         || '',
          badgeMonth:       getField('ev-badge-month')       || '',
          badgeTime:        getField('ev-badge-time')        || getField('ev-time') || '',
          primaryColor:     getField('ev-primary-color')     || '#E2007A',
          secondaryColor:   getField('ev-secondary-color')   || '#00A1C9',
          logoURL:          logoURL,
          confirmationText: getField('ev-confirmation-text') || '',
          orgSubtitle:      getField('ev-org-subtitle')      || '',
          layout: {
            photoRadius,
            photoX,
            photoY
          }
        },

        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser ? currentUser.uid : null
      };

      let docId = _currentEventId;

      if (_isEditing && _currentEventId) {
        // Mise à jour
        await _db.collection('events').doc(_currentEventId).update(eventData);
        AdminUI.showToast('Événement mis à jour avec succès !', 'success');
      } else {
        // Création
        eventData.stats = { participants: 0, downloads: 0, revenue: 0 };
        eventData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        eventData.createdBy = currentUser ? currentUser.uid : null;

        const ref = await _db.collection('events').add(eventData);
        docId = ref.id;
        _currentEventId = docId;
        _isEditing      = true;

        AdminUI.showToast('Événement créé avec succès !', 'success');

        // Update button texts
        const editorTitle = document.getElementById('editor-section-title');
        if (editorTitle) editorTitle.textContent = `Modifier : ${eventData.name}`;
        if (saveBtn) saveBtn.textContent = 'Mettre à jour l\'événement';
      }

      // Upload logo Storage si data URL et qu'on a maintenant un ID
      if (logoURL && logoURL.startsWith('data:') && _storage && docId) {
        const logoInput = document.getElementById('ev-logo-input');
        if (logoInput && logoInput.files && logoInput.files[0]) {
          const url = await uploadLogoToStorage(logoInput.files[0]);
          if (url) {
            // Mettre à jour la preview
            if (logoPreview) logoPreview.src = url;
          }
        }
      }

    } catch (err) {
      console.error('[EventEditor] Save error:', err);
      AdminUI.showToast('Erreur lors de la sauvegarde : ' + err.message, 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = _isEditing ? 'Mettre à jour l\'événement' : 'Créer l\'événement';
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Initialisation complète
  // ---------------------------------------------------------------------------

  function initAll() {
    initCanvas();
    initFormListeners();
    schedulePreviewUpdate();
  }

  // ---------------------------------------------------------------------------
  // Export public
  // ---------------------------------------------------------------------------
  return {
    init,
    initAll,
    loadEvent,
    newEvent,
    saveEvent,
    updatePreview,
    schedulePreviewUpdate
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdminEventEditor };
}
