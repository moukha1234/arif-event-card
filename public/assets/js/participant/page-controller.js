/* ==========================================================================
   J'Y SERAI — PAGE CONTROLLER (PARTICIPANT)
   
   Ce module remplace le monolithe app.js. Il orchestre :
   - L'initialisation Firebase
   - La gestion du formulaire (nom, photo, sliders)
   - L'appel à exportCard() via le module card-export.js
   
   Aucune logique de rendu Canvas ici — tout est délégué aux modules
   du card-engine. Ce fichier ne fait que coordonner l'interface.
   ========================================================================== */

// ---------------------------------------------------------------------------
// Configuration Firebase (v8 compat — migration v9 Phase 2 finale)
// ---------------------------------------------------------------------------
const firebaseConfig = {
  projectId:         'arif-event-card',
  appId:             '1:260697604272:web:a3a164579b057ea25d7b75',
  storageBucket:     'arif-event-card.firebasestorage.app',
  apiKey:            'AIzaSyByEBDcf9idUpInhgeQ-9eY-is9eFPBa6M',
  authDomain:        'arif-event-card.firebaseapp.com',
  messagingSenderId: '260697604272'
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ---------------------------------------------------------------------------
// Configuration de l'événement courant
// En Phase 3, cet objet sera chargé depuis Firestore (event-loader.js).
// ---------------------------------------------------------------------------
const CURRENT_EVENT_CONFIG = {
  id:     'remise-attestations-arif-2026',
  isFree: true,      // Phase 7 : basculer à false pour activer le paiement
  price:  0,
  venue:  'Mairie Ville de Rufisque',
  time:   'À partir de 09h00',
  design: {
    badgeDay:        '20',
    badgeMonth:      'JUIN',
    badgeTime:       '09h00',
    primaryColor:    '#E2007A',
    secondaryColor:  '#00A1C9'
  }
};

// Générer la configuration Canvas depuis l'événement
const layoutConfig = getLayoutConfig(CURRENT_EVENT_CONFIG);

// ---------------------------------------------------------------------------
// Initialisation de la page
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {

  // --- Références DOM ---
  const inputName        = document.getElementById('input-name');
  const cardUserName     = document.getElementById('card-user-name');
  const inputImage       = document.getElementById('input-image');
  const dropzone         = document.getElementById('dropzone');
  const uploadThumb      = document.getElementById('upload-thumb');
  const thumbContainer   = document.getElementById('thumb-container');
  const btnRemoveImg     = document.getElementById('btn-remove-img');
  const btnResetForm     = document.getElementById('btn-reset-form');
  const previewPlaceholder = document.getElementById('preview-placeholder');
  const previewUserImg   = document.getElementById('preview-user-img');
  const adjustPanel      = document.getElementById('adjust-panel');
  const sliderZoom       = document.getElementById('slider-zoom');
  const sliderX          = document.getElementById('slider-x');
  const sliderY          = document.getElementById('slider-y');
  const valZoom          = document.getElementById('val-zoom');
  const valX             = document.getElementById('val-x');
  const valY             = document.getElementById('val-y');
  const btnDownloadCard  = document.getElementById('btn-download-card');
  const eventCard        = document.getElementById('event-card');
  const viewportWrapper  = document.querySelector('.card-viewport-wrapper');
  const toastSuccess     = document.getElementById('toast-success');
  const btnCloseToast    = document.getElementById('btn-close-toast');
  let toastTimeout;

  // ==========================================================================
  // 1. SCALING RESPONSIVE DE L'APERÇU CARTE
  // ==========================================================================
  const scaleCardToFit = () => {
    if (!viewportWrapper || !eventCard) return;
    const scale = viewportWrapper.clientWidth / 800;
    eventCard.style.setProperty('--card-scale', scale);
  };

  if (window.ResizeObserver) {
    new ResizeObserver(scaleCardToFit).observe(viewportWrapper);
  } else {
    window.addEventListener('resize', scaleCardToFit);
    scaleCardToFit();
  }

  // ==========================================================================
  // 2. MISE À JOUR EN TEMPS RÉEL DU NOM (avec auto-shrink)
  // ==========================================================================
  inputName.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    if (value) {
      cardUserName.textContent   = value;
      cardUserName.style.fontSize = `${calculateFontSize(value.length)}px`;
    } else {
      cardUserName.textContent   = 'Votre Nom Complet';
      cardUserName.style.fontSize = '40px';
    }
  });

  // ==========================================================================
  // 3. GESTION UPLOAD & DRAG-AND-DROP DE LA PHOTO
  // ==========================================================================
  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (PNG, JPG, JPEG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("L'image dépasse la taille maximale autorisée (5 Mo).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      uploadThumb.src              = dataUrl;
      thumbContainer.style.display = 'flex';
      previewUserImg.src           = dataUrl;
      previewUserImg.classList.remove('hidden');
      previewPlaceholder.classList.add('hidden');
      adjustPanel.classList.remove('collapsed');
      resetImageAdjustments();
    };
    reader.readAsDataURL(file);
  };

  const resetImageAdjustments = () => {
    sliderZoom.value = 100;
    sliderX.value    = 0;
    sliderY.value    = 0;
    valZoom.textContent = '100%';
    valX.textContent    = '0px';
    valY.textContent    = '0px';
    updateImageTransform();
  };

  const removeUserImage = () => {
    inputImage.value               = '';
    uploadThumb.src                = '';
    thumbContainer.style.display   = 'none';
    previewUserImg.src             = '';
    previewUserImg.classList.add('hidden');
    previewPlaceholder.classList.remove('hidden');
    adjustPanel.classList.add('collapsed');
    previewUserImg.style.transform = '';
  };

  inputImage.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handleImageFile(e.target.files[0]);
  });

  ['dragenter', 'dragover'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault(); e.stopPropagation();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault(); e.stopPropagation();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files[0]) handleImageFile(files[0]);
  }, false);

  btnRemoveImg.addEventListener('click', (e) => {
    e.stopPropagation();
    removeUserImage();
  });

  // ==========================================================================
  // 4. AJUSTEMENTS PHOTO (Zoom + Déplacements)
  // ==========================================================================
  const updateImageTransform = () => {
    const zoom = sliderZoom.value / 100;
    const x    = sliderX.value;
    const y    = sliderY.value;
    valZoom.textContent            = `${sliderZoom.value}%`;
    valX.textContent               = `${x}px`;
    valY.textContent               = `${y}px`;
    previewUserImg.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
  };

  sliderZoom.addEventListener('input', updateImageTransform);
  sliderX.addEventListener('input',    updateImageTransform);
  sliderY.addEventListener('input',    updateImageTransform);

  // ==========================================================================
  // 5. RESET FORMULAIRE
  // ==========================================================================
  const resetForm = () => {
    inputName.value                = '';
    cardUserName.textContent       = 'Votre Nom Complet';
    cardUserName.style.fontSize    = '40px';
    removeUserImage();
    hideToast();
  };

  btnResetForm.addEventListener('click', resetForm);

  // ==========================================================================
  // 6. TOAST DE SUCCÈS
  // ==========================================================================
  const showToast = () => {
    clearTimeout(toastTimeout);
    toastSuccess.classList.remove('hidden');
    toastTimeout = setTimeout(hideToast, 5000);
  };

  const hideToast = () => {
    toastSuccess.classList.add('hidden');
  };

  btnCloseToast.addEventListener('click', hideToast);

  // ==========================================================================
  // 7. TÉLÉCHARGEMENT — Appel à exportCard() (card-export.js)
  // ==========================================================================
  btnDownloadCard.addEventListener('click', async () => {
    const rawName     = inputName.value.trim();
    const displayName = (rawName ? rawName : 'PARTICIPANT').toUpperCase();
    const userImgSrc  = (!previewUserImg.classList.contains('hidden') && previewUserImg.src)
      ? previewUserImg.src
      : '';

    const photoAdjust = {
      zoom: parseFloat(sliderZoom.value) / 100,
      x:    parseFloat(sliderX.value),
      y:    parseFloat(sliderY.value)
    };

    const btnText        = btnDownloadCard.querySelector('.btn-text');
    const btnLoadingText = btnDownloadCard.querySelector('.btn-loading-text');

    await exportCard({
      displayName,
      rawName,
      userImgSrc,
      photoAdjust,
      layoutConfig,

      // Phase 7 : remplacer par un appel Cloud Function de validation token
      downloadGate: async () => true,

      db,
      eventId: CURRENT_EVENT_CONFIG.id,

      onStart: () => {
        btnDownloadCard.disabled = true;
        btnText.classList.add('hidden');
        btnLoadingText.classList.remove('hidden');
      },

      onSuccess: () => {
        eventCard.classList.add('success-pop');
        setTimeout(() => eventCard.classList.remove('success-pop'), 600);
        showToast();
      },

      onError: (err) => {
        if (err.message === 'PAYMENT_REQUIRED') {
          // Phase 7 : afficher la modal de paiement
          alert('Paiement requis pour télécharger votre affiche.');
        } else {
          console.error('Export error:', err);
          alert('Une erreur est survenue lors de la génération. Veuillez réessayer.');
        }
      }
    });

    // Réactiver le bouton dans tous les cas
    btnDownloadCard.disabled = false;
    btnText.classList.remove('hidden');
    btnLoadingText.classList.add('hidden');
  });

}); // DOMContentLoaded
