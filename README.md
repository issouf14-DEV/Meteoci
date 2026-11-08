# 🌤️ Météo CI – Prévisions météo en Côte d'Ivoire

Application web moderne et responsive pour consulter la météo actuelle et les prévisions (jusqu'à 5 jours) des principales villes de Côte d'Ivoire.

---

## ✨ Fonctionnalités

| Fonctionnalité       | Description                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| 📍 **15 villes**     | Météo des principales villes ivoiriennes (Abidjan, Bouaké, Korhogo, Yamoussoukro...)                      |
| ⏰ **Date / heure**  | Prévision la plus proche de la date et de l'heure choisies (5 jours max)                                  |
| 🌡️ **Détails**       | Température, max/min, ressenti, humidité, vent, probabilité de pluie                                      |
| 🔍 **Recherche**     | Autocomplétion navigable au clavier ; une ville inconnue est ajoutée dynamiquement (et peut être retirée) |
| 🌙 **Mode sombre**   | Thème clair/sombre mémorisé, avec détection de la préférence système                                      |
| 🔄 **Actualisation** | Automatique toutes les 10 minutes, ou manuelle                                                            |
| 📱 **Responsive**    | Mobile, tablette et desktop ; animations fluides respectant `prefers-reduced-motion`                      |
| 🔔 **Notifications** | Toasts accessibles pour le retour utilisateur                                                             |

---

## 🔧 Technologies

- [React 19](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/) (mode strict)
- [Vite 8](https://vite.dev/) (build et serveur de développement)
- [Tailwind CSS 4](https://tailwindcss.com/) (configuration CSS-first via `@tailwindcss/vite`) + `tw-animate-css`
- Composants [shadcn/ui](https://ui.shadcn.com/) (Radix UI) et notifications [Sonner](https://sonner.emilkowal.ski/)
- Icônes [lucide-react](https://lucide.dev/)
- [Zod 4](https://zod.dev/) : validation à l'exécution des réponses de l'API, de la clé API, de la recherche et des données `localStorage`
- [Biome](https://biomejs.dev/) : linter + formateur (remplace ESLint/Prettier)
- Données : [OpenWeatherMap](https://openweathermap.org/api)

---

## 🏗️ Structure

```
├── index.html               # Point d'entrée Vite
├── public/
│   ├── favicon.svg
│   ├── theme-init.js        # Applique le thème avant le rendu (pas de flash)
│   └── video/v1.mp4         # Vidéo de la section d'accueil
├── src/
│   ├── main.tsx             # Montage React (+ purge des anciennes données locales)
│   ├── App.tsx              # Orchestration : recherche, filtres, rafraîchissement
│   ├── index.css            # Tailwind v4 (CSS-first) : thème, palette Météo CI, animations
│   ├── components/          # Header, Hero, CityCard, Footer...
│   │   └── ui/              # Composants shadcn/ui
│   ├── hooks/               # useWeather, useReducedMotion
│   └── lib/                 # API météo, schémas Zod, env, villes, validation, utilitaires
├── biome.json               # Configuration Biome (lint + formatage)
└── vite.config.ts           # Alias @, Tailwind, base relative, CSP de production
```

---

## 🚀 Installation

### Prérequis

- Node.js 20.19+ (22 recommandé) et npm
- Une clé API gratuite [OpenWeatherMap](https://home.openweathermap.org/api_keys)

### Lancement en local

```bash
git clone https://github.com/issouf14-DEV/Meteoci.git
cd Meteoci
npm install

# Configurer la clé API (fichier ignoré par git)
cp .env.example .env.local
# puis éditer .env.local : VITE_OWM_API_KEY=votre_cle

npm run dev        # serveur de développement
npm run build      # vérification des types + build de production dans dist/
npm run preview    # prévisualiser le build
npm run typecheck  # vérification des types TypeScript
npm run lint       # Biome : lint + formatage + imports (sans modifier)
npm run format     # Biome : formater les fichiers
npm run check      # Biome : corriger automatiquement (lint, formatage, imports)
```

Sans clé, l'application s'affiche quand même avec un bandeau explicatif.

### Déploiement (GitHub Pages)

Le workflow `.github/workflows/static.yml` installe les dépendances (`npm ci --ignore-scripts`), lance `npm audit --audit-level=high`, `npm run lint` et `npm run typecheck`, construit le site et publie uniquement `dist/`.

1. Dans le dépôt GitHub : **Settings → Secrets and variables → Actions → New repository secret**
2. Nom : `VITE_OWM_API_KEY`, valeur : votre clé OpenWeatherMap
3. **Settings → Pages → Source : GitHub Actions**

---

## 🔒 Sécurité

- **Clé API visible dans le bundle.** Toute variable `VITE_*` est intégrée au JavaScript publié : la clé `VITE_OWM_API_KEY` reste lisible par n'importe quel visiteur. C'est inévitable sans proxy côté serveur.
- **Restreindre la clé.** OpenWeatherMap ne propose pas de quotas par clé : utilisez une clé dédiée à ce site, sur un compte gratuit sans moyen de paiement, et surveillez son usage.
- **Rotation.** En cas d'abus (ou pour l'ancienne clé écrite en clair, toujours présente dans l'historique git), générez une nouvelle clé sur [openweathermap.org](https://home.openweathermap.org/api_keys), supprimez l'ancienne, puis mettez à jour `.env.local` et le secret GitHub.
- **Secret GitHub.** En CI, la clé provient uniquement du secret `VITE_OWM_API_KEY` (jamais commitée ; `.env.local` est ignoré par git, seul `.env.example` est versionné).
- **CSP stricte** injectée dans le build de production (`default-src 'none'`, `script-src 'self'`, polices auto-hébergées, seule connexion autorisée : `api.openweathermap.org`).
- **Aucun `innerHTML` / `dangerouslySetInnerHTML`** (interdit par Biome) ; saisie de recherche et réponses de l'API validées par des schémas Zod.
- **CI durcie** : actions épinglées par SHA, `npm ci --ignore-scripts`, `npm audit`, mises à jour via Dependabot.
- Plus aucun système de comptes : les anciennes données `localStorage` (utilisateurs, mots de passe, newsletter) sont supprimées au chargement.

---

## ⌨️ Raccourcis clavier

| Raccourci            | Action                                        |
| -------------------- | --------------------------------------------- |
| `Ctrl + K` / `⌘ + K` | Rechercher une ville                          |
| `↑` / `↓`, `Entrée`  | Naviguer et choisir une suggestion            |
| `Échap`              | Fermer les suggestions / effacer la recherche |
| `Ctrl + Maj + R`     | Actualiser les données météo                  |

---

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -m 'Ajout fonctionnalité'`)
4. Push (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

---

## 📧 Contact

- **Auteur** : FOFANA ISSOUF
- **GitHub** : [issouf14-DEV](https://github.com/issouf14-DEV)

---

## 📝 Licence

Projet sous licence MIT.

---

<p align="center">
  Développé en Côte d'Ivoire 🇨🇮 par FOFANA ISSOUF
</p>
