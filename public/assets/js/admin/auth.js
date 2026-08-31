/* ==========================================================================
   J'Y SERAI — ADMIN AUTH MODULE (ROBUST & SECURE)
   
   Gère l'authentification Firebase pour le dashboard administrateur :
   - Connexion email + mot de passe
   - Déconnexion
   - Synchronisation de session unique via onAuthStateChanged
   - Vérification du rôle admin dans Firestore (admins/{uid})
   - Typage explicite des erreurs (ADMIN_NOT_FOUND, ADMIN_INACTIVE, etc.)
   
   NE JAMAIS mettre de mot de passe ou secret en dur dans ce fichier.
   ========================================================================== */

const AdminAuth = (() => {
  let _db = null;
  let _auth = null;
  let _currentUser = null;
  let _adminData = null;
  let _isLoggingIn = false; // Verrou pour éviter les conflits concurrents avec onAuthStateChanged

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
  // Vérification du rôle admin dans Firestore
  // ---------------------------------------------------------------------------

  /**
   * Vérifie si un UID est bien enregistré dans la collection admins/.
   * Ne masque JAMAIS les erreurs Firestore (permission-denied, network, etc.).
   * @param {string} uid
   * @returns {Promise<Object>} adminData
   * @throws {Error} avec code typé (ADMIN_NOT_FOUND, ADMIN_INACTIVE, etc.)
   */
  async function checkAdminRole(uid) {
    if (!_db || !uid) {
      const err = new Error('Database non initialisée ou UID manquant.');
      err.code = 'app/not-initialized';
      throw err;
    }

    try {
      console.log(`[AdminAuth] Lecture du document Firestore admins/${uid}...`);
      const docRef = _db.collection('admins').doc(uid);
      const doc = await docRef.get();

      if (!doc.exists) {
        console.warn(`[AdminAuth] Aucun document trouvé pour admins/${uid}`);
        const notFoundErr = new Error(`Aucun document trouvé dans la collection admins/${uid}`);
        notFoundErr.code = 'ADMIN_NOT_FOUND';
        notFoundErr.uid = uid;
        throw notFoundErr;
      }

      const data = doc.data() || {};

      // Vérifier que le compte est actif
      if (data.active === false) {
        console.warn(`[AdminAuth] Compte désactivé pour admins/${uid} (active: false)`);
        const inactiveErr = new Error('Ce compte administrateur a été désactivé.');
        inactiveErr.code = 'ADMIN_INACTIVE';
        inactiveErr.uid = uid;
        throw inactiveErr;
      }

      console.log(`[AdminAuth] Profil admin valide — Rôle: ${data.role || 'admin'} — Statut: Actif`);
      return data;

    } catch (err) {
      if (err.code === 'ADMIN_NOT_FOUND' || err.code === 'ADMIN_INACTIVE') {
        throw err;
      }

      console.error(`[AdminAuth] Erreur Firestore pour admins/${uid} :`, err.code, err.message);

      if (err.code === 'permission-denied') {
        const permErr = new Error('Accès refusé par les règles de sécurité Firestore.');
        permErr.code = 'FIRESTORE_PERMISSION_DENIED';
        permErr.uid = uid;
        throw permErr;
      }

      if (err.code === 'unavailable') {
        const unavailErr = new Error('Service Firestore temporairement indisponible.');
        unavailErr.code = 'FIRESTORE_UNAVAILABLE';
        throw unavailErr;
      }

      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Connexion email + mot de passe
  // ---------------------------------------------------------------------------

  /**
   * Connecte un administrateur avec email et mot de passe.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{user, adminData}>}
   */
  async function loginWithEmail(email, password) {
    if (!_auth || !_db) {
      const err = new Error('Firebase Auth ou Firestore non initialisé.');
      err.code = 'app/not-initialized';
      throw err;
    }

    _isLoggingIn = true;
    console.log('[AdminAuth] Tentative de connexion pour :', email);

    try {
      // 1. Authentification Firebase Auth
      const credential = await _auth.signInWithEmailAndPassword(email, password);
      const user = credential.user;
      console.log('[AdminAuth] Firebase Auth OK — UID :', user.uid);

      // 2. Vérification Firestore admins/{uid}
      const adminData = await checkAdminRole(user.uid);

      _currentUser = user;
      _adminData = adminData;

      console.log('[AdminAuth] Connexion administrateur confirmée avec succès.');
      return { user, adminData };

    } catch (err) {
      console.error('[AdminAuth] Échec de la connexion :', err.code || err.message);

      // En cas d'erreur de profil admin, déconnecter proprement Firebase Auth
      if (_auth.currentUser) {
        try { await _auth.signOut(); } catch (e) {}
      }

      _currentUser = null;
      _adminData = null;
      throw err;

    } finally {
      _isLoggingIn = false;
    }
  }

  /**
   * Déconnecte l'administrateur courant.
   * @returns {Promise<void>}
   */
  async function logout() {
    if (!_auth) return;
    try {
      await _auth.signOut();
    } catch (err) {
      console.error('[AdminAuth] Erreur lors de signOut :', err);
    }
    _currentUser = null;
    _adminData = null;
    console.log('[AdminAuth] Déconnexion effectuée.');
  }

  // ---------------------------------------------------------------------------
  // Observation de session (onAuthStateChanged)
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
      // Si loginWithEmail est en train de s'exécuter, on laisse loginWithEmail gérer
      if (_isLoggingIn) return;

      if (user) {
        console.log('[AdminAuth] Session active détectée pour UID :', user.uid);
        try {
          const adminData = await checkAdminRole(user.uid);
          _currentUser = user;
          _adminData = adminData;
          callback(user, adminData);
        } catch (err) {
          console.warn('[AdminAuth] Session invalide ou non-admin :', err.code || err.message);
          _currentUser = null;
          _adminData = null;
          try { await _auth.signOut(); } catch (e) {}
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
          resolve({ user, adminData });
        } catch (err) {
          console.error('[AdminAuth] requireAuth échec :', err);
          try { await _auth.signOut(); } catch (e) {}
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

  function isSuperAdmin() {
    return _adminData && _adminData.role === 'super_admin';
  }

  // ---------------------------------------------------------------------------
  // Traduction des erreurs en messages clairs et détaillés (FR)
  // ---------------------------------------------------------------------------

  /**
   * Traduit une erreur en message explicite pour l'utilisateur.
   * @param {Object|string} errOrCode
   * @returns {{title: string, message: string, uid?: string}}
   */
  function getErrorMessage(errOrCode) {
    let code = typeof errOrCode === 'string' ? errOrCode : (errOrCode && errOrCode.code ? errOrCode.code : '');
    const uid  = (errOrCode && errOrCode.uid) ? errOrCode.uid : '';
    const rawMsg = (errOrCode && errOrCode.message) ? String(errOrCode.message) : '';

    // Détection des sous-codes d'erreur encapsulés par Firebase (ex: internal-error contenant INVALID_LOGIN_CREDENTIALS)
    if (rawMsg.includes('INVALID_LOGIN_CREDENTIALS') || rawMsg.includes('INVALID_PASSWORD') || rawMsg.includes('EMAIL_NOT_FOUND')) {
      code = 'auth/invalid-credential';
    } else if (rawMsg.includes('USER_DISABLED')) {
      code = 'auth/user-disabled';
    } else if (rawMsg.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
      code = 'auth/too-many-requests';
    }

    switch (code) {
      // Firebase Authentication
      case 'auth/user-not-found':
        return {
          title: 'Utilisateur introuvable',
          message: 'Aucun compte Firebase Authentication n\'existe avec cette adresse e-mail.'
        };

      case 'auth/wrong-password':
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
        return {
          title: 'Identifiants incorrects',
          message: 'L\'adresse e-mail ou le mot de passe saisi est incorrect.'
        };

      case 'auth/invalid-email':
        return {
          title: 'Format d\'e-mail invalide',
          message: 'Veuillez saisir une adresse e-mail valide.'
        };

      case 'auth/user-disabled':
        return {
          title: 'Compte désactivé',
          message: 'Ce compte a été désactivé dans Firebase Authentication.'
        };

      case 'auth/too-many-requests':
        return {
          title: 'Trop de tentatives',
          message: 'Accès temporairement bloqué suite à de multiples tentatives. Veuillez patienter quelques minutes.'
        };

      case 'auth/network-request-failed':
        return {
          title: 'Erreur réseau',
          message: 'Impossible de contacter Firebase. Vérifiez votre connexion internet.'
        };

      // Profil Firestore Admin
      case 'ADMIN_NOT_FOUND':
        return {
          title: 'Profil administrateur absent dans Firestore',
          message: `Votre compte Firebase Authentication existe bien, mais aucun document n'a été créé dans la collection Firestore "admins".`,
          uid: uid
        };

      case 'ADMIN_INACTIVE':
        return {
          title: 'Compte administrateur inactif',
          message: 'Ce compte administrateur est désactivé (active: false). Contactez un super administrateur.',
          uid: uid
        };

      case 'FIRESTORE_PERMISSION_DENIED':
      case 'permission-denied':
        return {
          title: 'Refus d\'accès Firestore',
          message: 'Firebase refuse la lecture du document administrateur. Vérifiez vos règles Firestore (firestore.rules).',
          uid: uid
        };

      case 'FIRESTORE_UNAVAILABLE':
        return {
          title: 'Firestore indisponible',
          message: 'La base de données Firestore est temporairement inaccessible. Veuillez réessayer.'
        };

      default:
        return {
          title: 'Erreur de connexion',
          message: rawMsg ? rawMsg : 'Une erreur inattendue est survenue.'
        };
    }
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdminAuth };
}
