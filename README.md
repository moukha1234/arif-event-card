# ARIF Event Card Generator

L'application **ARIF Event Card Generator** est un générateur d'affiches personnalisé de confirmation de participation pour la journée de formation en Intelligence Artificielle d'**ARIF** (Association pour la Réussite et l'Insertion des Femmes). 

Ce projet est 100% statique et côté client, conçu pour être léger, fluide et facilement intégrable.

## 🚀 Fonctionnalités

1. **Formulaire de Personnalisation** :
   - Saisie du nom complet de l'utilisateur avec ajustement automatique de la taille de la police (auto-shrink) pour éviter les débordements textuels.
   - Zone de glisser-déposer (Drag & Drop) intuitive pour importer une photo de profil.

2. **Ajustements de l'Image de Profil** :
   - Curseurs interactifs pour contrôler le **Zoom** ainsi que le **Déplacement Horizontal (X)** et **Déplacement Vertical (Y)** afin de recentrer parfaitement le visage dans le cadre.

3. **Respect de la Charte Graphique Officielle ARIF** :
   - Intégration du logo officiel d'ARIF (profil féminin stylisé et foulard aux motifs rouge, jaune et vert) dessiné en SVG vectoriel pour une netteté absolue.
   - Thématique couleur officielle (Magenta `#E2007A`, Cyan `#00A1C9`).
   - Sceau de date cranté ("20 JUIN / 15 H"), grille de points décorative et ligne d'effet papier déchiré.

4. **Export Haute Définition** :
   - Téléchargement instantané d'une image PNG haute résolution de `1600x2000px` (échelle de rendu de x2 via `html2canvas`), optimisée et prête à être partagée en Story WhatsApp ou Instagram.

5. **Expérience Utilisateur Soignée** :
   - Animation de succès lors de la sauvegarde.
   - Notifications Toast coulissantes pour confirmer le téléchargement.
   - Bouton de réinitialisation rapide pour nettoyer les données saisies.

---

## 🛠️ Technologies Utilisées

*   **HTML5 & CSS3** : Structure sémantique et design moderne mobile-first (effet glassmorphic pour l'application, papier froissé et textures réalistes pour la carte).
*   **JavaScript Vanilla (ES6)** : Logique de manipulation du DOM, gestionnaires d'importation d'images locales et liaison de données temps réel.
*   **html2canvas** (version stable 1.4.1 via CDN) : Moteur d'exportation d'éléments HTML vers Canvas en préservant le format d'image et les polices Google Fonts.

---

## 💻 Démarrage Local

Pour lancer l'application sur votre machine locale, vous avez simplement besoin d'un serveur Web statique pour éviter les blocages de sécurité des fichiers de scripts.

### Option A : Avec Node.js (Recommandé)
Démarrez un serveur léger instantanément en ouvrant votre terminal dans le répertoire racine du projet et en exécutant :
```bash
npx http-server -p 8080
```
Puis ouvrez votre navigateur sur [http://localhost:8080](http://localhost:8080).

### Option B : Avec Python (Intégré)
Si vous possédez Python installé sur votre système, exécutez la commande suivante :
```bash
python -m http.server 8080
```
Puis rendez-vous sur [http://localhost:8080](http://localhost:8080).

---

## ☁️ Déploiement sur Firebase Hosting

L'application étant entièrement statique, elle s'adapte parfaitement à Firebase Hosting. Un fichier de configuration `firebase.json` est déjà présent à la racine pour cibler les fichiers statiques du dossier courant.

### Étape 1 : Installer la CLI Firebase (si non installée)
```bash
npm install -g firebase-tools
```

### Étape 2 : Connecter votre compte Firebase
```bash
firebase login
```

### Étape 3 : Initialiser l'association du projet
Associez ce répertoire de travail à votre projet Firebase existant en exécutant :
```bash
firebase init hosting
```
*Sélections recommandées lors de l'initialisation :*
*   **What do you want to use as your public directory?** tapez `.` (pour cibler le dossier racine actuel).
*   **Configure as a single-page app (rewrite all urls to /index.html)?** répondez `No` (ou `N`).
*   **Set up automatic builds and deploys with GitHub?** répondez selon vos préférences (généralement `No`).
*   **File ./index.html already exists. Overwrite?** répondez impérativement `No` (ou `N`).

### Étape 4 : Déployer le site en production
Exécutez simplement la commande finale :
```bash
firebase deploy --only hosting
```
Firebase générera alors une URL publique (ex: `https://votre-projet.web.app`) pour partager votre générateur.
