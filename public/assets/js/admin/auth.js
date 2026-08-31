/* ==========================================================================
   J'Y SERAI — ADMIN AUTH MODULE
   
   Gère l'authentification Firebase pour le dashboard administrateur.
   - Connexion email + mot de passe
   - Déconnexion
   - Vérification de session
   - Vérification du rôle admin dans Firestore (admins/{uid})
   - Redirection automatique si non authentifié
   
   NE JAMAIS mettre de mot de passe ou secret en dur dans ce fichier.
   ========================================================================== */

const AdminAuth = (() => {
  let _db = null;
  let _auth = null;
  let _currentUser = null;
  let _adminData = null;

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  /**
   * Initialise le module Auth avec les instances Firebase.
   * @param {firebase.auth.Auth} auth - Instance Firebase Auth
   * @param {firebase.firestore.Firestore} db - Instance Firestore
   */
  function init(auth, db) {
    _auth = auth;
    _db = db;
  }

  // ---------------------------------------------------------------------------
  // Connexion / Déconnexion
  // ---------------------------------------------------------------------------

  /**
   * Connecte un administrateur avec email et mot de passe.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{user, adminData}>}
   */
  async function loginWithEmail(email, password) {
    if (!_auth || !_db) {
      console.error('[AdminAuth] Firebase Auth ou Firestore non initialisé.');
      const err = new Error('Firebase non initialisé correctement.');
      err.code = 'app/not-initialized';
      throw err;
    }

    console.log('[AdminAuth] Tentative de connexion pour :', email);

    // 1. Connexion Firebase Authentication
    let credential;
    try {
      credential = await _auth.signInWithEmailAndPassword(email, password);
    } catch (authErr) {
      console.error('[AdminAuth] Échec Firebase Auth :', authErr.code, authErr.message);
      throw authErr;
    }

    const user = credential.user;
    console.log('[AdminAuth] Firebase Auth OK — UID :', user.uid);

    // 2. Vérification du profil dans Firestore admins/{uid}
    console.log(`[AdminAuth] Vérification du document Firestore admins/${user.uid}...`);
    let adminData;
    try {
      adminData = await checkAdminRole(user.uid);
    } catch (fsErr) {
      console.error('[AdminAuth] Erreur Firestore lors de la vérification admin :', fsErr);
      await _auth.signOut();
      throw fsErr;
    }

    if (!adminData) {
      console.warn(`[AdminAuth] Document admins/${user.uid} introuvable ou inactif.`);
      await _auth.signOut();
      const notFoundErr = new Error('ADMIN_DOCUMENT_NOT_FOUND');
      notFoundErr.code = 'admin/document-not-found';
      notFoundErr.uid = user.uid;
      throw notFoundErr;
    }

    _currentUser = user;
    _adminData = adminData;

    console.log('[AdminAuth] Admin document trouvé — Rôle :', adminData.role);
    return { user, adminData };
  }

  /**
   * Déconnecte l'administrateur courant.
   * @returns {Promise<void>}
   */
  async function logout() {
    if (!_auth) return;
    await _auth.signOut();
    _currentUser = null;
    _adminData = null;
    console.log('[AdminAuth] Déconnexion effectuée.');
  }

  // ---------------------------------------------------------------------------
  // Vérification du rôle admin
  // ---------------------------------------------------------------------------

  /**
   * Vérifie si un UID est bien enregistré dans la collection admins/.
   * Ne masque JAMAIS les erreurs Firestore (permission-denied, network, etc.).
   * @param {string} uid
   * @returns {Promise<Object|null>} adminData ou null si document absent
   */
  async function checkAdminRole(uid) {
    if (!_db || !uid) return null;

    try {
      const docRef = _db.collection('admins').doc(uid);
      const doc = await docRef.get();

      if (!doc.exists) {
        console.warn(`[AdminAuth] Le document admins/${uid} n'existe pas dans Firestore.`);
        return null;
      }

      const data = doc.data();

      // Vérifier que le compte est actif
      if (data.active === false) {
        console.warn(`[AdminAuth] Le compte admin ${uid} est désactivé (active: false).`);
        const inactiveErr = new Error('ADMIN_ACCOUNT_INACTIVE');
        inactiveErr.code = 'admin/account-inactive';
        throw inactiveErr;
      }

      return data;

    } catch (err) {
      if (err.code === 'admin/account-inactive') {
        throw err;
      }
      console.error(`[AdminAuth] Firestore error pour admins/${uid} — code:`, err.code, '— message:', err.message);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Observation de session
  // ---------------------------------------------------------------------------

  /**
   * Écoute les changements d'état d'authentification.
   * Appelle callback(user, adminData) à chaque changement.
   * @param {Function} callback - (user, adminData) => void
   * @returns {Function} unsubscribe
   */
  function onAuthStateChanged(callback) {
    if (!_auth) return () => {};
    return _auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const adminData = await checkAdminRole(user.uid);
          if (adminData) {
            _currentUser = user;
            _adminData = adminData;
            callback(user, adminData);
          } else {
            console.warn(`[AdminAuth] Session active mais aucun profil dans admins/${user.uid}. Déconnexion.`);
            await _auth.signOut();
            callback(null, null);
          }
        } catch (err) {
          console.error('[AdminAuth] Erreur vérification session :', err);
          await _auth.signOut();
          callback(null, null);
        }
      } else {
        _currentUser = null;
        _adminData = null;
        callback(null, null);
      }
    });
  }

  /**
   * Redirige vers la page de login si non authentifié.
   * À appeler en début de page admin protégée.
   */
  function requireAuth() {
    if (!_auth) {
      window.location.href = '/admin/index.html';
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      const unsubscribe = _auth.onAuthStateChanged(async (user) => {
        unsubscribe();
        if (!user) {
          window.location.href = '/admin/index.html';
          return;
        }
        try {
          const adminData = await checkAdminRole(user.uid);
          if (!adminData) {
            await _auth.signOut();
            window.location.href = '/admin/index.html';
            return;
          }
          resolve({ user, adminData });
        } catch (err) {
          console.error('[AdminAuth] requireAuth error:', err);
          await _auth.signOut();
          window.location.href = '/admin/index.html';
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  function getCurrentUser() { return _currentUser; }
  function getAdminData()   { return _adminData; }

  /**
   * Retourne true si l'admin courant est super_admin.
   */
  function isSuperAdmin() {
    return _adminData && _adminData.role === 'super_admin';
  }

  // ---------------------------------------------------------------------------
  // Gestion des erreurs Firebase Auth & Firestore (messages FR précis)
  // ---------------------------------------------------------------------------

  /**
   * Traduit les codes d'erreur en messages français compréhensibles.
   * @param {Object|string} errOrCode
   * @returns {string}
   */
  function getErrorMessage(errOrCode) {
    const code = typeof errOrCode === 'string' ? errOrCode : (errOrCode && errOrCode.code ? errOrCode.code : '');
    const uid  = (errOrCode && errOrCode.uid) ? ` (UID: ${errOrCode.uid})` : '';

    const messages = {
      // Firebase Auth
      'auth/user-not-found':             'Aucun compte trouvé avec cet e-mail dans Firebase Authentication.',
      'auth/wrong-password':             'Mot de passe incorrect.',
      'auth/invalid-email':              'Adresse e-mail invalide.',
      'auth/user-disabled':              'Ce compte a été désactivé dans Firebase Auth.',
      'auth/too-many-requests':          'Trop de tentatives. Veuillez patienter quelques instants.',
      'auth/network-request-failed':      'Impossible de contacter Firebase. Vérifiez votre connexion internet.',
      'auth/invalid-credential':         'Identifiants incorrects (e-mail ou mot de passe invalide).',
      'auth/invalid-login-credentials':  'Identifiants incorrects (e-mail ou mot de passe invalide).',

      // Firestore & Profil Admin
      'admin/document-not-found':        `Compte Firebase valide, mais aucun document n'existe dans la collection Firestore admins/${uid}.`,
      'admin/account-inactive':          'Ce compte administrateur a été désactivé (active: false).',
      'permission-denied':               'Accès refusé par les règles de sécurité Firestore (permission-denied).',
      'unavailable':                     'Le service Firestore est temporairement indisponible.',
      'app/not-initialized':             'Firebase n\'est pas correctement initialisé.'
    };

    if (messages[code]) return messages[code];

    if (errOrCode && errOrCode.message) {
      if (errOrCode.message === 'ADMIN_DOCUMENT_NOT_FOUND') {
        return `Compte Firebase valide, mais aucun profil administrateur n'est configuré dans Firestore (collection 'admins').`;
      }
      if (errOrCode.message === 'ADMIN_ACCOUNT_INACTIVE') {
        return 'Ce compte administrateur est désactivé.';
      }
    }

    return 'Une erreur est survenue lors de la connexion. Veuillez vérifier la console du navigateur.';
  }

  // ---------------------------------------------------------------------------
  // Export public
  // ---------------------------------------------------------------------------
  return {
    init,
    loginWithEmail,
    logout,
    checkAdminRole,
    onAuthStateChanged,
    requireAuth,
    getCurrentUser,
    getAdminData,
    isSuperAdmin,
    getErrorMessage
  };
})();

// Export CommonJS (tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdminAuth };
}
