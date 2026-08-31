/* ==========================================================================
   J'Y SERAI — ADMIN UI MODULE
   
   Gère la navigation entre les sections du dashboard,
   les notifications toast, les modales de confirmation,
   et les états de chargement.
   ========================================================================== */

const AdminUI = (() => {

  // ---------------------------------------------------------------------------
  // Navigation / Sections
  // ---------------------------------------------------------------------------

  let _currentSection = 'dashboard';
  const _sectionChangeListeners = [];

  /**
   * Affiche une section du dashboard et masque les autres.
   * @param {string} sectionId - ID de la section (sans le préfixe 'section-')
   */
  function showSection(sectionId) {
    // Masquer toutes les sections
    document.querySelectorAll('.admin-section').forEach(el => {
      el.classList.remove('active');
    });

    // Afficher la section cible
    const target = document.getElementById(`section-${sectionId}`);
    if (target) {
      target.classList.add('active');
    } else {
      console.warn('[AdminUI] Section introuvable :', sectionId);
      return;
    }

    // Mettre à jour la navigation active
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.remove('active');
      if (el.dataset.section === sectionId) {
        el.classList.add('active');
      }
    });

    // Mettre à jour le titre du header
    const navItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
    const pageTitle = document.getElementById('admin-page-title');
    if (pageTitle && navItem) {
      const labelEl = navItem.querySelector('.nav-label');
      if (labelEl) pageTitle.textContent = labelEl.textContent;
    }

    _currentSection = sectionId;

    // Notifier les listeners
    _sectionChangeListeners.forEach(fn => fn(sectionId));

    // Fermer sidebar sur mobile
    closeSidebar();
  }

  /**
   * Enregistre un listener appelé lors d'un changement de section.
   * @param {Function} callback - (sectionId) => void
   */
  function onSectionChange(callback) {
    _sectionChangeListeners.push(callback);
  }

  function getCurrentSection() { return _currentSection; }

  // ---------------------------------------------------------------------------
  // Sidebar (mobile)
  // ---------------------------------------------------------------------------

  function openSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('visible');
  }

  function closeSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('visible');
  }

  function initSidebar() {
    // Bouton hamburger
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    if (btnToggle) btnToggle.addEventListener('click', openSidebar);

    // Overlay click → fermer
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // Navigation items
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        if (section) showSection(section);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Toast Notifications
  // ---------------------------------------------------------------------------

  let _toastTimeout = null;

  /**
   * Affiche une notification toast.
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} [type='success']
   * @param {number} [duration=4000]
   */
  function showToast(message, type = 'success', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `admin-toast admin-toast--${type}`;

    const icons = {
      success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
      error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
      warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
      info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
    };

    toast.innerHTML = `
      <span class="admin-toast__icon">${icons[type] || icons.info}</span>
      <span class="admin-toast__message">${message}</span>
      <button class="admin-toast__close" title="Fermer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;

    toast.querySelector('.admin-toast__close').addEventListener('click', () => {
      dismissToast(toast);
    });

    container.appendChild(toast);

    // Animation entrée
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('visible'));
    });

    // Auto-dismiss
    setTimeout(() => dismissToast(toast), duration);
  }

  function dismissToast(toast) {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 350);
  }

  // ---------------------------------------------------------------------------
  // Modale de confirmation
  // ---------------------------------------------------------------------------

  /**
   * Affiche une modale de confirmation.
   * @param {Object} options
   * @param {string}   options.title       - Titre de la modale
   * @param {string}   options.message     - Message descriptif
   * @param {string}  [options.confirmText='Confirmer']
   * @param {string}  [options.cancelText='Annuler']
   * @param {string}  [options.type='danger'] - 'danger' | 'warning' | 'primary'
   * @returns {Promise<boolean>} true si confirmé
   */
  function confirm(options = {}) {
    return new Promise((resolve) => {
      const {
        title       = 'Confirmer',
        message     = 'Êtes-vous sûr ?',
        confirmText = 'Confirmer',
        cancelText  = 'Annuler',
        type        = 'danger'
      } = options;

      // Créer la modale
      const overlay = document.createElement('div');
      overlay.className = 'admin-modal-overlay';
      overlay.innerHTML = `
        <div class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="admin-modal__header">
            <h3 id="modal-title" class="admin-modal__title">${title}</h3>
          </div>
          <div class="admin-modal__body">
            <p>${message}</p>
          </div>
          <div class="admin-modal__footer">
            <button class="admin-btn admin-btn--ghost" id="modal-cancel">${cancelText}</button>
            <button class="admin-btn admin-btn--${type}" id="modal-confirm">${confirmText}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('visible'));

      const close = (result) => {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.remove(), 300);
        resolve(result);
      };

      overlay.querySelector('#modal-cancel').addEventListener('click', () => close(false));
      overlay.querySelector('#modal-confirm').addEventListener('click', () => close(true));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false);
      });

      // Focus sur le bouton de confirmation
      setTimeout(() => overlay.querySelector('#modal-confirm').focus(), 100);
    });
  }

  // ---------------------------------------------------------------------------
  // États de chargement
  // ---------------------------------------------------------------------------

  /**
   * Affiche/masque un spinner dans un conteneur.
   * @param {string|HTMLElement} containerOrId
   * @param {boolean} loading
   * @param {string} [message='Chargement...']
   */
  function setLoading(containerOrId, loading, message = 'Chargement...') {
    const container = typeof containerOrId === 'string'
      ? document.getElementById(containerOrId)
      : containerOrId;
    if (!container) return;

    if (loading) {
      container.innerHTML = `
        <div class="admin-loading">
          <div class="admin-spinner"></div>
          <p>${message}</p>
        </div>
      `;
    }
  }

  /**
   * Affiche un état vide (aucun élément trouvé).
   * @param {string|HTMLElement} containerOrId
   * @param {string} [message='Aucun élément trouvé']
   * @param {string} [actionHtml='']
   */
  function setEmpty(containerOrId, message = 'Aucun élément trouvé', actionHtml = '') {
    const container = typeof containerOrId === 'string'
      ? document.getElementById(containerOrId)
      : containerOrId;
    if (!container) return;

    container.innerHTML = `
      <div class="admin-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <p>${message}</p>
        ${actionHtml}
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Utilitaires
  // ---------------------------------------------------------------------------

  /**
   * Formate un nombre avec séparateurs de milliers.
   */
  function formatNumber(n) {
    return Number(n || 0).toLocaleString('fr-FR');
  }

  /**
   * Formate un Firestore Timestamp ou une date en string lisible.
   */
  function formatDate(timestamp) {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day:   '2-digit',
      month: 'short',
      year:  'numeric'
    });
  }

  /**
   * Génère un slug depuis un texte.
   */
  function generateSlug(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Copie un texte dans le presse-papier.
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    }
  }

  /**
   * Retourne le libellé d'un statut.
   */
  function getStatusLabel(status) {
    const labels = {
      active:   'Actif',
      inactive: 'Inactif',
      draft:    'Brouillon'
    };
    return labels[status] || status;
  }

  /**
   * Retourne la classe CSS d'un statut.
   */
  function getStatusClass(status) {
    const classes = {
      active:   'status--active',
      inactive: 'status--inactive',
      draft:    'status--draft'
    };
    return classes[status] || '';
  }

  // ---------------------------------------------------------------------------
  // Info utilisateur connecté
  // ---------------------------------------------------------------------------

  /**
   * Met à jour l'affichage des infos de l'utilisateur connecté dans la sidebar.
   */
  function updateUserInfo(user, adminData) {
    const nameEl  = document.getElementById('admin-user-name');
    const emailEl = document.getElementById('admin-user-email');
    const roleEl  = document.getElementById('admin-user-role');
    const avatarEl = document.getElementById('admin-user-avatar');

    if (nameEl)  nameEl.textContent  = (adminData && adminData.displayName) || user.displayName || 'Administrateur';
    if (emailEl) emailEl.textContent = user.email || '';
    if (roleEl)  roleEl.textContent  = (adminData && adminData.role) || 'admin';

    if (avatarEl) {
      const initial = ((adminData && adminData.displayName) || user.email || 'A').charAt(0).toUpperCase();
      avatarEl.textContent = initial;
    }
  }

  // ---------------------------------------------------------------------------
  // Export public
  // ---------------------------------------------------------------------------
  return {
    showSection,
    onSectionChange,
    getCurrentSection,
    openSidebar,
    closeSidebar,
    initSidebar,
    showToast,
    confirm,
    setLoading,
    setEmpty,
    formatNumber,
    formatDate,
    generateSlug,
    copyToClipboard,
    getStatusLabel,
    getStatusClass,
    updateUserInfo
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdminUI };
}
