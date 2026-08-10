/* ==========================================================================
   J'Y SERAI — CANVAS RENDERER (MOTEUR D'AFFICHE)
   
   Ce module expose renderCardOnCanvas() et ses helpers internes.
   Il est IDENTIQUE au moteur V1, extrait de app.js sans modification
   du comportement. Il accepte désormais un paramètre `layoutConfig`
   dynamique retourné par getLayoutConfig(eventConfig).
   
   RÈGLE : Ne jamais modifier la logique de rendu dans ce fichier
   sans avoir vérifié visuellement le résultat sur le canvas.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Helper : convertit un élément SVG en HTMLImageElement
   -------------------------------------------------------------------------- */
const svgToImage = (svgElement, width, height) => {
  return new Promise((resolve) => {
    if (!svgElement) { resolve(null); return; }
    try {
      const clone = svgElement.cloneNode(true);
      if (width)  clone.setAttribute('width',  width);
      if (height) clone.setAttribute('height', height);
      const svgString = new XMLSerializer().serializeToString(clone);
      const svgBlob   = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url       = URL.createObjectURL(svgBlob);
      const img       = new Image();
      img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    } catch (e) {
      console.warn('svgToImage failed:', e);
      resolve(null);
    }
  });
};

/* --------------------------------------------------------------------------
   Helper : rendu de texte riche multi-style avec retour à la ligne
   -------------------------------------------------------------------------- */
const drawRichText = (ctx, segments, x, y, maxWidth, lineHeight, align = 'center') => {
  const words = [];
  segments.forEach(seg => {
    const tokens = seg.text.split(/(\s+)/);
    tokens.forEach(token => {
      if (token) {
        words.push({
          text:  token,
          font:  seg.font  || ctx.font,
          color: seg.color || ctx.fillStyle
        });
      }
    });
  });

  const lines = [];
  let currentLine      = [];
  let currentLineWidth = 0;

  words.forEach(word => {
    ctx.font = word.font;
    const wordWidth = ctx.measureText(word.text).width;

    if (currentLineWidth + wordWidth > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine      = [];
      currentLineWidth = 0;
    }

    if (currentLine.length === 0 && word.text.trim() === '') return;

    currentLine.push({ ...word, width: wordWidth });
    currentLineWidth += wordWidth;
  });

  if (currentLine.length > 0) lines.push(currentLine);

  let currentY = y;
  lines.forEach(line => {
    const lineWidth = line.reduce((sum, w) => sum + w.width, 0);
    let currentX = x;

    if (align === 'center') currentX = x - lineWidth / 2;
    else if (align === 'right') currentX = x - lineWidth;

    line.forEach(word => {
      ctx.font      = word.font;
      ctx.fillStyle = word.color;
      ctx.fillText(word.text, currentX, currentY);
      currentX += word.width;
    });

    currentY += lineHeight;
  });

  return currentY;
};

/* --------------------------------------------------------------------------
   MOTEUR PRINCIPAL : renderCardOnCanvas()
   
   @param {CanvasRenderingContext2D} ctx
   @param {HTMLCanvasElement}        canvas
   @param {HTMLImageElement|null}    logoImg
   @param {HTMLImageElement|null}    scallopedImg
   @param {HTMLImageElement|null}    starImg
   @param {HTMLImageElement|null}    pinImg
   @param {HTMLImageElement|null}    clockImg
   @param {HTMLImageElement|null}    userImg
   @param {HTMLImageElement|null}    placeholderImg
   @param {string}                   displayName     – nom en majuscules
   @param {number}                   nameFontSize    – taille police nom (px)
   @param {Object}                   layoutConfig    – retourné par getLayoutConfig()
   @param {Object}                   photoAdjust     – { zoom, x, y } sliders
   @param {Object}                   cardText        – textes dynamiques DOM
   -------------------------------------------------------------------------- */
const renderCardOnCanvas = (
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
  photoAdjust = { zoom: 1, x: 0, y: 0 },
  cardText    = {}
) => {
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const L = layoutConfig; // alias court

  // =========================================================================
  // STAGE A : FOND (première couche)
  // =========================================================================

  // A.1 Dégradé de base plein canvas (violet → beige) — évite les bordures transparentes
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#4B0082');
  gradient.addColorStop(1, '#F5F5DC');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // A.2 Dégradé ardoise haut
  const grad1 = ctx.createLinearGradient(0, 0, 800, 480);
  grad1.addColorStop(0,   '#0A1128');
  grad1.addColorStop(0.6, '#152238');
  grad1.addColorStop(1,   '#290822');
  ctx.fillStyle = grad1;
  ctx.fillRect(0, 0, 800, 480);

  const grad2 = ctx.createRadialGradient(640, 96, 0, 640, 96, 480);
  grad2.addColorStop(0, 'rgba(0, 161, 201, 0.4)');
  grad2.addColorStop(1, 'rgba(0, 161, 201, 0)');
  ctx.fillStyle = grad2;
  ctx.fillRect(0, 0, 800, 480);

  const grad3 = ctx.createLinearGradient(0, 0, 0, 480);
  grad3.addColorStop(0, 'rgba(226, 0, 122, 0.25)');
  grad3.addColorStop(1, 'rgba(10, 15, 30, 0.92)');
  ctx.fillStyle = grad3;
  ctx.fillRect(0, 0, 800, 480);

  // A.3 Bas blanc chaud
  ctx.fillStyle = '#FAF9F6';
  ctx.fillRect(0, 450, 800, 550);

  // A.4 Lueurs ambiantes
  const mgX = clamp(840, 0, 800);
  const mgY = clamp(100, 0, 1000);
  const glowMagenta = ctx.createRadialGradient(mgX, mgY, 0, mgX, mgY, 280);
  glowMagenta.addColorStop(0, 'rgba(226, 0, 122, 0.08)');
  glowMagenta.addColorStop(1, 'rgba(226, 0, 122, 0)');
  ctx.fillStyle = glowMagenta;
  ctx.fillRect(0, 0, 800, 1000);

  const cgX = clamp(-50, 0, 800);
  const cgY = clamp(900, 0, 1000);
  const glowCyan = ctx.createRadialGradient(cgX, cgY, 0, cgX, cgY, 350);
  glowCyan.addColorStop(0, 'rgba(0, 161, 201, 0.08)');
  glowCyan.addColorStop(1, 'rgba(0, 161, 201, 0)');
  ctx.fillStyle = glowCyan;
  ctx.fillRect(0, 0, 800, 1000);

  // A.5 Grille de points plein canvas
  ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
  for (let x = 0; x < 800; x += 24) {
    for (let y = 0; y < 1000; y += 24) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // A.6 Texture points bas
  ctx.fillStyle = 'rgba(0, 0, 0, 0.012)';
  for (let x = 0; x < 800; x += 16) {
    for (let y = 450; y < 1000; y += 16) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.008)';
  for (let x = 8; x < 800; x += 16) {
    for (let y = 458; y < 1000; y += 16) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // =========================================================================
  // STAGE B : FORMES (deuxième couche)
  // =========================================================================

  // B.1 Séparateur papier déchiré — ombre grise
  ctx.save();
  ctx.beginPath();
  const grayPoints = [
    [0,10],[22,12],[45,8],[68,15],[90,10],[112,13],[135,7],[158,12],[180,9],[202,15],
    [225,8],[248,12],[270,7],[292,14],[315,9],[338,13],[360,8],[382,12],[405,10],[428,15],
    [450,8],[472,12],[495,9],[518,14],[540,8],[562,13],[585,10],[608,15],[630,7],[652,12],
    [675,9],[698,14],[720,8],[742,12],[765,7],[788,13],[800,10]
  ];
  ctx.moveTo(grayPoints[0][0], 450 + grayPoints[0][1]);
  for (let i = 1; i < grayPoints.length; i++) {
    ctx.lineTo(grayPoints[i][0], 450 + grayPoints[i][1]);
  }
  ctx.lineTo(800, 1000); ctx.lineTo(0, 1000);
  ctx.closePath();
  ctx.fillStyle = 'rgba(216, 216, 223, 0.6)';
  ctx.fill();
  ctx.restore();

  // B.2 Séparateur papier déchiré — couche blanche
  ctx.save();
  ctx.beginPath();
  const whitePoints = [
    [0,16],[20,18],[40,13],[60,20],[80,14],[100,17],[120,11],[140,16],[160,13],[180,20],
    [200,12],[220,16],[240,11],[260,19],[280,13],[300,17],[320,12],[340,16],[360,14],[380,20],
    [400,12],[420,16],[440,13],[460,19],[480,12],[500,16],[520,13],[540,20],[560,11],[580,16],
    [600,13],[620,19],[640,12],[660,16],[680,11],[700,18],[720,13],[740,20],[760,12],[780,16],
    [800,14]
  ];
  ctx.moveTo(whitePoints[0][0], 450 + whitePoints[0][1]);
  for (let i = 1; i < whitePoints.length; i++) {
    ctx.lineTo(whitePoints[i][0], 450 + whitePoints[i][1]);
  }
  ctx.lineTo(800, 1000); ctx.lineTo(0, 1000);
  ctx.closePath();
  ctx.fillStyle = '#FAF9F6';
  ctx.fill();
  ctx.restore();

  // B.3 Points décoratifs haut-droite et bas-gauche
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  const trX = clamp(L.decorations.topRightDots.x,   0, 800);
  const trY = clamp(L.decorations.topRightDots.y,   0, 1000);
  const blX = clamp(L.decorations.bottomLeftDots.x, 0, 800);
  const blY = clamp(L.decorations.bottomLeftDots.y, 0, 1000);
  [[trX, trY], [blX, blY]].forEach(([ox, oy]) => {
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 6; c++) {
        ctx.beginPath();
        ctx.arc(ox + c * 14 + 3, oy + r * 14 + 3, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  // B.4 Cercles décoratifs bas-droite
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth   = 2;
  const brX = clamp(L.decorations.bottomRightCircles.x, 0, 800);
  const brY = clamp(L.decorations.bottomRightCircles.y, 0, 1000);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(brX + i * 18 + 5, brY + 5, 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // B.5 Anneaux du cadre photo
  const p       = L.profile;
  const avatarCX = clamp(p.cx, 0, 800);
  const avatarCY = clamp(p.cy, 0, 1000);

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, p.outerRadius, 0, Math.PI * 2);
  ctx.fillStyle = p.borderColor;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, p.outerRadius - 4, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  ctx.strokeStyle = p.innerDashedColor;
  ctx.lineWidth   = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, p.innerRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // B.6 Sceau flottant (étoile dorée)
  const sealCX = clamp(p.seal.cx, 0, 800);
  const sealCY = clamp(p.seal.cy, 0, 1000);
  ctx.save();
  const sealGrad = ctx.createLinearGradient(
    sealCX - p.seal.r, sealCY - p.seal.r,
    sealCX + p.seal.r, sealCY + p.seal.r
  );
  sealGrad.addColorStop(0, p.seal.color[0]);
  sealGrad.addColorStop(1, p.seal.color[1]);
  ctx.beginPath();
  ctx.arc(sealCX, sealCY, p.seal.r, 0, Math.PI * 2);
  ctx.fillStyle   = sealGrad;
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth   = 3;
  ctx.stroke();
  ctx.restore();

  // B.7 Badge « CONFIRMATION DE PARTICIPATION »
  const heading     = L.headingBadge;
  const headingY    = clamp(heading.y, 0, 1000);
  const badgeText   = 'CONFIRMATION DE PARTICIPATION';
  ctx.save();
  ctx.font = "800 13px 'Montserrat', sans-serif";
  const badgeTextWidth = ctx.measureText(badgeText).width;
  const badgeW = badgeTextWidth + 72;
  const badgeX = clamp(400 - badgeW / 2, 0, 800);

  ctx.beginPath();
  _roundRect(ctx, badgeX, headingY, badgeW, heading.height, heading.height / 2);
  ctx.closePath();
  ctx.fillStyle   = heading.bgColor;
  ctx.fill();
  ctx.strokeStyle = heading.borderColor;
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.restore();

  // B.8 Soulignement sous le nom
  const nameConf = L.text.name;
  ctx.save();
  ctx.font = `900 ${nameFontSize}px 'Montserrat', sans-serif`;
  const nameWidth  = ctx.measureText(displayName).width;
  const nameConfY  = clamp(nameConf.y, 0, 1000);
  const lineY      = nameConfY + nameFontSize / 2 + nameConf.underlineSpacing;
  ctx.strokeStyle  = nameConf.underlineColor;
  ctx.lineWidth    = nameConf.underlineThickness;
  ctx.lineCap      = 'round';
  ctx.beginPath();
  ctx.moveTo(clamp(400 - nameWidth / 2, 0, 800), lineY);
  ctx.lineTo(clamp(400 + nameWidth / 2, 0, 800), lineY);
  ctx.stroke();
  ctx.restore();

  // B.9 Boîte des détails événement
  const details  = L.eventDetails;
  const detailsX = clamp(details.x, 0, 800);
  const detailsY = clamp(details.y, 0, 1000);

  ctx.save();
  ctx.beginPath();
  _roundRect(ctx, detailsX, detailsY, details.width, details.height, 16);
  ctx.closePath();
  ctx.fillStyle   = details.bgColor;
  ctx.fill();
  ctx.strokeStyle = details.borderColor;
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  // Colonnes icônes
  const col1BoxX = clamp(detailsX + 24, 0, 800);
  const col2BoxX = clamp(detailsX + 354, 0, 800);
  const boxY     = clamp(detailsY + 25, 0, 1000);
  [col1BoxX, col2BoxX].forEach(bx => {
    ctx.beginPath();
    _roundRect(ctx, bx, boxY, 44, 44, 10);
    ctx.closePath();
    ctx.fillStyle   = 'rgba(226, 0, 122, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(226, 0, 122, 0.18)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
  });
  ctx.restore();

  // =========================================================================
  // STAGE C : IMAGES (troisième couche)
  // =========================================================================

  // C.1 Logo avec boîte blanche
  if (logoImg) {
    const logoX     = clamp(L.logo.x, 0, 800);
    const logoY     = clamp(L.logo.y, 0, 1000);
    const logoH     = 56;
    const paddingY  = (76 - logoH) / 2;
    const paddingX  = 16;
    const imgW      = logoImg.naturalWidth  || logoImg.width;
    const imgH      = logoImg.naturalHeight || logoImg.height;
    const logoW     = logoH * (imgW / imgH);
    const boxW      = logoW + paddingX * 2;

    ctx.save();
    ctx.beginPath();
    _roundRect(ctx, logoX, logoY, boxW, 76, 14);
    ctx.closePath();
    ctx.fillStyle   = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth   = 1;
    ctx.stroke();
    ctx.drawImage(logoImg, logoX + paddingX, logoY + paddingY, logoW, logoH);
    ctx.restore();
  }

  // C.2 Badge date crénelé
  if (scallopedImg) {
    const bx = clamp(L.dateBadge.x, 0, 800);
    const by = clamp(L.dateBadge.y, 0, 1000);
    ctx.drawImage(scallopedImg, bx, by, L.dateBadge.width, L.dateBadge.height);
  }

  // C.3 Photo de profil clippée (avec ajustements zoom/x/y)
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, p.clipRadius, 0, Math.PI * 2);
  ctx.clip();

  if (userImg) {
    const imgW  = userImg.naturalWidth  || userImg.width;
    const imgH  = userImg.naturalHeight || userImg.height;
    let dw = p.clipRadius * 2;
    let dh = p.clipRadius * 2;
    if (imgW >= imgH) dw = dw * (imgW / imgH);
    else              dh = dh * (imgH / imgW);

    const zoom = clamp(photoAdjust.zoom, 0.5, 3.0);
    const ox   = clamp(photoAdjust.x, -150, 150);
    const oy   = clamp(photoAdjust.y, -150, 150);

    ctx.save();
    ctx.translate(avatarCX, avatarCY);
    ctx.translate(ox, oy);
    ctx.scale(zoom, zoom);
    ctx.drawImage(userImg, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  } else {
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(avatarCX - p.clipRadius, avatarCY - p.clipRadius, p.clipRadius * 2, p.clipRadius * 2);
    if (placeholderImg) {
      ctx.drawImage(
        placeholderImg,
        avatarCX - p.clipRadius / 2,
        avatarCY - p.clipRadius / 2,
        p.clipRadius,
        p.clipRadius
      );
    }
  }
  ctx.restore();

  // C.4 Icône étoile dans le sceau
  if (starImg) {
    ctx.save();
    ctx.drawImage(starImg, sealCX - 11, sealCY - 11, 22, 22);
    ctx.restore();
  }

  // C.5 Icônes dans les boîtes (pin / horloge)
  if (pinImg)   ctx.drawImage(pinImg,   col1BoxX + 11, boxY + 11, 22, 22);
  if (clockImg) ctx.drawImage(clockImg, col2BoxX + 11, boxY + 11, 22, 22);

  // =========================================================================
  // STAGE D : TEXTES (quatrième couche)
  // =========================================================================

  // D.0 Titre « J'y Serai »
  ctx.save();
  ctx.font            = "bold 60px 'Brush Script MT', cursive";
  ctx.fillStyle       = '#FFFFFF';
  ctx.shadowColor     = '#4B0082';
  ctx.shadowBlur      = 8;
  ctx.shadowOffsetX   = 0;
  ctx.shadowOffsetY   = 2;
  ctx.textAlign       = 'center';
  ctx.textBaseline    = 'middle';
  ctx.fillText("J'y Serai", 400, 220);
  ctx.restore();

  // D.1 Contenu badge date (jour / mois / heure)
  const dayText   = cardText.badgeDay   || L.dateBadge._day   || '20';
  const monthText = cardText.badgeMonth || L.dateBadge._month || 'JUIN';
  const timeText  = cardText.badgeTime  || L.dateBadge._time  || '09h00';

  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = '#E2007A';

  ctx.font = "900 34px 'Montserrat', sans-serif";
  ctx.fillText(dayText, 690, 83);

  ctx.font = "800 16px 'Montserrat', sans-serif";
  ctx.fillText(monthText, 690, 107);

  ctx.strokeStyle = 'rgba(226, 0, 122, 0.35)';
  ctx.lineWidth   = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(665, 119); ctx.lineTo(715, 119);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = "700 14px 'Montserrat', sans-serif";
  ctx.fillText(timeText, 690, 131);
  ctx.restore();

  // D.2 Texte du badge de confirmation + points décoratifs
  ctx.save();
  ctx.font         = "800 13px 'Montserrat', sans-serif";
  ctx.fillStyle    = heading.color;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, 400, headingY + heading.height / 2);
  ctx.beginPath();
  ctx.arc(400 - badgeTextWidth / 2 - 15, headingY + heading.height / 2, 3, 0, Math.PI * 2);
  ctx.arc(400 + badgeTextWidth / 2 + 15, headingY + heading.height / 2, 3, 0, Math.PI * 2);
  ctx.fillStyle = heading.color;
  ctx.fill();
  ctx.restore();

  // D.3 Salutation
  const salutation  = L.text.salutation;
  const salutationY = clamp(salutation.y, 0, 1000);
  ctx.save();
  ctx.font         = salutation.font;
  ctx.fillStyle    = salutation.color;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Je soussigné(e)', 400, salutationY);
  ctx.restore();

  // D.4 Nom du participant
  ctx.save();
  ctx.font         = `900 ${nameFontSize}px 'Montserrat', sans-serif`;
  ctx.fillStyle    = nameConf.color;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(displayName, 400, nameConfY);
  ctx.restore();

  // D.5 Texte de confirmation (rich text multi-style)
  const statement    = L.text.statement;
  const defaultFont  = "500 17px 'Inter', sans-serif";
  const boldFont     = "800 17px 'Inter', sans-serif";
  const subtitleFont = "700 13px 'Inter', sans-serif";

  const segments = cardText.statementSegments && cardText.statementSegments.length
    ? cardText.statementSegments
    : [
        { text: 'confirme ma participation à la journée de ', font: defaultFont, color: statement.color },
        { text: 'Remise des Attestations',                    font: boldFont,    color: statement.highlightColor },
        { text: ' de fin de formation en ',                   font: defaultFont, color: statement.color },
        { text: 'Intelligence Artificielle',                  font: boldFont,    color: statement.highlightColor },
        { text: ' organisée par ARIF',                        font: defaultFont, color: statement.color }
      ];

  ctx.save();
  const statementY = clamp(statement.y, 0, 1000);
  const nextY      = drawRichText(ctx, segments, 400, statementY, 660, statement.lineHeight, 'center');

  const orgSubtitleText = cardText.orgSubtitle || "(Association pour la Réussite et l'Insertion des Femmes)";
  ctx.font      = subtitleFont;
  ctx.fillStyle = statement.orgColor;
  ctx.textAlign = 'center';
  ctx.fillText(orgSubtitleText, 400, nextY + 6);
  ctx.restore();

  // D.6 Détails événement (lieu + heure)
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  const venueText      = cardText.venue || L.eventDetails._venue || 'Mairie Ville de Rufisque';
  const timeTextDetail = cardText.time  || L.eventDetails._time  || 'À partir de 09h00';

  const text1X = clamp(detailsX + details.col1X, 0, 800);
  const text2X = clamp(detailsX + details.col2X, 0, 800);

  // Lieu
  ctx.textAlign = 'left';
  ctx.font      = "700 11px 'Montserrat', sans-serif";
  ctx.fillStyle = details.labelColor;
  ctx.fillText('LIEU', text1X, detailsY + 40);
  ctx.font      = "800 17px 'Inter', sans-serif";
  ctx.fillStyle = details.valueColor;
  ctx.fillText(venueText, text1X, detailsY + 64);

  // Heure
  ctx.font      = "700 11px 'Montserrat', sans-serif";
  ctx.fillStyle = details.labelColor;
  ctx.fillText('HEURE', text2X, detailsY + 40);
  ctx.font      = "800 17px 'Inter', sans-serif";
  ctx.fillStyle = details.valueColor;
  ctx.fillText(timeTextDetail, text2X, detailsY + 64);
  ctx.restore();
};

/* --------------------------------------------------------------------------
   Helper interne : roundRect portable (fallback si ctx.roundRect absent)
   -------------------------------------------------------------------------- */
function _roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
    ctx.quadraticCurveTo(x,     y,     x + r, y);
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderCardOnCanvas, svgToImage, drawRichText };
}
