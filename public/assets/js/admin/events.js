/* ==========================================================================
   J'Y SERAI — ADMIN EVENTS MODULE
   
   Gère la liste des événements Firestore :
   - Chargement de tous les événements (admin voit tous les statuts)
   - Affichage en tableau avec actions
   - Activer/Désactiver un événement
   - Supprimer (avec confirmation)
   - Dupliquer un événement
   - Copier le lien public
   ========================================================================== */

const AdminEvents = (() => {

  let _db = null;
  let _auth = null;
  let _currentFilter = 'all';
  let _allEvents = [];
  let _onEditCallback = null;

  function init(db, auth) {
    _db = db;
    _auth = auth;
  }

  /**
   * Enregistre le callback d'édition (appelé quand l'admin clique sur "Modifier").
   * @param {Function} callback - (eventId) => void
   */
  function onEditEvent(callback) {
    _onEditCallback = callback;
  }

  // ---------------------------------------------------------------------------
  // Chargement depuis Firestore
  // ---------------------------------------------------------------------------

  /**
   * Charge tous les événements depuis Firestore (toutes statuts).
   */
  async function loadEvents() {
    if (!_db) return [];

    try {
      const snap = await _db.collection('events')
        .orderBy('createdAt', 'desc')
        .get();

      _allEvents = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return _allEvents;

    } catch (err) {
      // Essai sans orderBy si index manquant
      console.warn('[AdminEvents] orderBy failed, fallback sans tri :', err.message);
      try {
        const snap2 = await _db.collection('events').get();
        _allEvents = snap2.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return _allEvents;
      } catch (err2) {
        console.error('[AdminEvents] Erreur chargement events :', err2);
        return [];
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Rendu tableau
  // ---------------------------------------------------------------------------

  async function render() {
    const container = document.getElementById('events-table-container');
    if (!container) return;

    AdminUI.setLoading(container, true, 'Chargement des événements...');
    await loadEvents();
    renderTable();
    initFilters();
  }

  function getFilteredEvents() {
    if (_currentFilter === 'all') return _allEvents;
    return _allEvents.filter(ev => ev.status === _currentFilter);
  }

  function renderTable() {
    const container = document.getElementById('events-table-container');
    if (!container) return;

    const events = getFilteredEvents();

    if (events.length === 0) {
      container.innerHTML = `
        <div class="admin-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;margin-bottom:1rem;opacity:0.4">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <p>Aucun événement trouvé.</p>
          <button class="admin-btn admin-btn--primary" onclick="AdminUI.showSection('event-editor')">
            + Créer un événement
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="admin-table" id="events-table">
          <thead>
            <tr>
              <th>Événement</th>
              <th>Date</th>
              <th>Lieu</th>
              <th>Statut</th>
              <th>Prix</th>
              <th>Participants</th>
              <th>Téléch.</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="events-tbody">
            ${events.map(ev => renderEventRow(ev)).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Attacher les événements aux boutons
    attachRowActions();
  }

  function renderEventRow(ev) {
    const stats = ev.stats || {};
    const price = ev.isFree ? '<span class="price-badge price-badge--free">Gratuit</span>'
                            : `<span class="price-badge price-badge--paid">${AdminUI.formatNumber(ev.price || 0)} ${ev.currency || 'XOF'}</span>`;

    return `
      <tr data-event-id="${ev.id}">
        <td>
          <div class="event-cell">
            <div class="event-cell__name">${ev.name || 'Sans nom'}</div>
            <div class="event-cell__slug">${ev.slug || ''}</div>
          </div>
        </td>
        <td>${ev.date ? formatEventDate(ev.date) : (ev.design && ev.design.badgeDay ? `${ev.design.badgeDay} ${ev.design.badgeMonth}` : '—')}</td>
        <td class="venue-cell">${ev.venue || '—'}</td>
        <td><span class="status-badge ${AdminUI.getStatusClass(ev.status)}">${AdminUI.getStatusLabel(ev.status)}</span></td>
        <td>${price}</td>
        <td>${AdminUI.formatNumber(stats.participants)}</td>
        <td>${AdminUI.formatNumber(stats.downloads)}</td>
        <td>
          <div class="action-buttons">
            <button class="action-btn action-btn--edit" data-id="${ev.id}" title="Modifier">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="action-btn action-btn--duplicate" data-id="${ev.id}" title="Dupliquer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <button class="action-btn action-btn--toggle ${ev.status === 'active' ? 'action-btn--deactivate' : 'action-btn--activate'}"
                    data-id="${ev.id}" data-status="${ev.status}"
                    title="${ev.status === 'active' ? 'Désactiver' : 'Activer'}">
              ${ev.status === 'active'
                ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"></rect><circle cx="16" cy="12" r="3" fill="currentColor"></circle></svg>`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"></rect><circle cx="8" cy="12" r="3" fill="currentColor"></circle></svg>`
              }
            </button>
            <button class="action-btn action-btn--link" data-slug="${ev.slug || ''}" title="Copier le lien public">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            </button>
            <button class="action-btn action-btn--delete" data-id="${ev.id}" title="Supprimer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  function formatEventDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  }

  // ---------------------------------------------------------------------------
  // Actions sur les lignes du tableau
  // ---------------------------------------------------------------------------

  function attachRowActions() {
    // Modifier
    document.querySelectorAll('.action-btn--edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (_onEditCallback) _onEditCallback(id);
      });
    });

    // Dupliquer
    document.querySelectorAll('.action-btn--duplicate').forEach(btn => {
      btn.addEventListener('click', () => duplicateEvent(btn.dataset.id));
    });

    // Toggle statut
    document.querySelectorAll('.action-btn--toggle').forEach(btn => {
      btn.addEventListener('click', () => toggleEventStatus(btn.dataset.id, btn.dataset.status));
    });

    // Copier lien
    document.querySelectorAll('.action-btn--link').forEach(btn => {
      btn.addEventListener('click', () => copyEventLink(btn.dataset.slug));
    });

    // Supprimer
    document.querySelectorAll('.action-btn--delete').forEach(btn => {
      btn.addEventListener('click', () => deleteEvent(btn.dataset.id));
    });
  }

  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  /**
   * Active ou désactive un événement.
   */
  async function toggleEventStatus(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const label = newStatus === 'active' ? 'activer' : 'désactiver';

    const confirmed = await AdminUI.confirm({
      title:       `${newStatus === 'active' ? 'Activer' : 'Désactiver'} l'événement`,
      message:     `Voulez-vous vraiment ${label} cet événement ?`,
      confirmText: newStatus === 'active' ? 'Activer' : 'Désactiver',
      type:        newStatus === 'active' ? 'primary' : 'warning'
    });

    if (!confirmed) return;

    try {
      await _db.collection('events').doc(id).update({
        status:    newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: _auth && _auth.currentUser ? _auth.currentUser.uid : null
      });
      AdminUI.showToast(`Événement ${newStatus === 'active' ? 'activé' : 'désactivé'} avec succès.`, 'success');
      await render();
    } catch (err) {
      console.error('[AdminEvents] Toggle error:', err);
      AdminUI.showToast('Erreur lors de la mise à jour du statut.', 'error');
    }
  }

  /**
   * Supprime définitivement un événement après confirmation.
   */
  async function deleteEvent(id) {
    const event = _allEvents.find(e => e.id === id);
    const name  = event ? event.name : 'cet événement';

    const confirmed = await AdminUI.confirm({
      title:       'Supprimer l\'événement',
      message:     `Êtes-vous sûr de vouloir supprimer définitivement <strong>${name}</strong> ? Cette action est irréversible.`,
      confirmText: 'Supprimer définitivement',
      type:        'danger'
    });

    if (!confirmed) return;

    try {
      await _db.collection('events').doc(id).delete();
      AdminUI.showToast('Événement supprimé.', 'success');
      await render();
    } catch (err) {
      console.error('[AdminEvents] Delete error:', err);
      AdminUI.showToast('Erreur lors de la suppression.', 'error');
    }
  }

  /**
   * Duplique un événement en créant un nouveau document Firestore.
   */
  async function duplicateEvent(id) {
    const event = _allEvents.find(e => e.id === id);
    if (!event) return;

    const newName = event.name + ' (copie)';
    const newSlug = AdminUI.generateSlug(newName);

    const confirmed = await AdminUI.confirm({
      title:       'Dupliquer l\'événement',
      message:     `Une copie de <strong>${event.name}</strong> sera créée sous le nom <strong>${newName}</strong>.`,
      confirmText: 'Dupliquer',
      type:        'primary'
    });

    if (!confirmed) return;

    try {
      // Cloner l'événement sans l'ID
      const { id: _id, ...eventData } = event;
      const currentUser = _auth && _auth.currentUser;

      const newEvent = {
        ...eventData,
        name:      newName,
        slug:      newSlug,
        status:    'draft',        // La copie commence en brouillon
        stats:     { participants: 0, downloads: 0, revenue: 0 },
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentUser ? currentUser.uid : null,
        updatedBy: currentUser ? currentUser.uid : null
      };

      await _db.collection('events').add(newEvent);
      AdminUI.showToast(`Événement dupliqué avec succès. Brouillon : "${newName}"`, 'success');
      await render();
    } catch (err) {
      console.error('[AdminEvents] Duplicate error:', err);
      AdminUI.showToast('Erreur lors de la duplication.', 'error');
    }
  }

  /**
   * Copie le lien public d'un événement dans le presse-papier.
   */
  async function copyEventLink(slug) {
    if (!slug) {
      AdminUI.showToast('Cet événement n\'a pas encore de slug.', 'warning');
      return;
    }
    const url = `https://arif-event-card.web.app/public/assets/pages/index.html?e=${slug}`;
    const ok  = await AdminUI.copyToClipboard(url);
    if (ok) {
      AdminUI.showToast('Lien copié dans le presse-papier !', 'success');
    } else {
      AdminUI.showToast('Impossible de copier. URL : ' + url, 'info', 8000);
    }
  }

  // ---------------------------------------------------------------------------
  // Filtres
  // ---------------------------------------------------------------------------

  function initFilters() {
    document.querySelectorAll('.events-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.events-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _currentFilter = btn.dataset.filter || 'all';
        renderTable();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Export public
  // ---------------------------------------------------------------------------
  return {
    init,
    render,
    loadEvents,
    deleteEvent,
    duplicateEvent,
    toggleEventStatus,
    copyEventLink,
    onEditEvent
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdminEvents };
}
