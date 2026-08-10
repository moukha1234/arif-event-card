/* ==========================================================================
   J'Y SERAI — CARD EXPORT MODULE
   
   Gère la génération du PNG haute définition et le déclenchement du
   téléchargement. Ce module expose exportCard() qui peut être appelé
   depuis la page participant avec ou sans "download gate" (paiement).
   
   Le download gate est un hook asynchrone facultatif. Quand l'événement
   est payant, ce hook sera remplacé par un appel à une Cloud Function
   qui vérifie le token de paiement côté serveur.
   ========================================================================== */

/**
 * Calcule la taille de police adaptée à la longueur du nom.
 * @param {string|number} nameOrLength
 * @returns {number} taille en px
 */
function calculateFontSize(nameOrLength) {
  const len = typeof nameOrLength === 'string' ? nameOrLength.length : nameOrLength;
  if (len <= 18) return 40;
  if (len <= 25) return 32;
  if (len <= 35) return 26;
  return 20;
}

/**
 * Collecte les textes dynamiques depuis le DOM pour les passer au renderer.
 * Permet au moteur Canvas de rester découplé du DOM.
 * @returns {Object} cardText
 */
function collectCardTextFromDOM() {
  const cardText = {};

  // Badge date
  const dayEl   = document.querySelector('.scalloped-day');
  const monthEl = document.querySelector('.scalloped-month');
  const timeEl  = document.querySelector('.scalloped-time');
  if (dayEl)   cardText.badgeDay   = dayEl.textContent.trim();
  if (monthEl) cardText.badgeMonth = monthEl.textContent.trim();
  if (timeEl)  cardText.badgeTime  = timeEl.textContent.trim();

  // Texte de confirmation (rich text)
  const statementElem = document.querySelector('.confirmation-statement');
  const defaultFont   = "500 17px 'Inter', sans-serif";
  const boldFont      = "800 17px 'Inter', sans-serif";

  if (statementElem) {
    const segments = [];
    Array.from(statementElem.childNodes).forEach(node => {
      if (node.classList && node.classList.contains('org-subtitle')) return;
      const text = node.textContent.replace(/\s+/g, ' ');
      if (node.nodeType === Node.TEXT_NODE) {
        if (text.trim() || text === ' ') {
          segments.push({ text, font: defaultFont, color: '#334155' });
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const isHighlight = node.classList.contains('highlight-text') ||
                            node.classList.contains('highlight-texte');
        segments.push({
          text,
          font:  isHighlight ? boldFont    : defaultFont,
          color: isHighlight ? '#E2007A'   : '#334155'
        });
      }
    });
    if (segments.length) cardText.statementSegments = segments;
  }

  // Sous-titre organisation
  const orgEl = document.querySelector('.org-subtitle');
  if (orgEl) cardText.orgSubtitle = orgEl.textContent.trim();

  // Détails événement (lieu + heure)
  const detailValues = document.querySelectorAll('.detail-value');
  if (detailValues[0]) cardText.venue = detailValues[0].textContent.trim();
  if (detailValues[1]) cardText.time  = detailValues[1].textContent.trim();

  return cardText;
}

/**
 * Charge une image depuis une URL et retourne une HTMLImageElement.
 * @param {string} src
 * @returns {Promise<HTMLImageElement|null>}
 */
function loadImage(src) {
  return new Promise(resolve => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Redimensionne une image base64 pour en faire une miniature.
 * @param {string} base64Str
 * @param {number} maxWidth
 * @returns {Promise<string>}
 */
function resizeBase64Image(base64Str, maxWidth = 300) {
  return new Promise(resolve => {
    if (!base64Str) { resolve(''); return; }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve('');
    img.src = base64Str;
  });
}

/**
 * Génère le PNG et déclenche le téléchargement.
 *
 * @param {Object} options
 * @param {string}   options.displayName      – Nom à afficher (majuscules)
 * @param {string}   options.rawName          – Nom brut pour le filename
 * @param {string}   options.userImgSrc       – data URL de la photo (ou '')
 * @param {Object}   options.photoAdjust      – { zoom, x, y }
 * @param {Object}   options.layoutConfig     – retourné par getLayoutConfig()
 * @param {Function} options.downloadGate     – async fn() → true|false (hook paiement)
 * @param {Object}   options.db               – référence Firestore (pour log)
 * @param {string}   options.eventId          – ID de l'événement
 * @param {Function} [options.onStart]        – callback début génération
 * @param {Function} [options.onSuccess]      – callback succès
 * @param {Function} [options.onError]        – callback erreur
 *
 * @returns {Promise<void>}
 */
async function exportCard(options) {
  const {
    displayName,
    rawName,
    userImgSrc,
    photoAdjust   = { zoom: 1, x: 0, y: 0 },
    layoutConfig,
    downloadGate  = async () => true,   // par défaut : toujours autorisé (événement gratuit)
    db            = null,
    eventId       = 'default',
    onStart       = () => {},
    onSuccess     = () => {},
    onError       = () => {}
  } = options;

  onStart();

  try {
    // 1. Vérification du download gate (côté serveur pour les événements payants)
    const isAuthorized = await downloadGate();
    if (!isAuthorized) {
      onError(new Error('PAYMENT_REQUIRED'));
      return;
    }

    // 2. Attendre que les polices Google soient chargées
    if (document.fonts) await document.fonts.ready;

    // 3. Collecter les textes dynamiques depuis le DOM
    const cardText = collectCardTextFromDOM();

    // 4. Charger toutes les images en parallèle
    const scallopedSvg  = document.querySelector('.scalloped-bg');
    const starSvg       = document.querySelector('.profile-gold-seal svg');
    const detailIcons   = document.querySelectorAll('.detail-icon');
    const pinSvg        = detailIcons[0] || null;
    const clockSvg      = detailIcons[1] || null;
    const placeholderSvg = document.querySelector('#preview-placeholder svg');

    const [scallopedImg, starImg, pinImg, clockImg, logoImg, userImg, placeholderImg] =
      await Promise.all([
        svgToImage(scallopedSvg, layoutConfig.dateBadge.width, layoutConfig.dateBadge.height),
        svgToImage(starSvg, 22, 22),
        svgToImage(pinSvg,  22, 22),
        svgToImage(clockSvg, 22, 22),
        loadImage((document.querySelector('.card-logo') && document.querySelector('.card-logo').src) || '../images/logo-arif-cropped.jpg'),
        userImgSrc ? loadImage(userImgSrc) : Promise.resolve(null),
        svgToImage(placeholderSvg, layoutConfig.profile.clipRadius, layoutConfig.profile.clipRadius)
      ]);

    // 5. Créer le canvas haute définition
    const dpr    = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width  = layoutConfig.canvas.width  * dpr;
    canvas.height = layoutConfig.canvas.height * dpr;
    canvas.style.width  = layoutConfig.canvas.width  + 'px';
    canvas.style.height = layoutConfig.canvas.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled  = true;
    ctx.imageSmoothingQuality  = 'high';

    // 6. Calculer la taille du nom et rendre la carte
    const nameFontSize = calculateFontSize(displayName);
    renderCardOnCanvas(
      ctx,
      canvas,
      logoImg,
      scallopedImg,
      starImg,
      pinImg,
      clockImg,
      userImg,
      placeholderImg,
      displayName,
      nameFontSize,
      layoutConfig,
      photoAdjust,
      cardText
    );

    // 7. Générer le PNG et télécharger
    await new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) { reject(new Error('Blob generation failed')); return; }

        // --- Sauvegarde participant en Firestore (asynchrone, non-bloquante) ---
        if (db) {
          (async () => {
            try {
              const photoThumbnail = userImgSrc
                ? await resizeBase64Image(userImgSrc, 300)
                : '';
              await db.collection('participants').add({
                name:      displayName,
                eventId,
                photoURL:  photoThumbnail,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
              });
            } catch (err) {
              console.error('Firestore save error:', err);
            }
          })();
        }

        // --- Téléchargement ---
        const cleanName = rawName
          ? rawName.toLowerCase().replace(/[^a-z0-9]/g, '_')
          : 'invite';
        const filename  = `JY_SERAI_${cleanName}.png`;
        const url       = URL.createObjectURL(blob);
        const link      = document.createElement('a');
        link.download   = filename;
        link.href       = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);

        resolve();
      }, 'image/png');
    });

    onSuccess();

  } catch (error) {
    console.error('EXPORT ERROR:', error);
    onError(error);
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { exportCard, calculateFontSize, collectCardTextFromDOM, resizeBase64Image };
}
