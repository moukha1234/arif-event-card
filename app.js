/* ==========================================================================
   ARIF EVENT CARD GENERATOR - CONTROLLER LOGIC
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const inputName = document.getElementById('input-name');
  const cardUserName = document.getElementById('card-user-name');
  
  const inputImage = document.getElementById('input-image');
  const dropzone = document.getElementById('dropzone');
  const uploadThumb = document.getElementById('upload-thumb');
  const thumbContainer = document.getElementById('thumb-container');
  const btnRemoveImg = document.getElementById('btn-remove-img');
  const btnResetForm = document.getElementById('btn-reset-form');
  
  const previewPlaceholder = document.getElementById('preview-placeholder');
  const previewUserImg = document.getElementById('preview-user-img');
  
  const adjustPanel = document.getElementById('adjust-panel');
  const sliderZoom = document.getElementById('slider-zoom');
  const sliderX = document.getElementById('slider-x');
  const sliderY = document.getElementById('slider-y');
  
  const valZoom = document.getElementById('val-zoom');
  const valX = document.getElementById('val-x');
  const valY = document.getElementById('val-y');
  
  const btnDownloadCard = document.getElementById('btn-download-card');
  const eventCard = document.getElementById('event-card');
  const viewportWrapper = document.querySelector('.card-viewport-wrapper');

  // Success Toast Elements
  const toastSuccess = document.getElementById('toast-success');
  const btnCloseToast = document.getElementById('btn-close-toast');
  let toastTimeout;

  // ==========================================================================
  // 1. RESPONSIVE CARD SCALING IN PREVIEW VIEWPORT
  // ==========================================================================
  const scaleCardToFit = () => {
    if (!viewportWrapper || !eventCard) return;
    const wrapperWidth = viewportWrapper.clientWidth;
    // Base card width is 800px. Scale factor = current wrapper width / 800
    const scale = wrapperWidth / 800;
    eventCard.style.setProperty('--card-scale', scale);
  };

  // Setup ResizeObserver for fluid responsive preview scaling
  if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(() => {
      scaleCardToFit();
    });
    resizeObserver.observe(viewportWrapper);
  } else {
    window.addEventListener('resize', scaleCardToFit);
    scaleCardToFit();
  }

  // ==========================================================================
  // 2. NAME FIELD LIVE UPDATE & AUTO-SHRINK TEXT FONT SIZE
  // ==========================================================================
  const calculateFontSize = (nameOrLength) => {
    // Accepte un string (utilise .length) ou un nombre directement
    const len = typeof nameOrLength === 'string' ? nameOrLength.length : nameOrLength;
    if (len <= 18) return 40;
    if (len <= 25) return 32;
    if (len <= 35) return 26;
    return 20;
  };

  const updateNameFontSize = (nameLength) => {
    cardUserName.style.fontSize = `${calculateFontSize(nameLength)}px`;
  };

  inputName.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    if (value) {
      cardUserName.textContent = value;
      updateNameFontSize(value.length);
    } else {
      cardUserName.textContent = "Votre Nom Complet";
      cardUserName.style.fontSize = '40px';
    }
  });

  // ==========================================================================
  // 3. IMAGE UPLOAD & DRAG & DROP HANDLING
  // ==========================================================================
  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (PNG, JPG, JPEG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image dépasse la taille maximale autorisée (5 Mo).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      
      // Update form thumbnail preview
      uploadThumb.src = dataUrl;
      thumbContainer.style.display = 'flex';
      
      // Update card preview image
      previewUserImg.src = dataUrl;
      previewUserImg.classList.remove('hidden');
      previewPlaceholder.classList.add('hidden');
      
      // Enable and reset adjustment panel controls
      adjustPanel.classList.remove('collapsed');
      resetImageAdjustments();
    };
    reader.readAsDataURL(file);
  };

  const resetImageAdjustments = () => {
    sliderZoom.value = 100;
    sliderX.value = 0;
    sliderY.value = 0;
    
    valZoom.textContent = '100%';
    valX.textContent = '0px';
    valY.textContent = '0px';
    
    updateImageTransform();
  };

  const removeUserImage = () => {
    // Reset file input value
    inputImage.value = '';
    
    // Reset thumbnails and previews
    uploadThumb.src = '';
    thumbContainer.style.display = 'none';
    
    previewUserImg.src = '';
    previewUserImg.classList.add('hidden');
    previewPlaceholder.classList.remove('hidden');
    
    // Collapse adjust panel
    adjustPanel.classList.add('collapsed');
    
    // Remove transform values from image style
    previewUserImg.style.transform = '';
  };

  // Form input change trigger
  inputImage.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  });

  // Drag-and-drop event binders
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files[0]) {
      handleImageFile(files[0]);
    }
  }, false);

  btnRemoveImg.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent trigger file select
    removeUserImage();
  });

  // ==========================================================================
  // 4. IMAGE ADJUSTMENT LOGIC (Zoom & Offsets)
  // ==========================================================================
  const updateImageTransform = () => {
    const zoom = sliderZoom.value / 100;
    const x = sliderX.value;
    const y = sliderY.value;
    
    // Set labels
    valZoom.textContent = `${sliderZoom.value}%`;
    valX.textContent = `${x}px`;
    valY.textContent = `${y}px`;
    
    // Apply transform unscaled coordinates first, then scale
    previewUserImg.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
  };

  sliderZoom.addEventListener('input', updateImageTransform);
  sliderX.addEventListener('input', updateImageTransform);
  sliderY.addEventListener('input', updateImageTransform);

  // ==========================================================================
  // 5. FORM RESET HANDLING
  // ==========================================================================
  const resetForm = () => {
    // Clear inputs & preview texts
    inputName.value = '';
    cardUserName.textContent = "Votre Nom Complet";
    cardUserName.style.fontSize = '40px';
    
    // Clear image
    removeUserImage();
    
    // Hide toast if visible
    hideToast();
  };

  btnResetForm.addEventListener('click', resetForm);

  // ==========================================================================
  // 6. SUCCESS TOAST LOGIC
  // ==========================================================================
  const showToast = () => {
    clearTimeout(toastTimeout);
    toastSuccess.classList.remove('hidden');
    // Auto hide after 5 seconds
    toastTimeout = setTimeout(hideToast, 5000);
  };

  const hideToast = () => {
    toastSuccess.classList.add('hidden');
  };

  btnCloseToast.addEventListener('click', hideToast);

  // ==========================================================================
  // 7. NATIVE CANVAS EXPORT FUNCTIONALITY (REPLACES HTML2CANVAS)
  // ==========================================================================

  // Helper to convert an SVG element to an HTMLImageElement
  const svgToImage = (svgElement, width, height) => {
    return new Promise((resolve) => {
      if (!svgElement) { resolve(null); return; }
      try {
        const clone = svgElement.cloneNode(true);
        if (width) clone.setAttribute('width', width);
        if (height) clone.setAttribute('height', height);
        const svgString = new XMLSerializer().serializeToString(clone);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
      } catch (e) {
        console.warn('svgToImage failed:', e);
        resolve(null);
      }
    });
  };

  // Helper to draw wrapped multi-style rich text on canvas
  const drawRichText = (ctx, segments, x, y, maxWidth, lineHeight, align = 'center') => {
    const words = [];
    segments.forEach(seg => {
      const tokens = seg.text.split(/(\s+)/);
      tokens.forEach(token => {
        if (token) {
          words.push({
            text: token,
            font: seg.font || ctx.font,
            color: seg.color || ctx.fillStyle
          });
        }
      });
    });

    const lines = [];
    let currentLine = [];
    let currentLineWidth = 0;

    words.forEach(word => {
      ctx.font = word.font;
      const wordWidth = ctx.measureText(word.text).width;

      if (currentLineWidth + wordWidth > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = [];
        currentLineWidth = 0;
      }

      if (currentLine.length === 0 && word.text.trim() === '') {
        return;
      }

      currentLine.push({ ...word, width: wordWidth });
      currentLineWidth += wordWidth;
    });

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    let currentY = y;
    lines.forEach(line => {
      const lineWidth = line.reduce((sum, w) => sum + w.width, 0);
      let currentX = x;
      
      if (align === 'center') {
        currentX = x - lineWidth / 2;
      } else if (align === 'right') {
        currentX = x - lineWidth;
      }

      line.forEach(word => {
        ctx.font = word.font;
        ctx.fillStyle = word.color;
        ctx.fillText(word.text, currentX, currentY);
        currentX += word.width;
      });

      currentY += lineHeight;
    });
    
    return currentY;
  };

  const renderCardOnCanvas = (ctx, canvas, logoImg, scallopedImg, starImg, pinImg, clockImg, userImg, placeholderImg, displayName, nameFontSize) => {
    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

    // ==========================================================================
    // STAGE A: BACKGROUND RENDERING (FIRST LAYER)
    // ==========================================================================

    // A.1 Full-canvas white base rectangle to prevent any blank transparent zones
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 800, 1000);

    // A.2 Top-half slate gradient backgrounds
    const grad1 = ctx.createLinearGradient(0, 0, 800, 480);
    grad1.addColorStop(0, '#0A1128');
    grad1.addColorStop(0.6, '#152238');
    grad1.addColorStop(1, '#290822');
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

    // A.3 Bottom-half warm-white background
    ctx.fillStyle = '#FAF9F6';
    ctx.fillRect(0, 450, 800, 550);

    // A.4 Ambient Glows (clamped to boundaries)
    const magentaGlowX = clamp(840, 0, 800);
    const magentaGlowY = clamp(100, 0, 1000);
    const glowMagenta = ctx.createRadialGradient(magentaGlowX, magentaGlowY, 0, magentaGlowX, magentaGlowY, 280);
    glowMagenta.addColorStop(0, 'rgba(226, 0, 122, 0.08)');
    glowMagenta.addColorStop(1, 'rgba(226, 0, 122, 0)');
    ctx.fillStyle = glowMagenta;
    ctx.fillRect(0, 0, 800, 1000);

    const cyanGlowX = clamp(-50, 0, 800);
    const cyanGlowY = clamp(900, 0, 1000);
    const glowCyan = ctx.createRadialGradient(cyanGlowX, cyanGlowY, 0, cyanGlowX, cyanGlowY, 350);
    glowCyan.addColorStop(0, 'rgba(0, 161, 201, 0.08)');
    glowCyan.addColorStop(1, 'rgba(0, 161, 201, 0)');
    ctx.fillStyle = glowCyan;
    ctx.fillRect(0, 0, 800, 1000);

    // A.5 Fine full-card dot pattern (clamped to boundaries)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    for (let x = 0; x < 800; x += 24) {
      for (let y = 0; y < 1000; y += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // A.6 Bottom background texture dots
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

    // ==========================================================================
    // STAGE B: SHAPES RENDERING (SECOND LAYER)
    // ==========================================================================

    // B.1 Torn Paper Divider Gray Shadow
    ctx.save();
    ctx.beginPath();
    const grayPoints = [
      [0, 10], [22, 12], [45, 8], [68, 15], [90, 10], [112, 13], [135, 7], [158, 12], [180, 9], [202, 15], 
      [225, 8], [248, 12], [270, 7], [292, 14], [315, 9], [338, 13], [360, 8], [382, 12], [405, 10], [428, 15], 
      [450, 8], [472, 12], [495, 9], [518, 14], [540, 8], [562, 13], [585, 10], [608, 15], [630, 7], [652, 12], 
      [675, 9], [698, 14], [720, 8], [742, 12], [765, 7], [788, 13], [800, 10]
    ];
    ctx.moveTo(grayPoints[0][0], 450 + grayPoints[0][1]);
    for (let i = 1; i < grayPoints.length; i++) {
      ctx.lineTo(grayPoints[i][0], 450 + grayPoints[i][1]);
    }
    ctx.lineTo(800, 1000);
    ctx.lineTo(0, 1000);
    ctx.closePath();
    ctx.fillStyle = 'rgba(216, 216, 223, 0.6)';
    ctx.fill();
    ctx.restore();

    // B.2 Torn Paper Divider White Crumpled Layer
    ctx.save();
    ctx.beginPath();
    const whitePoints = [
      [0, 16], [20, 18], [40, 13], [60, 20], [80, 14], [100, 17], [120, 11], [140, 16], [160, 13], [180, 20],
      [200, 12], [220, 16], [240, 11], [260, 19], [280, 13], [300, 17], [320, 12], [340, 16], [360, 14], [380, 20],
      [400, 12], [420, 16], [440, 13], [460, 19], [480, 12], [500, 16], [520, 13], [540, 20], [560, 11], [580, 16],
      [600, 13], [620, 19], [640, 12], [660, 16], [680, 11], [700, 18], [720, 13], [740, 20], [760, 12], [780, 16],
      [800, 14]
    ];
    ctx.moveTo(whitePoints[0][0], 450 + whitePoints[0][1]);
    for (let i = 1; i < whitePoints.length; i++) {
      ctx.lineTo(whitePoints[i][0], 450 + whitePoints[i][1]);
    }
    ctx.lineTo(800, 1000);
    ctx.lineTo(0, 1000);
    ctx.closePath();
    ctx.fillStyle = '#FAF9F6';
    ctx.fill();
    ctx.restore();

    // B.3 Decorative dots (top-right & bottom-left)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    const trDotsX = clamp(LayoutConfig.decorations.topRightDots.x, 0, 800);
    const trDotsY = clamp(LayoutConfig.decorations.topRightDots.y, 0, 1000);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 6; c++) {
        ctx.beginPath();
        ctx.arc(trDotsX + c * 14 + 3, trDotsY + r * 14 + 3, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const blDotsX = clamp(LayoutConfig.decorations.bottomLeftDots.x, 0, 800);
    const blDotsY = clamp(LayoutConfig.decorations.bottomLeftDots.y, 0, 1000);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 6; c++) {
        ctx.beginPath();
        ctx.arc(blDotsX + c * 14 + 3, blDotsY + r * 14 + 3, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // B.4 Decorative circles (bottom-right)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    const brCirclesX = clamp(LayoutConfig.decorations.bottomRightCircles.x, 0, 800);
    const brCirclesY = clamp(LayoutConfig.decorations.bottomRightCircles.y, 0, 1000);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(brCirclesX + i * 18 + 5, brCirclesY + 5, 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // B.5 User Avatar frame rings
    const p = LayoutConfig.profile;
    const avatarCX = clamp(p.cx, 0, 800);
    const avatarCY = clamp(p.cy, 0, 1000);
    
    ctx.save();
    // Outer border
    ctx.beginPath();
    ctx.arc(avatarCX, avatarCY, p.outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = p.borderColor;
    ctx.fill();

    // White padding
    ctx.beginPath();
    ctx.arc(avatarCX, avatarCY, p.outerRadius - 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Dashed inner ring
    ctx.strokeStyle = p.innerDashedColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(avatarCX, avatarCY, p.innerRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // B.6 Floating Seal Circle (cyan/teal background)
    const sealCX = clamp(p.seal.cx, 0, 800);
    const sealCY = clamp(p.seal.cy, 0, 1000);
    ctx.save();
    const sealGrad = ctx.createLinearGradient(sealCX - p.seal.r, sealCY - p.seal.r, sealCX + p.seal.r, sealCY + p.seal.r);
    sealGrad.addColorStop(0, p.seal.color[0]);
    sealGrad.addColorStop(1, p.seal.color[1]);

    ctx.beginPath();
    ctx.arc(sealCX, sealCY, p.seal.r, 0, Math.PI * 2);
    ctx.fillStyle = sealGrad;
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // B.7 Heading Badge Background Box
    const heading = LayoutConfig.headingBadge;
    const headingY = clamp(heading.y, 0, 1000);
    ctx.save();
    ctx.font = "800 13px 'Montserrat', sans-serif";
    const badgeText = "CONFIRMATION DE PARTICIPATION";
    const badgeTextWidth = ctx.measureText(badgeText).width;
    const badgeW = badgeTextWidth + 72;
    const badgeX = clamp(400 - badgeW / 2, 0, 800);
    
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(badgeX, headingY, badgeW, heading.height, heading.height / 2);
    } else {
      const rx = badgeX, ry = headingY, rw = badgeW, rh = heading.height, rr = heading.height / 2;
      ctx.moveTo(rx + rr, ry);
      ctx.lineTo(rx + rw - rr, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
      ctx.lineTo(rx + rr, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rr);
      ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
    }
    ctx.fillStyle = heading.bgColor;
    ctx.fill();
    ctx.strokeStyle = heading.borderColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // B.8 Underline under user name
    const nameConf = LayoutConfig.text.name;
    ctx.save();
    ctx.font = `900 ${nameFontSize}px 'Montserrat', sans-serif`;
    const nameWidth = ctx.measureText(displayName).width;
    const nameConfY = clamp(nameConf.y, 0, 1000);
    const lineY = nameConfY + nameFontSize / 2 + nameConf.underlineSpacing;
    
    ctx.strokeStyle = nameConf.underlineColor;
    ctx.lineWidth = nameConf.underlineThickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(clamp(400 - nameWidth / 2, 0, 800), lineY);
    ctx.lineTo(clamp(400 + nameWidth / 2, 0, 800), lineY);
    ctx.stroke();
    ctx.restore();

    // B.9 Bottom Details Box Outline & Icon boxes
    const details = LayoutConfig.eventDetails;
    const detailsX = clamp(details.x, 0, 800);
    const detailsY = clamp(details.y, 0, 1000);

    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(detailsX, detailsY, details.width, details.height, 16);
    } else {
      const rx = detailsX, ry = detailsY, rw = details.width, rh = details.height, rr = 16;
      ctx.moveTo(rx + rr, ry);
      ctx.lineTo(rx + rw - rr, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
      ctx.lineTo(rx + rr, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rr);
      ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
    }
    ctx.fillStyle = details.bgColor;
    ctx.fill();
    ctx.strokeStyle = details.borderColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Column 1 icon card box
    const col1BoxX = clamp(detailsX + 24, 0, 800);
    const boxY = clamp(detailsY + 25, 0, 1000);
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(col1BoxX, boxY, 44, 44, 10);
    } else {
      const rx = col1BoxX, ry = boxY, rw = 44, rh = 44, rr = 10;
      ctx.moveTo(rx + rr, ry);
      ctx.lineTo(rx + rw - rr, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
      ctx.lineTo(rx + rr, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rr);
      ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
    }
    ctx.fillStyle = 'rgba(226, 0, 122, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(226, 0, 122, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Column 2 icon card box
    const col2BoxX = clamp(detailsX + 354, 0, 800);
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(col2BoxX, boxY, 44, 44, 10);
    } else {
      const rx = col2BoxX, ry = boxY, rw = 44, rh = 44, rr = 10;
      ctx.moveTo(rx + rr, ry);
      ctx.lineTo(rx + rw - rr, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
      ctx.lineTo(rx + rr, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rr);
      ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
    }
    ctx.fillStyle = 'rgba(226, 0, 122, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(226, 0, 122, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // ==========================================================================
    // STAGE C: IMAGES RENDERING (THIRD LAYER)
    // ==========================================================================

    // C.1 Logo
    if (logoImg) {
      const logoX = clamp(LayoutConfig.logo.x, 0, 800);
      const logoY = clamp(LayoutConfig.logo.y, 0, 1000);
      ctx.drawImage(logoImg, logoX, logoY, LayoutConfig.logo.width, LayoutConfig.logo.height);
    }

    // C.2 Scalloped Date Badge shape
    if (scallopedImg) {
      const badgeX = clamp(LayoutConfig.dateBadge.x, 0, 800);
      const badgeY = clamp(LayoutConfig.dateBadge.y, 0, 1000);
      ctx.drawImage(scallopedImg, badgeX, badgeY, LayoutConfig.dateBadge.width, LayoutConfig.dateBadge.height);
    }

    // C.3 User Avatar Image Crop
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCX, avatarCY, p.clipRadius, 0, Math.PI * 2);
    ctx.clip();

    const hasUserImage = previewUserImg.src && !previewUserImg.classList.contains('hidden');
    if (hasUserImage && userImg) {
      const imgW = userImg.naturalWidth || userImg.width;
      const imgH = userImg.naturalHeight || userImg.height;
      
      let dw = 220;
      let dh = 220;
      if (imgW >= imgH) {
        dw = 220 * (imgW / imgH);
      } else {
        dh = 220 * (imgH / imgW);
      }
      
      const zoom = clamp(sliderZoom.value / 100, 0.5, 3.0);
      const rawX = parseFloat(sliderX.value);
      const rawY = parseFloat(sliderY.value);
      const x = clamp(rawX, -150, 150);
      const y = clamp(rawY, -150, 150);
      
      ctx.save();
      ctx.translate(avatarCX, avatarCY);
      ctx.translate(x, y);
      ctx.scale(zoom, zoom);
      ctx.drawImage(userImg, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    } else {
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(avatarCX - p.clipRadius, avatarCY - p.clipRadius, p.clipRadius * 2, p.clipRadius * 2);
      if (placeholderImg) {
        ctx.drawImage(placeholderImg, avatarCX - 55, avatarCY - 55, 110, 110);
      }
    }
    ctx.restore(); // Restore clipping context

    // C.4 Floating Star Icon (on the status seal)
    if (starImg) {
      ctx.save();
      ctx.drawImage(starImg, sealCX - 11, sealCY - 11, 22, 22);
      ctx.restore();
    }

    // C.5 Details Box Icons (Lieu and Heure SVGs)
    if (pinImg) {
      ctx.drawImage(pinImg, col1BoxX + 11, boxY + 11, 22, 22);
    }
    if (clockImg) {
      ctx.drawImage(clockImg, col2BoxX + 11, boxY + 11, 22, 22);
    }

    // ==========================================================================
    // STAGE D: TEXTS RENDERING (FOURTH LAYER)
    // ==========================================================================

    // D.1 Scalloped Date Badge Content Texts
    const dayText = document.querySelector('.scalloped-day') ? document.querySelector('.scalloped-day').textContent.trim() : "20";
    const monthText = document.querySelector('.scalloped-month') ? document.querySelector('.scalloped-month').textContent.trim() : "JUIN";
    const timeText = document.querySelector('.scalloped-time') ? document.querySelector('.scalloped-time').textContent.trim() : "15 H";

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#E2007A';
    
    ctx.font = "900 34px 'Montserrat', sans-serif";
    ctx.fillText(dayText, 690, 83);
    
    ctx.font = "800 16px 'Montserrat', sans-serif";
    ctx.fillText(monthText, 690, 107);
    
    ctx.strokeStyle = 'rgba(226, 0, 122, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(690 - 25, 119);
    ctx.lineTo(690 + 25, 119);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.font = "700 14px 'Montserrat', sans-serif";
    ctx.fillText(timeText, 690, 131);
    ctx.restore();

    // D.2 Heading Badge ("CONFIRMATION DE PARTICIPATION" and Dots)
    ctx.save();
    ctx.font = "800 13px 'Montserrat', sans-serif";
    ctx.fillStyle = heading.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, 400, headingY + heading.height / 2);
    
    ctx.beginPath();
    ctx.arc(400 - badgeTextWidth / 2 - 15, headingY + heading.height / 2, 3, 0, Math.PI * 2);
    ctx.arc(400 + badgeTextWidth / 2 + 15, headingY + heading.height / 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = heading.color;
    ctx.fill();
    ctx.restore();

    // D.3 Salutation ("Je soussigné(e)")
    const salutation = LayoutConfig.text.salutation;
    const salutationY = clamp(salutation.y, 0, 1000);
    ctx.save();
    ctx.font = salutation.font;
    ctx.fillStyle = salutation.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("Je soussigné(e)", 400, salutationY);
    ctx.restore();

    // D.4 User Name text
    ctx.save();
    ctx.font = `900 ${nameFontSize}px 'Montserrat', sans-serif`;
    ctx.fillStyle = nameConf.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayName, 400, nameConfY);
    ctx.restore();

    // D.5 Confirmation Statement wrapped text + subtitle (parsed from DOM)
    const statement = LayoutConfig.text.statement;
    const defaultFont = "500 17px 'Inter', sans-serif";
    const boldFont = "800 17px 'Inter', sans-serif";
    const subtitleFont = "700 13px 'Inter', sans-serif";
    
    const statementElem = document.querySelector('.confirmation-statement');
    const segments = [];
    if (statementElem) {
      Array.from(statementElem.childNodes).forEach(node => {
        if (node.classList && node.classList.contains('org-subtitle')) {
          return;
        }
        let text = node.textContent.replace(/\s+/g, ' ');
        if (node.nodeType === Node.TEXT_NODE) {
          if (text.trim() || text === ' ') {
            segments.push({
              text: text,
              font: defaultFont,
              color: statement.color
            });
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const isHighlight = node.classList.contains('highlight-text') || node.classList.contains('highlight-texte');
          segments.push({
            text: text,
            font: isHighlight ? boldFont : defaultFont,
            color: isHighlight ? statement.highlightColor : statement.color
          });
        }
      });
    }

    if (segments.length === 0) {
      // Fallback in case DOM querying fails
      segments.push(
        { text: "confirme ma participation à la journée de formation en ", font: defaultFont, color: statement.color },
        { text: "Intelligence Artificielle", font: boldFont, color: statement.highlightColor },
        { text: " organisée par ARIF", font: defaultFont, color: statement.color }
      );
    }
    
    ctx.save();
    const statementY = clamp(statement.y, 0, 1000);
    const nextY = drawRichText(ctx, segments, 400, statementY, 660, statement.lineHeight, 'center');
    
    const orgSubtitleElem = document.querySelector('.org-subtitle');
    const orgSubtitleText = orgSubtitleElem ? orgSubtitleElem.textContent.trim() : "(Association pour la Réussite et l’Insertion des Femmes)";
    ctx.font = subtitleFont;
    ctx.fillStyle = statement.orgColor;
    ctx.textAlign = 'center';
    ctx.fillText(orgSubtitleText, 400, nextY + 6);
    ctx.restore();

    // D.6 Bottom Event Details Texts (Column 1 and Column 2 values parsed from DOM)
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    
    const detailValues = document.querySelectorAll('.detail-value');
    const venueText = detailValues[0] ? detailValues[0].textContent.trim() : "Mairie Ville de Rufisque";
    const timeTextDetail = detailValues[1] ? detailValues[1].textContent.trim() : "À partir de 15h";

    // Column 1 (Lieu) Texts
    const text1X = clamp(detailsX + details.col1X, 0, 800);
    ctx.textAlign = 'left';
    ctx.font = "700 11px 'Montserrat', sans-serif";
    ctx.fillStyle = details.labelColor;
    ctx.fillText("LIEU", text1X, detailsY + 40);

    ctx.font = "800 17px 'Inter', sans-serif";
    ctx.fillStyle = details.valueColor;
    ctx.fillText(venueText, text1X, detailsY + 64);

    // Column 2 (Heure) Texts
    const text2X = clamp(detailsX + details.col2X, 0, 800);
    ctx.textAlign = 'left';
    ctx.font = "700 11px 'Montserrat', sans-serif";
    ctx.fillStyle = details.labelColor;
    ctx.fillText("HEURE", text2X, detailsY + 40);

    ctx.font = "800 17px 'Inter', sans-serif";
    ctx.fillStyle = details.valueColor;
    ctx.fillText(timeTextDetail, text2X, detailsY + 64);
    ctx.restore();
  };

  btnDownloadCard.addEventListener('click', async () => {
    const nameVal = inputName.value.trim();
    const displayName = nameVal ? nameVal.toUpperCase() : "PARTICIPANT";
    const nameFontSize = calculateFontSize(displayName);

    const btnText = btnDownloadCard.querySelector('.btn-text');
    const btnLoadingText = btnDownloadCard.querySelector('.btn-loading-text');

    // Enable spinner loading state
    btnDownloadCard.disabled = true;
    btnText.classList.add('hidden');
    btnLoadingText.classList.remove('hidden');

    // Helper to clamp values between min and max
    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

    try {
      // Wait for Google fonts and images to load completely before capturing
      if (document.fonts) {
        await document.fonts.ready;
      }

      // Query elements from the visible card
      const logoSvg = document.querySelector('.card-logo');
      const scallopedSvg = document.querySelector('.scalloped-bg');
      const starSvg = document.querySelector('.profile-gold-seal svg');
      const detailIcons = document.querySelectorAll('.detail-icon');
      const pinSvg = detailIcons[0];
      const clockSvg = detailIcons[1];
      
      // Serialized images
      const svgPromises = [
        svgToImage(logoSvg, LayoutConfig.logo.width, LayoutConfig.logo.height),
        svgToImage(scallopedSvg, LayoutConfig.dateBadge.width, LayoutConfig.dateBadge.height),
        svgToImage(starSvg, 22, 22),
        svgToImage(pinSvg, 22, 22),
        svgToImage(clockSvg, 22, 22)
      ];

      // User uploaded image
      let userImgPromise = Promise.resolve(null);
      const userImgSrc = previewUserImg.src;
      const hasUserImage = userImgSrc && !previewUserImg.classList.contains('hidden');
      
      if (hasUserImage) {
        userImgPromise = new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = userImgSrc;
        });
      }

      // Placeholder image
      const placeholderSvg = document.querySelector('#preview-placeholder svg');
      const placeholderPromise = svgToImage(placeholderSvg, 110, 110);

      const [logoImg, scallopedImg, starImg, pinImg, clockImg, userImg, placeholderImg] = await Promise.all([
        ...svgPromises,
        userImgPromise,
        placeholderPromise
      ]);

        // 1. SETUP CANVAS & RESOLUTION SCALING
        const dpr = window.devicePixelRatio || 1;
        const canvas = document.createElement('canvas');
        
        // Physical resolution
        canvas.width = 800 * dpr;
        canvas.height = 1000 * dpr;
        
        // Logical layout size
        canvas.style.width = "800px";
        canvas.style.height = "1000px";
        
        const ctx = canvas.getContext('2d');
        
        // Apply high-DPI transform scale
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Render card onto canvas using live parsed DOM text and values
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
          nameFontSize
        );

        // 8. Convert to PNG Blob & Download via toBlob
        const photoCoords = {
          x: clamp(parseFloat(sliderX.value), -150, 150),
          y: clamp(parseFloat(sliderY.value), -150, 150),
          zoom: clamp(sliderZoom.value / 100, 0.5, 3.0)
        };

        await new Promise((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error("Blob generation failed"));
              return;
            }
            const cleanName = nameVal ? nameVal.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'invite';
            const filename = `ARIF_IA_Participation_${cleanName}.png`;

            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.download = filename;
            downloadLink.href = url;
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            // Revoke the object URL after a short timeout to prevent memory leak
            setTimeout(() => URL.revokeObjectURL(url), 100);
            resolve();
          }, "image/png");
        });

        // Visual feedback
        eventCard.classList.add('success-pop');
        setTimeout(() => {
          eventCard.classList.remove('success-pop');
        }, 600);

        showToast();

    } catch (error) {
      console.error("EXPORT ERROR:", error);
      alert("Une erreur est survenue lors de la génération de l'image. Veuillez réessayer.");
    } finally {
      btnDownloadCard.disabled = false;
      btnText.classList.remove('hidden');
      btnLoadingText.classList.add('hidden');
    }
  });
});
