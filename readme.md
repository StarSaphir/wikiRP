# 📚 Architect Wiki - Système de Wiki RP Personnalisable

Un éditeur visuel WYSIWYG pour créer des pages wiki statiques destinées à GitHub Pages.

## 🎯 Objectif

Créer un système de wiki pour jeux de rôle avec :
- ✅ Éditeur visuel glisser-déposer
- ✅ Génération HTML statique (compatible GitHub Pages)
- ✅ Système responsive intelligent
- ✅ Pages cachées pour informations MJ
- ✅ Aucune dépendance serveur en production

## 📁 Structure du Projet

```
architect-wiki/
├── app.py                      # Serveur Flask (développement uniquement)
├── requirements.txt
│
├── templates/                  # Templates Jinja2
│   ├── dashboard.html         # Liste des pages
│   ├── editor.html            # Éditeur visuel
│   └── viewer.html            # Vue de consultation (dev)
│
├── static/
│   ├── css/
│   │   ├── editor.css
│   │   └── viewer.css
│   │
│   └── js/
│       ├── main.js            # Point d'entrée éditeur
│       ├── core/              # Logique métier
│       │   ├── state.js       # Gestion état
│       │   └── canvas.js      # Canvas interactif
│       ├── components/        # Types de composants
│       │   ├── text-component.js
│       │   ├── image-component.js
│       │   └── ...
│       ├── ui/                # Interface utilisateur
│       ├── modals/            # Modales (liens, images...)
│       ├── api/
│       │   └── client.js      # Client API
│       └── utils/
│           ├── responsive-layout.js  # Système responsive
│           └── debug.js              # Outils de debug
│
├── data/
│   ├── pages-metadata.json    # Métadonnées des pages
│   └── inventory.json         # Index des pages
│
└── pages/                     # Pages générées (GitHub Pages)
    └── ma-page/
        ├── index.html         # HTML statique autonome
        ├── layout.json        # Source de vérité
        ├── backups/           # Sauvegardes automatiques
        ├── images/
        └── assets/
```

## 🚀 Installation

```bash
# Cloner le projet
git clone <votre-repo>
cd architect-wiki

# Installer les dépendances
pip install -r requirements.txt

# Lancer le serveur de développement
python app.py
```

Ouvrir http://localhost:5000

## 🎨 Utilisation

### Créer une Page

1. Dashboard → "Nouvelle Page"
2. Éditeur → Glisser-déposer des composants
3. Double-cliquer pour éditer le contenu
4. Sauvegarder → Génère automatiquement `index.html`

### Types de Composants

- **📝 Texte** : Éditeur riche (Quill.js)
- **🖼️ Image** : Upload + affichage
- **🎞️ Galerie** : Carousel d'images
- **🎬 Vidéo** : Upload vidéo MP4
- **📺 YouTube** : Embed YouTube
- **⬛ Forme** : Rectangle coloré
- **📊 Tableau** : Tableau HTML éditable
- **➖ Séparateur** : Ligne horizontale

### Publication sur GitHub Pages

```bash
# Copier uniquement le dossier pages/
git add pages/
git commit -m "Update wiki pages"
git push

# GitHub Pages servira automatiquement pages/*/index.html
```

## 🔧 Système Responsive

Le système ajuste automatiquement les pages pour tous les écrans.

### Fonctionnement

1. **Mesure du canvas éditeur** → Sauvegardé dans les metadata
2. **Calcul du ratio** → `largeur_écran / largeur_éditeur`
3. **Ajustement des composants** :
   - Scaling proportionnel
   - Si largeur réduite → augmentation hauteur
   - Redistribution verticale intelligente
4. **Préservation des superpositions** (> 15% de surface commune)

### Facteurs d'Ajustement Hauteur

```javascript
text: ×3.0      // Très agressif (texte wrappé)
table: ×2.5
image: ×1.0     // Ratio constant
shape: ×0.3
separator: ×0   // Pas d'ajustement
```

## 🛠️ Commandes de Debug

### Dans la Console (F12)

#### Outils Responsive

```javascript
// Afficher l'overlay de debug
window.responsiveLayout.showDebugOverlay()

// Infos système
window.responsiveLayout.getDebugInfo()
// → { breakpoint, ratio, editorCanvasWidth, availableWidth, ... }

// Réinitialiser au layout original
window.responsiveLayout.reset()
```

#### Outils Visuels

```javascript
// Afficher TOUT
ResponsiveDebug.showAll()

// Afficher les contours (rouge = général, vert = texte)
ResponsiveDebug.showBorders()

// Afficher les coordonnées
ResponsiveDebug.showCoords()

// Afficher infos texte (+ détection overflow)
ResponsiveDebug.showTextInfo()

// Masquer tout
ResponsiveDebug.hideAll()

// Rapport complet
ResponsiveDebug.report()

// Vérifier taille du canvas
ResponsiveDebug.checkCanvasSize()
```

### Exemple de Rapport

```javascript
ResponsiveDebug.report()

// Affiche :
// 📐 Configuration: { ratio, breakpoint, ... }
// 📦 Composants: tableau avec id, type, dimensions, overflow
// ⚠️ PROBLÈMES DÉTECTÉS:
//   1. Canvas éditeur trop petit (< 1900px)
//   2. 4 composant(s) texte en overflow
```

## 🐛 Résolution de Problèmes

### Composants texte en overflow (⚠️)

**Cause** : Hauteur insuffisante après compression largeur

**Solutions** :
1. Vérifier la taille du canvas : `ResponsiveDebug.checkCanvasSize()`
2. Si canvas < 1900px → Resauvegarder la page
3. Augmenter le facteur d'ajustement dans `responsive-layout.js`

### Superpositions perdues

**Cause** : Seuil de détection trop bas

**Solution** : Modifier `isIntentionalOverlap()` :
```javascript
// Actuellement : 15%
return overlapArea > minArea * 0.15;

// Réduire à 10% si besoin
return overlapArea > minArea * 0.10;
```

### Ratio > 100%

**Cause** : Canvas éditeur mal mesuré

**Solution** :
```javascript
ResponsiveDebug.checkCanvasSize()
// Si "Canvas éditeur: XXXpx" trop petit :
// → Resauvegarder la page depuis l'éditeur
```

## 📊 Logs Console

### Lors du Chargement

```
📦 13 composants | Canvas: 1483×1080px
🔧 Initialisation du système responsive OPTIMISÉ
📐 Canvas éditeur: 1483px
📐 Largeur disponible: 1773px
📊 Breakpoint: wide
📐 Ratio de scaling: 119.6%
✅ Responsive OPTIMISÉ activé
💡 Commandes: ResponsiveDebug.showAll() | ResponsiveDebug.report()
```

### Lors de l'Ajustement

```
📏 comp-1 (text): 85% → +120px
✨ Superposition préservée: comp-2 ↔ comp-3
🔽 comp-4 décalé de 350 → 470px
```

## 🔒 Pages Cachées

Pour créer des pages réservées au MJ :

1. Dashboard → Sélectionner page → "👁️ Masquer"
2. La page reste accessible via URL directe
3. Un avertissement s'affiche à l'ouverture
4. Non listée dans la navigation

## 📝 Notes Importantes

- Le serveur Flask est **uniquement pour le développement**
- Les fichiers `index.html` sont **autonomes**
- Toujours sauvegarder avant de quitter l'éditeur
- Les backups gardent les 5 dernières versions
- La taille du canvas est cruciale pour le responsive

## 🤝 Contribution

Structure modulaire ES6, ajouts via pull requests.

## 📜 Licence

Projet personnel pour jeux de rôle.

---

**Version** : 2.0  
**Dernière mise à jour** : Janvier 2026