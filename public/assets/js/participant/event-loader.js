/* ==========================================================================
   J'Y SERAI — EVENT LOADER (FIRESTORE DYNAMIC EVENT SYSTEM)
   
   Ce module charge les données d'un événement depuis la collection Firestore
   "events" en se basant sur le slug extrait de l'URL (?e=slug ou /e/slug).
   ========================================================================== */

/**
 * Base de données d'événements de démonstration (fallback local si Firestore non alimenté)
 */
const DEMO_EVENTS = {
  'remise-attestations-arif-2026': {
    id: 'remise-attestations-arif-2026',
    slug: 'remise-attestations-arif-2026',
    name: 'Remise des Attestations ARIF 2026',
    title: 'Remise des Attestations',
    description: 'Journée de remise des attestations de fin de formation en Intelligence Artificielle.',
    venue: 'Mairie Ville de Rufisque',
    time: 'À partir de 09h00',
    organization: "Association pour la Réussite et l'Insertion des Femmes",
    status: 'active',
    isFree: true,
    price: 0,
    currency: 'XOF',
    design: {
      badgeDay: '20',
      badgeMonth: 'JUIN',
      badgeTime: '09h00',
      primaryColor: '#E2007A',
      secondaryColor: '#00A1C9',
      logoURL: '../images/logo-arif-cropped.jpg',
      confirmationText: 'confirme ma participation à la journée de Remise des Attestations de fin de formation en Intelligence Artificielle organisée par ARIF',
      orgSubtitle: "(Association pour la Réussite et l'Insertion des Femmes)"
    }
  },
  'bourdou-populaire-2026': {
    id: 'bourdou-populaire-2026',
    slug: 'bourdou-populaire-2026',
    name: 'Grand Bourdou Populaire 2026',
    title: 'Grand Bourdou Populaire',
    description: 'Célébration culturelle et rassemblement populaire de la jeunesse.',
    venue: 'Stade Ngalandou Diouf, Rufisque',
    time: '16h30',
    organization: 'Collectif Jeunesse & Culture ARIF',
    status: 'active',
    isFree: true,
    price: 0,
    currency: 'XOF',
    design: {
      badgeDay: '15',
      badgeMonth: 'NOV',
      badgeTime: '16h30',
      primaryColor: '#D97706',
      secondaryColor: '#059669',
      logoURL: '../images/logo-arif-cropped.jpg',
      confirmationText: 'confirme ma présence au Grand Bourdou Populaire de la jeunesse organisé par le Collectif',
      orgSubtitle: '(Collectif Jeunesse & Culture ARIF)'
    }
  }
};

/**
 * Extrait le slug de l'événement depuis l'URL courante.
 * Supporte :
 *  - URL param : ?e=mon-slug ou ?event=mon-slug
 *  - Pathname : /e/mon-slug
 *  - Fallback : 'remise-attestations-arif-2026'
 *
 * @returns {string} slug extrait
 */
function getSlugFromURL() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('e')) return params.get('e').trim();
  if (params.get('event')) return params.get('event').trim();

  // Extraction depuis le path /e/:slug
  const pathname = window.location.pathname;
  const match = pathname.match(/\/e\/([a-z0-9-]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }

  // Fallback par défaut
  return 'remise-attestations-arif-2026';
}

/**
 * Charge un événement depuis Firestore (ou fallback local).
 *
 * @param {Object} db - Instance Firestore
 * @param {string} [slug] - Slug facultatif (si non fourni, extrait de l'URL)
 * @returns {Promise<Object>} eventConfig
 */
async function loadEventConfig(db, slug) {
  const targetSlug = slug || getSlugFromURL();

  if (!db) {
    console.warn('[EventLoader] Firestore non initialisé, utilisation du fallback local pour :', targetSlug);
    return getLocalFallback(targetSlug);
  }

  try {
    // Requête Firestore collection "events" filtrée sur slug et status active
    const snapshot = await db.collection('events')
      .where('slug', '==', targetSlug)
      .limit(1)
      .get();

    if (snapshot.empty) {
      // Si non trouvé dans Firestore, vérifier si présent dans les démos locales
      if (DEMO_EVENTS[targetSlug]) {
        console.info('[EventLoader] Document Firestore non trouvé, utilisation de la démo locale :', targetSlug);
        return DEMO_EVENTS[targetSlug];
      }
      const err = new Error('EVENT_NOT_FOUND');
      err.slug = targetSlug;
      throw err;
    }

    const docData = snapshot.docs[0].data();
    const eventConfig = {
      id: snapshot.docs[0].id,
      ...docData
    };

    // Vérifier si l'événement est actif
    if (eventConfig.status && eventConfig.status !== 'active') {
      const err = new Error('EVENT_DISABLED');
      err.slug = targetSlug;
      throw err;
    }

    console.log('[EventLoader] Événement Firestore chargé avec succès :', eventConfig.name);
    return normalizeEventConfig(eventConfig);

  } catch (error) {
    if (error.message === 'EVENT_NOT_FOUND' || error.message === 'EVENT_DISABLED') {
      throw error;
    }
    console.warn('[EventLoader] Erreur de lecture Firestore, utilisation fallback :', error.message);
    return getLocalFallback(targetSlug);
  }
}

/**
 * Retourne la configuration locale par défaut pour un slug donné.
 */
function getLocalFallback(targetSlug) {
  if (DEMO_EVENTS[targetSlug]) {
    return DEMO_EVENTS[targetSlug];
  }
  // Si le slug inconnu, retourne la démo ARIF par défaut avec warning
  console.warn('[EventLoader] Slug inconnu en fallback local, chargement événement ARIF par défaut');
  return DEMO_EVENTS['remise-attestations-arif-2026'];
}

/**
 * Normalise un objet événement Firestore pour garantir que tous les champs requis existent.
 */
function normalizeEventConfig(config) {
  return {
    id: config.id || 'default',
    slug: config.slug || 'default',
    name: config.name || 'Événement',
    title: config.title || config.name || 'Événement',
    description: config.description || '',
    venue: config.venue || config.location || 'Lieu à préciser',
    time: config.time || 'Horaires à préciser',
    organization: config.organization || '',
    status: config.status || 'active',
    isFree: typeof config.isFree === 'boolean' ? config.isFree : true,
    price: config.price || 0,
    currency: config.currency || 'XOF',
    design: {
      badgeDay: (config.design && config.design.badgeDay) || '20',
      badgeMonth: (config.design && config.design.badgeMonth) || 'JUIN',
      badgeTime: (config.design && config.design.badgeTime) || config.time || '09h00',
      primaryColor: (config.design && config.design.primaryColor) || '#E2007A',
      secondaryColor: (config.design && config.design.secondaryColor) || '#00A1C9',
      logoURL: (config.design && config.design.logoURL) || '../images/logo-arif-cropped.jpg',
      confirmationText: (config.design && config.design.confirmationText) || '',
      orgSubtitle: (config.design && config.design.orgSubtitle) || ''
    }
  };
}

// Export pour modules ou navigateur
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadEventConfig, getSlugFromURL, DEMO_EVENTS };
}
