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
  const updateNameFontSize = (nameLength) => {
    if (nameLength <= 18) {
      cardUserName.style.fontSize = '40px';
    } else if (nameLength <= 25) {
      cardUserName.style.fontSize = '32px';
    } else if (nameLength <= 35) {
      cardUserName.style.fontSize = '26px';
    } else {
      cardUserName.style.fontSize = '20px';
    }
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
    return new Promise((resolve, reject) => {
      try {
        const clone = svgElement.cloneNode(true);
        if (width) clone.setAttribute('width', width);
        if (height) clone.setAttribute('height', height);
        
        const svgString = new XMLSerializer().serializeToString(clone);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = (err) => {
          URL.revokeObjectURL(url);
          reject(err);
        };
        img.src = url;
      } catch (e) {
        reject(e);
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

  btnDownloadCard.addEventListener('click', () => {
    const btnText = btnDownloadCard.querySelector('.btn-text');
    const btnLoadingText = btnDownloadCard.querySelector('.btn-loading-text');

    // Enable spinner loading state
    btnDownloadCard.disabled = true;
    btnText.classList.add('hidden');
    btnLoadingText.classList.remove('hidden');

    // Wait for Google fonts and images to load completely before capturing
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

    fontsReady
      .then(() => {
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

        return Promise.all([...svgPromises, userImgPromise, placeholderPromise]);
      })
      .then(([logoImg, scallopedImg, starImg, pinImg, clockImg, userImg, placeholderImg]) => {
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = LayoutConfig.canvas.width;
        canvas.height = LayoutConfig.canvas.height;
        const ctx = canvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 1. Draw Background
        // Top gradient
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

        // Bottom background
        ctx.fillStyle = '#FAF9F6';
        ctx.fillRect(0, 450, 800, 550);

        // Dot grid overlay (fine texture)
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

        // Global ambient glows
        const glowMagenta = ctx.createRadialGradient(840, 100, 0, 840, 100, 280);
        glowMagenta.addColorStop(0, 'rgba(226, 0, 122, 0.08)');
        glowMagenta.addColorStop(1, 'rgba(226, 0, 122, 0)');
        ctx.fillStyle = glowMagenta;
        ctx.fillRect(0, 0, 800, 1000);

        const glowCyan = ctx.createRadialGradient(-50, 900, 0, -50, 900, 350);
        glowCyan.addColorStop(0, 'rgba(0, 161, 201, 0.08)');
        glowCyan.addColorStop(1, 'rgba(0, 161, 201, 0)');
        ctx.fillStyle = glowCyan;
        ctx.fillRect(0, 0, 800, 1000);

        // Fine full-card dot pattern
        ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
        for (let x = 0; x < 800; x += 24) {
          for (let y = 0; y < 1000; y += 24) {
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 2. Draw Torn Paper Divider
        // Gray shadow layer
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

        // White paper layer
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

        // 3. Draw Decorative Dots and Circles
        // Top right dots
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 6; c++) {
            ctx.beginPath();
            ctx.arc(LayoutConfig.decorations.topRightDots.x + c * 14 + 3, LayoutConfig.decorations.topRightDots.y + r * 14 + 3, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // Bottom left dots
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 6; c++) {
            ctx.beginPath();
            ctx.arc(LayoutConfig.decorations.bottomLeftDots.x + c * 14 + 3, LayoutConfig.decorations.bottomLeftDots.y + r * 14 + 3, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // Bottom right circles
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(LayoutConfig.decorations.bottomRightCircles.x + i * 18 + 5, LayoutConfig.decorations.bottomRightCircles.y + 5, 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        // 4. Draw Logo and Scalloped Date Badge
        // Logo
        if (logoImg) {
          ctx.drawImage(logoImg, LayoutConfig.logo.x, LayoutConfig.logo.y, LayoutConfig.logo.width, LayoutConfig.logo.height);
        }
        // Badge Background
        if (scallopedImg) {
          ctx.drawImage(scallopedImg, LayoutConfig.dateBadge.x, LayoutConfig.dateBadge.y, LayoutConfig.dateBadge.width, LayoutConfig.dateBadge.height);
        }

        // Badge Text (20 JUIN 15 H)
        const dayText = document.querySelector('.scalloped-day').textContent.trim();
        const monthText = document.querySelector('.scalloped-month').textContent.trim();
        const timeText = document.querySelector('.scalloped-time').textContent.trim();

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#E2007A';
        
        ctx.font = "950 34px 'Montserrat', sans-serif";
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

        // 5. Draw Avatar Frame and Image Crop
        const p = LayoutConfig.profile;
        
        // Outer border
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, p.outerRadius, 0, Math.PI * 2);
        ctx.fillStyle = p.borderColor;
        ctx.fill();

        // White padding
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, p.outerRadius - 4, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // Dashed inner circle
        ctx.strokeStyle = p.innerDashedColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, p.innerRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Clip path for image/placeholder
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, p.clipRadius, 0, Math.PI * 2);
        ctx.clip();

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
          
          const zoom = sliderZoom.value / 100;
          const x = parseFloat(sliderX.value);
          const y = parseFloat(sliderY.value);
          
          ctx.save();
          ctx.translate(p.cx, p.cy);
          ctx.translate(x, y);
          ctx.scale(zoom, zoom);
          ctx.drawImage(userImg, -dw / 2, -dh / 2, dw, dh);
          ctx.restore();
        } else {
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(p.cx - p.clipRadius, p.cy - p.clipRadius, p.clipRadius * 2, p.clipRadius * 2);
          if (placeholderImg) {
            ctx.drawImage(placeholderImg, p.cx - 55, p.cy - 55, 110, 110);
          }
        }
        ctx.restore(); // Restore from clipping mask

        // Floating Gold/Cyan badge on frame
        ctx.save();
        const sealGrad = ctx.createLinearGradient(p.seal.cx - p.seal.r, p.seal.cy - p.seal.r, p.seal.cx + p.seal.r, p.seal.cy + p.seal.r);
        sealGrad.addColorStop(0, p.seal.color[0]);
        sealGrad.addColorStop(1, p.seal.color[1]);

        ctx.beginPath();
        ctx.arc(p.seal.cx, p.seal.cy, p.seal.r, 0, Math.PI * 2);
        ctx.fillStyle = sealGrad;
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.stroke();

        if (starImg) {
          ctx.drawImage(starImg, p.seal.cx - 11, p.seal.cy - 11, 22, 22);
        }
        ctx.restore();

        // 6. Draw Texts
        // Heading Badge (CONFIRMATION DE PARTICIPATION)
        const heading = LayoutConfig.headingBadge;
        ctx.save();
        ctx.font = "800 13px 'Montserrat', sans-serif";
        ctx.letterSpacing = "1.5px";
        const badgeText = "CONFIRMATION DE PARTICIPATION";
        const badgeTextWidth = ctx.measureText(badgeText).width;
        const badgeW = badgeTextWidth + 72;
        const badgeX = 400 - badgeW / 2;
        
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(badgeX, heading.y, badgeW, heading.height, heading.height / 2);
        } else {
          const rx = badgeX, ry = heading.y, rw = badgeW, rh = heading.height, rr = heading.height / 2;
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
        
        ctx.fillStyle = heading.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, 400, heading.y + heading.height / 2);
        
        ctx.beginPath();
        ctx.arc(400 - badgeTextWidth / 2 - 15, heading.y + heading.height / 2, 3, 0, Math.PI * 2);
        ctx.arc(400 + badgeTextWidth / 2 + 15, heading.y + heading.height / 2, 3, 0, Math.PI * 2);
        ctx.fillStyle = heading.color;
        ctx.fill();
        ctx.restore();

        // Salutation ("Je soussigné(e)")
        const salutation = LayoutConfig.text.salutation;
        ctx.save();
        ctx.font = salutation.font;
        ctx.fillStyle = salutation.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("Je soussigné(e)", 400, salutation.y);
        ctx.restore();

        // User Name
        const nameVal = inputName.value.trim();
        const displayName = nameVal ? nameVal.toUpperCase() : "VOTRE NOM COMPLET";
        const nameConf = LayoutConfig.text.name;
        
        let nameFontSize = 40;
        if (displayName.length <= 18) {
          nameFontSize = 40;
        } else if (displayName.length <= 25) {
          nameFontSize = 32;
        } else if (displayName.length <= 35) {
          nameFontSize = 26;
        } else {
          nameFontSize = 20;
        }
        
        ctx.save();
        ctx.font = `900 ${nameFontSize}px 'Montserrat', sans-serif`;
        ctx.fillStyle = nameConf.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayName, 400, nameConf.y);
        
        // Underline
        const nameWidth = ctx.measureText(displayName).width;
        const lineY = nameConf.y + nameFontSize / 2 + nameConf.underlineSpacing;
        ctx.strokeStyle = nameConf.underlineColor;
        ctx.lineWidth = nameConf.underlineThickness;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(400 - nameWidth / 2, lineY);
        ctx.lineTo(400 + nameWidth / 2, lineY);
        ctx.stroke();
        ctx.restore();

        // Confirmation Statement Paragraph
        const statement = LayoutConfig.text.statement;
        const defaultFont = "500 17px 'Inter', sans-serif";
        const boldFont = "800 17px 'Inter', sans-serif";
        const subtitleFont = "700 13px 'Inter', sans-serif";
        
        const segments = [
          { text: "confirme ma participation à la journée de formation en ", font: defaultFont, color: statement.color },
          { text: "Intelligence Artificielle", font: boldFont, color: statement.highlightColor },
          { text: " organisée par ARIF", font: defaultFont, color: statement.color }
        ];
        
        ctx.save();
        const nextY = drawRichText(ctx, segments, 400, statement.y, 660, statement.lineHeight, 'center');
        
        ctx.font = subtitleFont;
        ctx.fillStyle = statement.orgColor;
        ctx.textAlign = 'center';
        ctx.letterSpacing = "0.5px";
        ctx.fillText("(Association pour la Réussite et l’Insertion des Femmes)", 400, nextY + 6);
        ctx.restore();

        // 7. Draw Bottom Event Details Box
        const details = LayoutConfig.eventDetails;

        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(details.x, details.y, details.width, details.height, 16);
        } else {
          const rx = details.x, ry = details.y, rw = details.width, rh = details.height, rr = 16;
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

        // Column 1 (Lieu) Icon box
        const col1BoxX = details.x + 24;
        const boxY = details.y + 25;
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

        if (pinImg) {
          ctx.drawImage(pinImg, col1BoxX + 11, boxY + 11, 22, 22);
        }

        const text1X = details.x + details.col1X;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        ctx.font = "700 11px 'Montserrat', sans-serif";
        ctx.fillStyle = details.labelColor;
        ctx.letterSpacing = "1.5px";
        ctx.fillText("LIEU", text1X, details.y + 40);

        ctx.font = "800 17px 'Inter', sans-serif";
        ctx.fillStyle = details.valueColor;
        ctx.letterSpacing = "0px";
        ctx.fillText("Mairie Ville de Rufisque", text1X, details.y + 64);

        // Column 2 (Heure) Icon box
        const col2BoxX = details.x + 354;
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

        if (clockImg) {
          ctx.drawImage(clockImg, col2BoxX + 11, boxY + 11, 22, 22);
        }

        const text2X = details.x + details.col2X;
        ctx.textAlign = 'left';

        ctx.font = "700 11px 'Montserrat', sans-serif";
        ctx.fillStyle = details.labelColor;
        ctx.letterSpacing = "1.5px";
        ctx.fillText("HEURE", text2X, details.y + 40);

        ctx.font = "800 17px 'Inter', sans-serif";
        ctx.fillStyle = details.valueColor;
        ctx.letterSpacing = "0px";
        ctx.fillText("À partir de 15h", text2X, details.y + 64);

        ctx.restore();

        // 8. Convert to PNG Data URI & Download
        const imgData = canvas.toDataURL('image/png', 1.0);
        
        const cleanName = nameVal ? nameVal.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'invite';
        const filename = `ARIF_IA_Participation_${cleanName}.png`;

        const downloadLink = document.createElement('a');
        downloadLink.href = imgData;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // Visual feedback
        eventCard.classList.add('success-pop');
        setTimeout(() => {
          eventCard.classList.remove('success-pop');
        }, 600);

        showToast();
      })
      .catch((error) => {
        console.error('Erreur d\'exportation avec canvas natif:', error);
        alert('Une erreur est survenue lors de la génération de l\'image. Veuillez réessayer.');
      })
      .finally(() => {
        btnDownloadCard.disabled = false;
        btnText.classList.remove('hidden');
        btnLoadingText.classList.add('hidden');
      });
  });
});
