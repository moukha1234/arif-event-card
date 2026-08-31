/* ==========================================================================
   J'Y SERAI — ADMIN DASHBOARD MODULE
   
   Charge et affiche les statistiques globales depuis Firestore :
   - Nombre d'événements (total / actifs / terminés)
   - Nombre de participants
   - Nombre de téléchargements
   - Revenus
   ========================================================================== */

const AdminDashboard = (() => {

  let _db = null;

  function init(db) {
    _db = db;
  }

  // ---------------------------------------------------------------------------
  // Chargement des statistiques
  // ---------------------------------------------------------------------------

  /**
   * Charge toutes les statistiques depuis Firestore.
   * @returns {Promise<Object>} stats
   */
  async function loadStats() {
    if (!_db) return getEmptyStats();

    try {
      const [eventsSnap, participantsSnap] = await Promise.all([
        _db.collection('events').get(),
        _db.collection('participants').get()
      ]);

      let totalEvents    = 0;
      let activeEvents   = 0;
      let inactiveEvents = 0;
      let draftEvents    = 0;
      let totalDownloads = 0;
      let totalRevenue   = 0;
      let paidEvents     = 0;
      let freeEvents     = 0;
      const recentEvents = [];

      eventsSnap.forEach(doc => {
        const data = doc.data();
        totalEvents++;
        if (data.status === 'active')   activeEvents++;
        if (data.status === 'inactive') inactiveEvents++;
        if (data.status === 'draft')    draftEvents++;
        if (data.isFree === false)      paidEvents++;
        else                            freeEvents++;

        // Stats de l'événement
        if (data.stats) {
          totalDownloads += data.stats.downloads || 0;
          totalRevenue   += data.stats.revenue   || 0;
        }

        // Événements récents
        recentEvents.push({
          id:        doc.id,
          name:      data.name || 'Sans nom',
          slug:      data.slug || '',
          status:    data.status || 'draft',
          createdAt: data.createdAt,
          stats:     data.stats || {}
        });
      });

      // Trier par date de création (plus récent en premier)
      recentEvents.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        const ta = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const tb = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return tb - ta;
      });

      return {
        totalEvents,
        activeEvents,
        inactiveEvents,
        draftEvents,
        totalParticipants: participantsSnap.size,
        totalDownloads,
        totalRevenue,
        paidEvents,
        freeEvents,
        recentEvents: recentEvents.slice(0, 5)
      };

    } catch (err) {
      console.error('[AdminDashboard] Erreur chargement stats :', err);
      return getEmptyStats();
    }
  }

  function getEmptyStats() {
    return {
      totalEvents: 0, activeEvents: 0, inactiveEvents: 0, draftEvents: 0,
      totalParticipants: 0, totalDownloads: 0, totalRevenue: 0,
      paidEvents: 0, freeEvents: 0, recentEvents: []
    };
  }

  // ---------------------------------------------------------------------------
  // Rendu HTML des stats
  // ---------------------------------------------------------------------------

  /**
   * Renders the dashboard statistics into the DOM.
   */
  async function render() {
    const container = document.getElementById('section-dashboard');
    if (!container) return;

    // Afficher l'état de chargement
    const statsGrid = document.getElementById('stats-grid');
    const recentTable = document.getElementById('recent-events-tbody');
    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="stat-card-skeleton"></div>
        <div class="stat-card-skeleton"></div>
        <div class="stat-card-skeleton"></div>
        <div class="stat-card-skeleton"></div>
        <div class="stat-card-skeleton"></div>
        <div class="stat-card-skeleton"></div>
      `;
    }

    const stats = await loadStats();
    renderStatCards(stats);
    renderRecentEvents(stats.recentEvents);
  }

  function renderStatCards(stats) {
    const grid = document.getElementById('stats-grid');
    if (!grid) return;

    const cards = [
      {
        id:       'stat-total-events',
        icon:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
        label:    'Événements Total',
        value:    AdminUI.formatNumber(stats.totalEvents),
        sub:      `${stats.activeEvents} actifs · ${stats.draftEvents} brouillons`,
        gradient: 'gradient-primary'
      },
      {
        id:       'stat-active-events',
        icon:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        label:    'Événements Actifs',
        value:    AdminUI.formatNumber(stats.activeEvents),
        sub:      `${stats.inactiveEvents} inactifs`,
        gradient: 'gradient-success'
      },
      {
        id:       'stat-participants',
        icon:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
        label:    'Participants',
        value:    AdminUI.formatNumber(stats.totalParticipants),
        sub:      'Inscrits au total',
        gradient: 'gradient-secondary'
      },
      {
        id:       'stat-downloads',
        icon:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
        label:    'Téléchargements',
        value:    AdminUI.formatNumber(stats.totalDownloads),
        sub:      'Affiches générées',
        gradient: 'gradient-info'
      },
      {
        id:       'stat-revenue',
        icon:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
        label:    'Revenus',
        value:    AdminUI.formatNumber(stats.totalRevenue) + ' FCFA',
        sub:      'Paiements confirmés',
        gradient: 'gradient-warning'
      },
      {
        id:       'stat-free-events',
        icon:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`,
        label:    'Gratuits / Payants',
        value:    `${stats.freeEvents} / ${stats.paidEvents}`,
        sub:      'Répartition des événements',
        gradient: 'gradient-purple'
      }
    ];

    grid.innerHTML = cards.map(card => `
      <div class="stat-card ${card.gradient}" id="${card.id}">
        <div class="stat-card__icon">${card.icon}</div>
        <div class="stat-card__body">
          <div class="stat-card__value">${card.value}</div>
          <div class="stat-card__label">${card.label}</div>
          <div class="stat-card__sub">${card.sub}</div>
        </div>
      </div>
    `).join('');
  }

  function renderRecentEvents(events) {
    const tbody = document.getElementById('recent-events-tbody');
    if (!tbody) return;

    if (!events || events.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="table-empty">Aucun événement créé pour le moment.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = events.map(ev => `
      <tr>
        <td>
          <span class="event-name-link">${ev.name}</span>
          <small class="event-slug-label">${ev.slug}</small>
        </td>
        <td><span class="status-badge ${AdminUI.getStatusClass(ev.status)}">${AdminUI.getStatusLabel(ev.status)}</span></td>
        <td>${AdminUI.formatNumber(ev.stats.participants || 0)}</td>
        <td>${AdminUI.formatDate(ev.createdAt)}</td>
      </tr>
    `).join('');
  }

  // ---------------------------------------------------------------------------
  // Export public
  // ---------------------------------------------------------------------------
  return { init, render, loadStats };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdminDashboard };
}
