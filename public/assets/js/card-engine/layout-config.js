/* ==========================================================================
   J'Y SERAI — CANVAS LAYOUT CONFIGURATION (DYNAMIC, EVENT-DRIVEN)
   
   Ce fichier expose getLayoutConfig(eventConfig) qui fusionne les valeurs
   par défaut avec les overrides provenant de Firestore (design de l'événement).
   L'objet retourné est identique à l'ancien LayoutConfig statique, mais chaque
   valeur peut être pilotée depuis le dashboard admin sans toucher au code.
   ========================================================================== */

/**
 * Valeurs par défaut de mise en page (compatibles avec la charte ARIF v1).
 * Tout paramètre peut être surchargé via eventConfig.design.
 */
const DEFAULT_LAYOUT = {
  // Dimensions du canvas d'export
  canvas: {
    width: 800,
    height: 1000
  },

  // Fond
  background: {
    topHeight: 480,
    topGradient: ['#0A1128', '#152238', '#290822'],
    bottomColor: '#FAF9F6',
    gridDotColor: 'rgba(0, 0, 0, 0.015)'
  },

  // Séparateur papier déchiré
  divider: {
    y: 450,
    height: 40
  },

  // Logo organisateur (coin haut gauche)
  logo: {
    x: 45,
    y: 40,
    width: 276,
    height: 76
  },

  // Badge date crénelé (coin haut droit)
  dateBadge: {
    x: 625,
    y: 40,
    width: 130,
    height: 130
  },

  // Cadre photo de profil
  profile: {
    cx: 400,
    cy: 445,
    outerRadius: 135,
    innerRadius: 128,
    clipRadius: 123,
    borderColor: '#E2007A',
    innerDashedColor: '#00A1C9',
    seal: {
      cx: 506,
      cy: 551,
      r: 25,
      color: ['#00A1C9', '#008CA8']
    }
  },

  // Badge « CONFIRMATION DE PARTICIPATION »
  headingBadge: {
    y: 630,
    height: 34,
    color: '#E2007A',
    bgColor: 'rgba(226, 0, 122, 0.05)',
    borderColor: 'rgba(226, 0, 122, 0.22)'
  },

  // Textes de la carte
  text: {
    salutation: {
      y: 675,
      font: "italic 600 22px 'Playfair Display', serif",
      color: '#E2007A'
    },
    name: {
      y: 725,
      color: '#111111',
      underlineColor: '#00A1C9',
      underlineThickness: 3.5,
      underlineSpacing: 8
    },
    statement: {
      y: 785,
      lineHeight: 28,
      color: '#334155',
      highlightColor: '#E2007A',
      orgColor: '#00A1C9'
    }
  },

  // Bloc détails événement (lieu + heure)
  eventDetails: {
    x: 60,
    y: 870,
    width: 680,
    height: 95,
    borderColor: 'rgba(0, 161, 201, 0.15)',
    bgColor: '#FFFFFF',
    labelColor: '#E2007A',
    valueColor: '#00A1C9',
    col1X: 100,
    col2X: 430
  },

  // Éléments décoratifs (grilles de points)
  decorations: {
    topRightDots: { x: 490, y: 40 },
    bottomLeftDots: { x: 45, y: 935 },
    bottomRightCircles: { x: 691, y: 955 }
  }
};

/**
 * Retourne un objet LayoutConfig fusionnant les valeurs par défaut avec
 * les overrides de l'événement (depuis Firestore).
 *
 * @param {Object} [eventConfig={}] - Objet design provenant de Firestore.
 *   Exemple de champs supportés :
 *     eventConfig.design.primaryColor    → surcharge les couleurs principales
 *     eventConfig.design.secondaryColor  → surcharge les couleurs secondaires
 *     eventConfig.design.photoRadius     → rayon du clip photo
 *     eventConfig.design.photoX          → position X du centre photo
 *     eventConfig.design.photoY          → position Y du centre photo
 *     eventConfig.design.nameY           → position Y du nom
 *     eventConfig.design.badgeDay        → jour affiché dans le badge
 *     eventConfig.design.badgeMonth      → mois affiché dans le badge
 *     eventConfig.design.badgeTime       → heure affichée dans le badge
 *     eventConfig.venue                  → lieu de l'événement
 *     eventConfig.time                   → heure de l'événement
 *
 * @returns {Object} LayoutConfig fusionné
 */
function getLayoutConfig(eventConfig = {}) {
  const design = eventConfig.design || {};

  // Deep clone des valeurs par défaut (évite les mutations accidentelles)
  const layout = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));

  // --- Couleurs ---
  if (design.primaryColor) {
    layout.headingBadge.color = design.primaryColor;
    layout.headingBadge.bgColor = hexToRgba(design.primaryColor, 0.05);
    layout.headingBadge.borderColor = hexToRgba(design.primaryColor, 0.22);
    layout.profile.borderColor = design.primaryColor;
    layout.text.salutation.color = design.primaryColor;
    layout.text.statement.highlightColor = design.primaryColor;
    layout.eventDetails.labelColor = design.primaryColor;
  }

  if (design.secondaryColor) {
    layout.profile.innerDashedColor = design.secondaryColor;
    layout.profile.seal.color = [design.secondaryColor, shadeColor(design.secondaryColor, -15)];
    layout.text.name.underlineColor = design.secondaryColor;
    layout.text.statement.orgColor = design.secondaryColor;
    layout.eventDetails.valueColor = design.secondaryColor;
    layout.eventDetails.borderColor = hexToRgba(design.secondaryColor, 0.15);
  }

  // --- Position et taille photo ---
  if (typeof design.photoX === 'number') layout.profile.cx = design.photoX;
  if (typeof design.photoY === 'number') layout.profile.cy = design.photoY;
  if (typeof design.photoRadius === 'number') {
    const r = design.photoRadius;
    layout.profile.outerRadius = r;
    layout.profile.innerRadius = r - 7;
    layout.profile.clipRadius = r - 12;
    // Le sceau flottant suit le cadre
    layout.profile.seal.cx = layout.profile.cx + Math.round(r * 0.785);
    layout.profile.seal.cy = layout.profile.cy + Math.round(r * 0.785);
  }

  // --- Position du nom ---
  if (typeof design.nameY === 'number') layout.text.name.y = design.nameY;

  // --- Détails événement dynamiques ---
  if (eventConfig.venue) layout.eventDetails._venue = eventConfig.venue;
  if (eventConfig.time) layout.eventDetails._time = eventConfig.time;
  if (design.badgeDay) layout.dateBadge._day = design.badgeDay;
  if (design.badgeMonth) layout.dateBadge._month = design.badgeMonth;
  if (design.badgeTime) layout.dateBadge._time = design.badgeTime;

  return layout;
}

// ---------------------------------------------------------------------------
// Utilitaires de couleur
// ---------------------------------------------------------------------------

/**
 * Convertit un code hex (#E2007A) en rgba(r, g, b, alpha).
 */
function hexToRgba(hex, alpha) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(226, 0, 122, ${alpha})`;
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
}

/**
 * Éclaircit ou assombrit une couleur hex par un pourcentage.
 */
function shadeColor(hex, percent) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const adjust = (c) => Math.min(255, Math.max(0, parseInt(c, 16) + Math.round(255 * percent / 100)));
  return `#${adjust(result[1]).toString(16).padStart(2, '0')}${adjust(result[2]).toString(16).padStart(2, '0')}${adjust(result[3]).toString(16).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Export (compatible CommonJS pour les tests et module ES)
// ---------------------------------------------------------------------------
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getLayoutConfig, DEFAULT_LAYOUT };
}
