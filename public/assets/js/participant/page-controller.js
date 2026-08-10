/* ==========================================================================
   J'Y SERAI — PAGE CONTROLLER (PARTICIPANT — FIRESTORE DYNAMIC)
   
   Ce module orchestre la page participant V2 :
   - Initialisation Firebase
   - Chargement dynamique de l'événement depuis Firestore (event-loader.js)
   - Application dynamique des styles CSS & du design
   - Mise à jour en temps réel de la carte et des sliders
   - Déclenchement de l'export PNG via card-export.js
   ========================================================================== */

// ---------------------------------------------------------------------------
// Configuration Firebase (v8 compat)
// ---------------------------------------------------------------------------
const firebaseConfig = {
  projectId:         'arif-event-card',
  appId:             '1:260697604272:web:a3a164579b057ea25d7b75',
  storageBucket:     'arif-event-card.firebasestorage.app',
  apiKey:            'AIzaSyByEBDcf9idUpInhgeQ-9eY-is9eFPBa6M',
  authDomain:        'arif-event-card.firebaseapp.com',
  messagingSenderId: '260697604272'
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Variables globales de la page
let currentEventConfig = null;
let layoutConfig       = null;

// ---------------------------------------------------------------------------
// Helper : Hydratation dynamique du DOM depuis eventConfig
// ---------------------------------------------------------------------------
function hydrateDOMWithEvent(eventConfig) {
  const d = eventConfig.design || {};

  // Titres & sous-titres header
  const headerTitle    = document.getElementById('event-header-title');
  const headerSubtitle = document.getElementById('event-header-subtitle');
  const pageTitle      = document.getElementById('page-title');
  if (headerTitle)    headerTitle.textContent    = eventConfig.name || eventConfig.title || "J'y Serai";
  if (headerSubtitle) headerSubtitle.textContent = eventConfig.description || "Générez votre affiche de participation personnalisée";
  if (pageTitle)      pageTitle.textContent      = `J'y Serai – ${eventConfig.name || 'Générateur'}`;

  // Couleurs dynamiques (variables CSS custom)
  if (d.primaryColor) {
    document.documentElement.style.setProperty('--color-primary', d.primaryColor);
  }
  if (d.secondaryColor) {
    document.documentElement.style.setProperty('--color-secondary', d.secondaryColor);
  }

  // Badge date sur l'affiche
  const badgeDay   = document.querySelector('.scalloped-day');
  const badgeMonth = document.querySelector('.scalloped-month');
  const timeEl     = document.querySelector('.scalloped-time');
  if (badgeDay)   badgeDay.textContent   = d.badgeDay   || '20';
  if (badgeMonth) badgeMonth.textContent = d.badgeMonth || 'JUIN';
  if (timeEl)     timeEl.textContent     = d.badgeTime  || eventConfig.time || '09h00';

  // Texte de confirmation & sous-titre
  const statementBlock = document.getElementById('confirmation-statement-block');
  const orgSubtitle    = document.getElementById('card-org-subtitle');
  if (statementBlock && d.confirmationText) {
    // Si confirmationText est fourni, remplacer le texte principal
    const orgHtml = orgSubtitle ? `<span class="org-subtitle" id="card-org-subtitle">${d.orgSubtitle || ''}</span>` : '';
    statementBlock.innerHTML = `${d.confirmationText} ${orgHtml}`;
  } else if (orgSubtitle && d.orgSubtitle) {
    orgSubtitle.textContent = d.orgSubtitle;
  }

  // Lieu et Heure
  const venueEl = document.getElementById('card-venue');
  const timeDetailEl = document.getElementById('card-time');
  if (venueEl)      venueEl.textContent      = eventConfig.venue || 'Mairie Ville de Rufisque';
  if (timeDetailEl) timeDetailEl.textContent = eventConfig.time  || 'À partir de 09h00';

  // Logo si fourni
  if (d.logoURL) {
    const appLogo  = document.getElementById('app-logo');
    const cardLogo = document.querySelector('.card-logo');
    if (appLogo)  appLogo.src  = d.logoURL;
    if (cardLogo) cardLogo.src = d.logoURL;
  }
}

// ---------------------------------------------------------------------------
// Initialisation de la page au chargement du DOM
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {

  const loadingState = document.getElementById('event-loading-state');
  const errorState   = document.getElementById('event-error-state');
  const mainContent  = document.getElementById('main-app-content');
  const errorTitle   = document.getElementById('error-title');
  const errorDesc    = document.getElementById('error-desc');

  // Seed silencieux Firestore pour s'assurer que la collection "events" contient au moins les démos
  if (typeof seedFirestoreEvents === 'function') {
    seedFirestoreEvents(db).catch(err => console.warn('[PageController] Seed error:', err));
  }

  // 1. CHARGEMENT DYNAMIQUE DE L'ÉVÉNEMENT DEPUIS FIRESTORE
  try {
    currentEventConfig = await loadEventConfig(db);
    layoutConfig       = getLayoutConfig(currentEventConfig);

    // Hydrater le DOM avec les données reçues
    hydrateDOMWithEvent(currentEventConfig);

    // Masquer le loader, afficher le contenu principal
    if (loadingState) loadingState.classList.add('hidden');
    if (mainContent)  mainContent.classList.remove('hidden');

  } catch (error) {
    console.error('[PageController] Erreur de chargement événement :', error);
    if (loadingState) loadingState.classList.add('hidden');
    if (errorState)   errorState.classList.remove('hidden');

    if (error.message === 'EVENT_DISABLED') {
      if (errorTitle) errorTitle.textContent = 'Événement désactivé';
      if (errorDesc)  errorDesc.textContent  = "Cet événement a été temporairement désactivé par l'organisateur.";
    } else {
      if (errorTitle) errorTitle.textContent = 'Événement introuvable';
      if (errorDesc)  errorDesc.textContent  = "Aucun événement ne correspond à l'adresse demandée.";
    }
    return; // Stopper l'initialisation des événements UI si l'événement n'est pas valide
  }

  // --- Références DOM ---
  const inputName          = document.getElementById('input-name');
  const cardUserName       = document.getElementById('card-user-name');
  const inputImage         = document.getElementById('input-image');
  const dropzone           = document.getElementById('dropzone');
  const uploadThumb        = document.getElementById('upload-thumb');
  const thumbContainer     = document.getElementById('thumb-container');
  const btnRemoveImg       = document.getElementById('btn-remove-img');
  const btnResetForm       = document.getElementById('btn-reset-form');
  const previewPlaceholder = document.getElementById('preview-placeholder');
  const previewUserImg     = document.getElementById('preview-user-img');
  const adjustPanel        = document.getElementById('adjust-panel');
  const sliderZoom         = document.getElementById('slider-zoom');
  const sliderX            = document.getElementById('slider-x');
  const sliderY            = document.getElementById('slider-y');
  const valZoom            = document.getElementById('val-zoom');
  const valX               = document.getElementById('val-x');
  const valY               = document.getElementById('val-y');
  const btnDownloadCard    = document.getElementById('btn-download-card');
  const eventCard          = document.getElementById('event-card');
  const viewportWrapper    = document.querySelector('.card-viewport-wrapper');
  const toastSuccess       = document.getElementById('toast-success');
  const btnCloseToast      = document.getElementById('btn-close-toast');
  let toastTimeout;

  // ==========================================================================
  // 1. SCALING RESPONSIVE DE L'APERÇU CARTE
  // ==========================================================================
  const scaleCardToFit = () => {
    if (!viewportWrapper || !eventCard) return;
    const scale = viewportWrapper.clientWidth / 800;
    eventCard.style.setProperty('--card-scale', scale);
  };

  if (window.ResizeObserver) {
    new ResizeObserver(scaleCardToFit).observe(viewportWrapper);
  } else {
    window.addEventListener('resize', scaleCardToFit);
    scaleCardToFit();
  }

  // ==========================================================================
  // 2. MISE À JOUR EN TEMPS RÉEL DU NOM (avec auto-shrink)
  // ==========================================================================
  if (inputName) {
    inputName.addEventListener('input', (e) => {
      const value = e.target.value.trim();
      if (value) {
        cardUserName.textContent    = value;
        cardUserName.style.fontSize = `${calculateFontSize(value.length)}px`;
      } else {
        cardUserName.textContent    = 'Votre Nom Complet';
        cardUserName.style.fontSize = '40px';
      }
    });
  }

  // ==========================================================================
  // 3. GESTION UPLOAD & DRAG-AND-DROP DE LA PHOTO
  // ==========================================================================
  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (PNG, JPG, JPEG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("L'image dépasse la taille maximale autorisée (5 Mo).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (uploadThumb)    uploadThumb.src = dataUrl;
      if (thumbContainer) thumbContainer.style.display = 'flex';
      if (previewUserImg) {
        previewUserImg.src = dataUrl;
        previewUserImg.classList.remove('hidden');
      }
      if (previewPlaceholder) previewPlaceholder.classList.add('hidden');
      if (adjustPanel)        adjustPanel.classList.remove('collapsed');
      resetImageAdjustments();
    };
    reader.readAsDataURL(file);
  };

  const resetImageAdjustments = () => {
    if (sliderZoom) sliderZoom.value = 100;
    if (sliderX)    sliderX.value    = 0;
    if (sliderY)    sliderY.value    = 0;
    if (valZoom)    valZoom.textContent = '100%';
    if (valX)       valX.textContent    = '0px';
    if (valY)       valY.textContent    = '0px';
    updateImageTransform();
  };

  const removeUserImage = () => {
    if (inputImage)     inputImage.value             = '';
    if (uploadThumb)    uploadThumb.src              = '';
    if (thumbContainer) thumbContainer.style.display = 'none';
    if (previewUserImg) {
      previewUserImg.src = '';
      previewUserImg.classList.add('hidden');
      previewUserImg.style.transform = '';
    }
    if (previewPlaceholder) previewPlaceholder.classList.remove('hidden');
    if (adjustPanel)        adjustPanel.classList.add('collapsed');
  };

  if (inputImage) {
    inputImage.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handleImageFile(e.target.files[0]);
    });
  }

  if (dropzone) {
    ['dragenter', 'dragover'].forEach(evt => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault(); e.stopPropagation();
        dropzone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(evt => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault(); e.stopPropagation();
        dropzone.classList.remove('dragover');
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files[0]) handleImageFile(files[0]);
    }, false);
  }

  if (btnRemoveImg) {
    btnRemoveImg.addEventListener('click', (e) => {
      e.stopPropagation();
      removeUserImage();
    });
  }

  // ==========================================================================
  // 4. AJUSTEMENTS PHOTO (Zoom + Déplacements)
  // ==========================================================================
  const updateImageTransform = () => {
    if (!previewUserImg || !sliderZoom || !sliderX || !sliderY) return;
    const zoom = sliderZoom.value / 100;
    const x    = sliderX.value;
    const y    = sliderY.value;
    if (valZoom) valZoom.textContent = `${sliderZoom.value}%`;
    if (valX)    valX.textContent    = `${x}px`;
    if (valY)    valY.textContent    = `${y}px`;
    previewUserImg.style.transform   = `translate(${x}px, ${y}px) scale(${zoom})`;
  };

  if (sliderZoom) sliderZoom.addEventListener('input', updateImageTransform);
  if (sliderX)    sliderX.addEventListener('input',    updateImageTransform);
  if (sliderY)    sliderY.addEventListener('input',    updateImageTransform);

  // ==========================================================================
  // 5. RESET FORMULAIRE
  // ==========================================================================
  const resetForm = () => {
    if (inputName) inputName.value = '';
    if (cardUserName) {
      cardUserName.textContent = 'Votre Nom Complet';
      cardUserName.style.fontSize = '40px';
    }
    removeUserImage();
    hideToast();
  };

  if (btnResetForm) btnResetForm.addEventListener('click', resetForm);

  // ==========================================================================
  // 6. TOAST DE SUCCÈS
  // ==========================================================================
  const showToast = () => {
    if (!toastSuccess) return;
    clearTimeout(toastTimeout);
    toastSuccess.classList.remove('hidden');
    toastTimeout = setTimeout(hideToast, 5000);
  };

  const hideToast = () => {
    if (toastSuccess) toastSuccess.classList.add('hidden');
  };

  if (btnCloseToast) btnCloseToast.addEventListener('click', hideToast);

  // ==========================================================================
  // 7. TÉLÉCHARGEMENT — Appel à exportCard()
  // ==========================================================================
  if (btnDownloadCard) {
    btnDownloadCard.addEventListener('click', async () => {
      const rawName     = inputName ? inputName.value.trim() : '';
      const displayName = (rawName ? rawName : 'PARTICIPANT').toUpperCase();
      const userImgSrc  = (previewUserImg && !previewUserImg.classList.contains('hidden') && previewUserImg.src)
        ? previewUserImg.src
        : '';

      const photoAdjust = {
        zoom: sliderZoom ? parseFloat(sliderZoom.value) / 100 : 1,
        x:    sliderX    ? parseFloat(sliderX.value)          : 0,
        y:    sliderY    ? parseFloat(sliderY.value)          : 0
      };

      const btnText        = btnDownloadCard.querySelector('.btn-text');
      const btnLoadingText = btnDownloadCard.querySelector('.btn-loading-text');

      await exportCard({
        displayName,
        rawName,
        userImgSrc,
        photoAdjust,
        layoutConfig: layoutConfig || getLayoutConfig(currentEventConfig),

        // Phase 7 : hook de paiement (gratuit pour l'instant)
        downloadGate: async () => true,

        db,
        eventId: currentEventConfig ? currentEventConfig.id : 'default',

        onStart: () => {
          btnDownloadCard.disabled = true;
          if (btnText)        btnText.classList.add('hidden');
          if (btnLoadingText) btnLoadingText.classList.remove('hidden');
        },

        onSuccess: () => {
          if (eventCard) {
            eventCard.classList.add('success-pop');
            setTimeout(() => eventCard.classList.remove('success-pop'), 600);
          }
          showToast();
        },

        onError: (err) => {
          if (err.message === 'PAYMENT_REQUIRED') {
            alert('Paiement requis pour télécharger votre affiche.');
          } else {
            console.error('Export error:', err);
            alert('Une erreur est survenue lors de la génération. Veuillez réessayer.');
          }
        }
      });

      btnDownloadCard.disabled = false;
      if (btnText)        btnText.classList.remove('hidden');
      if (btnLoadingText) btnLoadingText.classList.add('hidden');
    });
  }

}); // DOMContentLoaded
