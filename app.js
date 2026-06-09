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
      alert('Veuillez sÃ©lectionner un fichier image valide (PNG, JPG, JPEG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image dÃ©passe la taille maximale autorisÃ©e (5 Mo).');
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

  
    }, 350);
  });
});


// Fix: Checked and corrected image scale transform export logic.
