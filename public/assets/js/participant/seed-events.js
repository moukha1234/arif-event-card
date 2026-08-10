/* ==========================================================================
   J'Y SERAI — SEED EVENTS SCRIPT
   
   Ce script permet d'initialiser ou de réinitialiser la collection "events"
   dans Firestore avec les événements de démonstration.
   ========================================================================== */

async function seedFirestoreEvents(db) {
  if (!db) {
    console.error('[SeedEvents] Firestore non disponible.');
    return;
  }

  const eventsToSeed = [
    {
      id: 'remise-attestations-arif-2026',
      slug: 'remise-attestations-arif-2026',
      name: 'Remise des Attestations ARIF 2026',
      title: 'Remise des Attestations',
      description: 'Journée de remise des attestations de fin de formation en Intelligence Artificielle organisée par ARIF.',
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
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    },
    {
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
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }
  ];

  for (const event of eventsToSeed) {
    try {
      await db.collection('events').doc(event.id).set(event, { merge: true });
      console.log(`[SeedEvents] Événement alimenté dans Firestore : ${event.slug}`);
    } catch (err) {
      console.error(`[SeedEvents] Erreur seeding ${event.slug} :`, err);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { seedFirestoreEvents };
}
