/* ==========================================================================
   J'Y SERAI — ADMIN ORCHESTRATEUR PRINCIPAL
   
   Ce fichier est le point d'entrée du dashboard administrateur.
   Il initialise Firebase, gère l'authentification, et orchestre
   tous les modules admin (dashboard, events, event-editor).
   
   IMPORTANT : Ce fichier ne doit JAMAIS contenir de secrets.
   La config Firebase est publique (identifiants client-side normaux).
   ========================================================================== */

// ---------------------------------------------------------------------------
// Configuration Firebase (v8 compat — identique au projet participant)
// ---------------------------------------------------------------------------
const firebaseConfig = {
  projectId:         'arif-event-card',
  appId:             '1:260697604272:web:a3a164579b057ea25d7b75',
  storageBucket:     'arif-event-card.firebasestorage.app',
  apiKey:            'AIzaSyByEBDcf9idUpInhgeQ-9eY-is9eFPBa6M',
  authDomain:        'arif-event-card.firebaseapp.com',
  messagingSenderId: '260697604272'
};

// ---------------------------------------------------------------------------
// Initialisation Firebase (éviter la double initialisation)
// ---------------------------------------------------------------------------
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db      = firebase.firestore();
const auth    = firebase.auth();
const storage = firebase.storage();

// ---------------------------------------------------------------------------
// État global de l'application admin
// ---------------------------------------------------------------------------
let _appState = {
  initialized: false,
  user:        null,
  adminData:   null
};

// ---------------------------------------------------------------------------
// Bootstrap : lancé au chargement du DOM
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Initialiser les modules
  AdminAuth.init(auth, db);
  AdminDashboard.init(db);
  AdminEvents.init(db, auth);
  AdminEventEditor.init(db, auth, storage);
  AdminUI.initSidebar();

  // Écouter les changements d'authentification
  AdminAuth.onAuthStateChanged((user, adminData) => {
    if (user && adminData) {
      onAuthenticated(user, adminData);
    } else {
      onUnauthenticated();
    }
  });

  // Gestionnaire du formulaire de login
  initLoginForm();
});

// ---------------------------------------------------------------------------
// État : Authentifié
// ---------------------------------------------------------------------------
function onAuthenticated(user, adminData) {
  _appState.user      = user;
  _appState.adminData = adminData;

  // Masquer la vue login, afficher le dashboard
  showView('dashboard-view');

  // Mettre à jour les infos utilisateur dans la sidebar
  AdminUI.updateUserInfo(user, adminData);

  // Masquer/afficher les éléments super_admin
  if (!AdminAuth.isSuperAdmin()) {
    document.querySelectorAll('.super-admin-only').forEach(el => {
      el.style.display = 'none';
    });
  }

  // Initialiser l'éditeur d'événement (canvas + form listeners)
  AdminEventEditor.initAll();

  // Écouter les changements de section
  AdminUI.onSectionChange(handleSectionChange);

  // Bouton déconnexion
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Bouton "Créer un événement" dans la navbar
  const btnCreateEvent = document.getElementById('btn-create-event-nav');
  if (btnCreateEvent) {
    btnCreateEvent.addEventListener('click', () => {
      AdminEventEditor.newEvent();
    });
  }

  // Configurer les actions de la liste événements
  AdminEvents.onEditEvent((eventId) => {
    AdminEventEditor.loadEvent(eventId);
  });

  // Afficher la section dashboard par défaut
  if (!_appState.initialized) {
    _appState.initialized = true;
    AdminUI.showSection('dashboard');
    AdminDashboard.render();
  }
}

// ---------------------------------------------------------------------------
// Changement de section → charger les données
// ---------------------------------------------------------------------------
async function handleSectionChange(sectionId) {
  switch (sectionId) {
    case 'dashboard':
      await AdminDashboard.render();
      break;
    case 'events':
      await AdminEvents.render();
      break;
    case 'event-editor':
      // Déjà géré par AdminEventEditor.newEvent() ou loadEvent()
      AdminEventEditor.schedulePreviewUpdate();
      break;
    case 'participants':
      renderParticipants();
      break;
    default:
      // Sections à venir (paramètres, administrateurs, paiements)
      renderComingSoon(sectionId);
  }
}

// ---------------------------------------------------------------------------
// Section Participants (lecture simple)
// ---------------------------------------------------------------------------
async function renderParticipants() {
  const container = document.getElementById('participants-container');
  if (!container) return;

  AdminUI.setLoading(container, true, 'Chargement des participants...');

  try {
    const snap = await db.collection('participants')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    if (snap.empty) {
      AdminUI.setEmpty(container, 'Aucun participant enregistré pour le moment.');
      return;
    }

    const rows = snap.docs.map(doc => {
      const d = doc.data();
      return `
        <tr>
          <td>${d.name || '—'}</td>
          <td>${d.eventId || '—'}</td>
          <td>${AdminUI.formatDate(d.createdAt)}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Événement</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.error('[Admin] Erreur participants:', err);
    container.innerHTML = `<div class="admin-empty"><p>Erreur de chargement : ${err.message}</p></div>`;
  }
}

// ---------------------------------------------------------------------------
// Sections "À venir"
// ---------------------------------------------------------------------------
function renderComingSoon(sectionId) {
  const section = document.getElementById(`section-${sectionId}`);
  if (!section) return;
  const body = section.querySelector('.section-body');
  if (!body) return;

  const labels = {
    payments:       'Paiements',
    administrators: 'Administrateurs',
    settings:       'Paramètres'
  };

  body.innerHTML = `
    <div class="coming-soon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      <h3>${labels[sectionId] || sectionId}</h3>
      <p>Cette fonctionnalité sera disponible dans une prochaine phase du projet.</p>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// État : Non authentifié
// ---------------------------------------------------------------------------
function onUnauthenticated() {
  _appState.user      = null;
  _appState.adminData = null;
  _appState.initialized = false;
  showView('login-view');
}

// ---------------------------------------------------------------------------
// Vues (login / dashboard)
// ---------------------------------------------------------------------------
function showView(viewId) {
  document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
  const view = document.getElementById(viewId);
  if (view) view.classList.add('active');
}

// ---------------------------------------------------------------------------
// Formulaire de Login
// ---------------------------------------------------------------------------
function initLoginForm() {
  const form       = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passInput  = document.getElementById('login-password');
  const submitBtn  = document.getElementById('btn-login');
  const errorEl    = document.getElementById('login-error');
  const togglePass = document.getElementById('toggle-password');

  if (!form) return;

  // Toggle affichage mot de passe
  if (togglePass && passInput) {
    togglePass.addEventListener('click', () => {
      const isText = passInput.type === 'text';
      passInput.type = isText ? 'password' : 'text';
      togglePass.innerHTML = isText
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = emailInput ? emailInput.value.trim() : '';
    const password = passInput  ? passInput.value : '';

    if (!email || !password) {
      showLoginError('Veuillez remplir tous les champs.');
      return;
    }

    // État chargement
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Connexion en cours...'; }
    if (errorEl)   errorEl.style.display = 'none';

    try {
      await AdminAuth.loginWithEmail(email, password);
      // onAuthStateChanged prendra le relai automatiquement
    } catch (err) {
      console.error('[Admin] Login error:', err);
      const msg = AdminAuth.getErrorMessage(err);
      showLoginError(msg);
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Se connecter'; }
    }
  });
}

function showLoginError(msg) {
  const errorEl = document.getElementById('login-error');
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }
}

// ---------------------------------------------------------------------------
// Déconnexion
// ---------------------------------------------------------------------------
async function handleLogout() {
  const confirmed = await AdminUI.confirm({
    title:       'Déconnexion',
    message:     'Êtes-vous sûr de vouloir vous déconnecter ?',
    confirmText: 'Se déconnecter',
    cancelText:  'Annuler',
    type:        'primary'
  });

  if (!confirmed) return;

  try {
    await AdminAuth.logout();
    AdminUI.showToast('Déconnexion réussie.', 'info');
  } catch (err) {
    AdminUI.showToast('Erreur lors de la déconnexion.', 'error');
  }
}
