# Météo CI

Application web de prévisions météo pour les villes de Côte d'Ivoire : conditions actuelles et prévisions jusqu'à 5 jours, dans une interface responsive et accessible.

- Démo GitHub Pages : <https://issouf14-dev.github.io/Meteoci/>
- Démo Vercel : <https://meteoci.vercel.app>

![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![Vite 8](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)

---

## Fonctionnalités

- **15 villes ivoiriennes** : Abidjan, Bouaké, Yamoussoukro, Korhogo, etc.
- **Détails** : température, maximum/minimum, ressenti, humidité, vent, probabilité de pluie.
- **Recherche** avec suggestions navigables au clavier. Une ville internationale peut être ajoutée (10 villes ajoutées au maximum) et retirée ensuite.
- **Sélecteur de date et d'heure** : prévision la plus proche du créneau choisi, sur 5 jours, exprimée dans le fuseau horaire local de la ville.
- **Thème clair / sombre** mémorisé, avec détection de la préférence système.
- **Actualisation** automatique toutes les 10 minutes, ou manuelle (touche `R`, au plus une fois par minute).
- **Vidéo d'accueil** optimisée (environ 380 ko) avec image d'aperçu (poster), mise en pause hors écran et avec `prefers-reduced-motion`.
- Responsive (mobile, tablette, desktop) et notifications accessibles (toasts).
- Aucune authentification, aucune newsletter, aucune donnée personnelle collectée.

---

## Stack technique

| Domaine        | Technologies                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| Framework      | [React 19](https://react.dev/), [TypeScript 5.9](https://www.typescriptlang.org/) (mode strict)                |
| Build          | [Vite 8](https://vite.dev/) (Rolldown)                                                                         |
| Styles         | [Tailwind CSS 4](https://tailwindcss.com/) (CSS-first, `@tailwindcss/vite`), `tw-animate-css`                  |
| Composants     | [shadcn/ui](https://ui.shadcn.com/) (Radix UI Popover), [react-day-picker 9](https://daypicker.dev/) + locale `fr` de `date-fns` pour le sélecteur de date et d'heure |
| Icônes / toasts | [lucide-react](https://lucide.dev/), [Sonner](https://sonner.emilkowal.ski/)                                  |
| Validation     | [Zod 4](https://zod.dev/) via `zod/mini`, mode `jitless` (compatible avec la CSP)                              |
| Qualité        | [Biome 2](https://biomejs.dev/) (lint + formatage)                                                             |
| Polices        | Auto-hébergée : `@fontsource-variable/inter`                                                                   |
| Données        | [OpenWeatherMap](https://openweathermap.org/api)                                                               |

---

## Démarrage

### Prérequis

- Node.js `^20.19 || >=22.12` et npm
- Une clé API gratuite [OpenWeatherMap](https://home.openweathermap.org/api_keys)

### Installation

```bash
git clone https://github.com/issouf14-DEV/Meteoci.git
cd Meteoci
npm install

# Configurer la clé API (fichier ignoré par git)
cp .env.example .env.local
# puis renseigner dans .env.local : VITE_OWM_API_KEY=votre_cle

npm run dev
```

Sans clé, l'application s'affiche avec un bandeau explicatif.

### Scripts

| Commande            | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| `npm run dev`       | Serveur de développement                                     |
| `npm run build`     | Vérification des types puis build de production dans `dist/` |
| `npm run preview`   | Prévisualiser le build                                       |
| `npm run lint`      | Biome : lint, formatage et imports (sans modification)       |
| `npm run format`    | Biome : formater les fichiers                                |
| `npm run check`     | Biome : corriger automatiquement                             |
| `npm run typecheck` | Vérification des types TypeScript                            |

### Raccourcis clavier

| Raccourci            | Action                                        |
| -------------------- | --------------------------------------------- |
| `Ctrl + K` / `⌘ + K` | Rechercher une ville                          |
| `↑` / `↓`, `Entrée`  | Naviguer et choisir une suggestion            |
| `Échap`              | Fermer les suggestions / effacer la recherche |
| `R`                  | Actualiser les données (hors champ de saisie) |

---

## Déploiement

### GitHub Pages

Le workflow `.github/workflows/static.yml` s'exécute à chaque push sur `main` : `npm ci --ignore-scripts`, `npm audit`, lint, typecheck, build, puis publication de `./dist`.

1. **Settings → Secrets and variables → Actions** : créer le secret `VITE_OWM_API_KEY`.
2. **Settings → Pages → Source** : GitHub Actions.

### Vercel

`vercel.json` configure le build Vite (`npm run build`, sortie `dist`), les en-têtes de sécurité HTTP et le cache des ressources statiques. Ajouter la variable d'environnement `VITE_OWM_API_KEY` dans le projet Vercel avec le type **Config** : les variables `VITE_*` sont publiques par nature (intégrées au bundle), elles ne doivent pas être stockées comme secrets.

---

## Sécurité

- **Clé API visible dans le bundle.** Toute variable `VITE_*` est intégrée au JavaScript publié : la clé reste lisible par n'importe quel visiteur, faute de proxy côté serveur. Utilisez une clé dédiée, issue d'un compte gratuit sans moyen de paiement, et surveillez son usage.
- **Rotation.** En cas d'abus (ou pour une ancienne clé présente dans l'historique git), générez une nouvelle clé sur [openweathermap.org](https://home.openweathermap.org/api_keys), supprimez l'ancienne, puis mettez à jour `.env.local`, le secret GitHub et la variable Vercel.
- **Secrets.** `.env.local` est ignoré par git ; seul `.env.example` est versionné. En CI, la clé provient uniquement du secret `VITE_OWM_API_KEY`.
- **CSP stricte** : `default-src 'none'`, `script-src 'self'`, polices auto-hébergées, seule connexion autorisée vers `api.openweathermap.org`. Elle est injectée dans le build (balise meta) et envoyée en en-tête HTTP sur Vercel. Zod est configuré en `jitless` pour éviter `eval` / `new Function`.
- **En-têtes HTTP (Vercel)** : `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy`.
- **Validation et XSS** : réponses de l'API, saisie de recherche et données `localStorage` validées par Zod ; aucun `innerHTML` ni `dangerouslySetInnerHTML`.
- **Chaîne d'approvisionnement** : actions GitHub épinglées par SHA de commit, `npm ci --ignore-scripts`, `npm audit`, mises à jour hebdomadaires via Dependabot (npm et GitHub Actions).

---

## Structure du projet

```
├── index.html                  # Point d'entrée Vite
├── public/
│   ├── favicon.svg
│   ├── theme-init.js           # Applique le thème avant le rendu (pas de flash)
│   └── video/                  # v1.mp4 (vidéo d'accueil) et poster.webp
├── src/
│   ├── main.tsx                # Montage React
│   ├── App.tsx                 # Orchestration : recherche, date/heure, actualisation
│   ├── index.css               # Tailwind 4 : thème, palette, animations
│   ├── styles/legacy.css       # Styles hérités
│   ├── components/
│   │   ├── api-key-banner.tsx, city-card.tsx, city-grid.tsx,
│   │   ├── date-time-picker.tsx, footer.tsx, header.tsx, hero.tsx,
│   │   ├── rotating-title.tsx, search-bar.tsx, theme-provider.tsx
│   │   └── ui/                 # shadcn/ui : badge, button, calendar, card, input,
│   │                           #   popover, separator, skeleton, sonner
│   ├── hooks/                  # use-reduced-motion, use-weather, use-weather-activity
│   └── lib/                    # weather, schemas, zod, env, cities, date, storage,
│                               #   validation, site, brand-icons, weather-icons, utils
├── biome.json                  # Lint + formatage
├── vercel.json                 # Build, en-têtes de sécurité, cache
├── vite.config.ts              # Alias @, Tailwind, base relative, CSP de production
└── .github/                    # Workflow Pages et Dependabot
```

---

## Contribution

1. Forker le projet
2. Créer une branche (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Valider les changements (`npm run check && npm run typecheck`)
4. Pousser la branche et ouvrir une Pull Request

---

## Auteur

**FOFANA ISSOUF** : [github.com/issouf14-DEV](https://github.com/issouf14-DEV)  
Dépôt : <https://github.com/issouf14-DEV/Meteoci>
