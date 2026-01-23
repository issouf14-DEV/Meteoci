# 🌤️ Météo CI – Prévisions météo en Côte d'Ivoire

[![Version](https://img.shields.io/badge/version-2.0-blue.svg)](https://github.com/issouf14-DEV/meteo-ci)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Bienvenue dans **Météo CI**, une application web moderne et responsive qui vous permet de consulter les prévisions météo des principales villes de Côte d'Ivoire en temps réel.

![Météo CI Preview](https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=800&h=400&fit=crop)

---

## ✨ Fonctionnalités

| Fonctionnalité | Description |
|----------------|-------------|
| 🔐 **Authentification** | Système de connexion/inscription sécurisé (localStorage) |
| 📍 **15+ Villes** | Météo pour les principales villes ivoiriennes |
| ⏰ **Date/Heure** | Consultation des prévisions à une date/heure spécifique |
| 🌙 **Mode Sombre** | Interface adaptative avec détection automatique |
| 🔍 **Recherche** | Barre de recherche avec autocomplétion |
| 📱 **Responsive** | Design optimisé pour mobile, tablette et desktop |
| 🎨 **Animations** | Micro-animations et effets visuels modernes |
| 🔔 **Notifications** | Système de toasts élégant pour le feedback utilisateur |

---

## 🏗️ Architecture du Projet

```
Meteoci-main/
├── index.html                    # Page principale
├── README.md                     # Documentation
├── css/
│   ├── variables.css             # Variables CSS (design tokens)
│   ├── animations.css            # Animations et transitions
│   ├── components.css            # Styles des composants
│   └── main.css                  # Point d'entrée CSS
├── js/
│   ├── config.js                 # Configuration centralisée
│   ├── main.js                   # Point d'entrée JavaScript
│   ├── api/
│   │   └── weather.js            # Service API météo
│   ├── auth/
│   │   └── auth.js               # Gestion authentification
│   ├── ui/
│   │   ├── theme.js              # Mode sombre/clair
│   │   ├── animations.js         # Animations UI
│   │   └── notifications.js      # Système de toasts
│   └── components/
│       ├── cityCard.js           # Composant carte ville
│       └── search.js             # Barre de recherche
└── video/
    └── v1.mp4                    # Vidéo hero section
```

---

## 🔧 Technologies

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Styling**: Tailwind CSS + CSS personnalisé
- **Librairies**: jQuery, Font Awesome
- **API**: [OpenWeatherMap](https://openweathermap.org/api)

---

## 🚀 Installation

### Prérequis
- Un navigateur web moderne (Chrome, Firefox, Edge, Safari)
- Aucune installation serveur requise

### Lancement
```bash
# Cloner le dépôt
git clone https://github.com/issouf14-DEV/meteo-ci.git
cd meteo-ci

# Ouvrir dans le navigateur
start index.html   # Windows
open index.html    # macOS
xdg-open index.html # Linux
```

---

## ⌨️ Raccourcis Clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl + K` | Ouvrir la recherche |
| `Ctrl + D` | Basculer mode sombre |
| `Ctrl + Shift + R` | Rafraîchir les données |
| `Escape` | Fermer les modals |

---

## 🎨 Design System

L'application utilise un système de design cohérent avec :

- **Couleurs** définies via variables CSS (`--color-primary`, `--color-accent`, etc.)
- **Espacements** standardisés (`--spacing-sm`, `--spacing-md`, etc.)
- **Typographie** avec les polices Google Fonts (Inter, Outfit)
- **Animations** réutilisables (fade, slide, scale, etc.)

---

## 🤝 Contribution

Les contributions sont bienvenues !

1. Fork le projet
2. Créer une branche (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -m 'Ajout fonctionnalité'`)
4. Push (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

---

## 📧 Contact

- **Auteur** : FOFANA ISSOUF
- **Email** : fofanaissouf179@gmail.com
- **GitHub** : [issouf14-DEV](https://github.com/issouf14-DEV)

---

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

<p align="center">
  Fait avec ❤️ en Côte d'Ivoire 🇨🇮
</p>
