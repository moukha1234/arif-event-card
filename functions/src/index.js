/**
 * J'Y SERAI — Firebase Cloud Functions
 * 
 * Ce fichier sera peuplé progressivement selon les phases :
 * 
 * Phase 6 : Authentification admin (createAdmin)
 * Phase 7 : Paiements Wave / Orange Money (webhooks, initPayment, downloadToken)
 * Phase 8 : Statistiques, export CSV
 * 
 * RÈGLE : Toute validation de paiement se fait ICI côté serveur.
 *         Jamais de validation de paiement côté client JavaScript.
 */

const functions = require('firebase-functions');
const admin     = require('firebase-admin');

admin.initializeApp();

// ---------------------------------------------------------------------------
// Exemple de fonction HTTP de test (à supprimer en production)
// ---------------------------------------------------------------------------
exports.ping = functions.https.onRequest((req, res) => {
  res.json({ status: 'ok', project: 'jy-serai', version: '2.0.0' });
});

// ---------------------------------------------------------------------------
// Phase 7 — Imports à décommenter lors de l'implémentation des paiements :
// ---------------------------------------------------------------------------
// const { initPayment }     = require('./payments/wave-webhook');
// const { waveWebhook }     = require('./payments/wave-webhook');
// const { omWebhook }       = require('./payments/orange-money-webhook');
// const { generateToken }   = require('./cards/generate-download-token');
// const { registerParticipant } = require('./participants/register');

// exports.initPayment         = initPayment;
// exports.waveWebhook         = waveWebhook;
// exports.orangeMoneyWebhook  = omWebhook;
// exports.generateDownloadToken = generateToken;
// exports.registerParticipant = registerParticipant;
