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

| Domaine         | Technologies                                                                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | [React 19](https://react.dev/), [TypeScript 5.9](https://www.typescriptlang.org/) (mode strict)                                                                       |
| Build           | [Vite 8](https://vite.dev/) (Rolldown)                                                                                                                                |
| Styles          | [Tailwind CSS 4](https://tailwindcss.com/) (CSS-first, `@tailwindcss/vite`), `tw-animate-css`                                                                         |
| Composants      | [shadcn/ui](https://ui.shadcn.com/) (Radix UI Popover), [react-day-picker 9](https://daypicker.dev/) + locale `fr` de `date-fns` pour le sélecteur de date et d'heure |
| Icônes / toasts | [lucide-react](https://lucide.dev/), [Sonner](https://sonner.emilkowal.ski/)                                                                                          |
| Validation      | [Zod 4](https://zod.dev/) via `zod/mini`, mode `jitless` (compatible avec la CSP)                                                                                     |
| Qualité         | [Biome 2](https://biomejs.dev/) (lint + formatage)                                                                                                                    |
| Polices         | Auto-hébergée : `@fontsource-variable/inter`                                                                                                                          |
| Données         | [OpenWeatherMap](https://openweathermap.org/api), via un proxy serveur (Vercel Function `api/weather.ts`)                                                             |

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
# puis renseigner dans .env.local : OWM_API_KEY=votre_cle

npm run dev
```

La clé n'est lue que côté serveur : en développement (`npm run dev`, `npm run preview`), Vite sert lui-même `/api/weather` avec le même gestionnaire que la Vercel Function et lit `OWM_API_KEY` dans `.env.local`. Elle n'est jamais incluse dans le JavaScript envoyé au navigateur.

Sans clé côté serveur, le proxy répond `503 { "error": "NO_KEY" }` et l'application affiche un bandeau « Service météo indisponible ».

### Variables d'environnement

| Variable                | Où                          | Rôle                                                                                                  |
| ----------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------- |
| `OWM_API_KEY`           | `.env.local`, projet Vercel | Clé OpenWeatherMap, **serveur uniquement** (sans préfixe `VITE_`, jamais dans le bundle)              |
| `VITE_WEATHER_API_BASE` | Optionnelle (build)         | Adresse du proxy appelée par le navigateur : URL `https` ou chemin relatif. Par défaut `/api/weather` |

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

Les deux sites utilisent le même proxy météo, hébergé sur Vercel : `https://meteoci.vercel.app/api/weather`.

### Vercel (site + proxy)

`vercel.json` configure le build Vite (`npm run build`, sortie `dist`), les en-têtes de sécurité HTTP et le cache des ressources statiques. Le dossier `api/` est déployé automatiquement en Vercel Function (`api/weather.ts`, runtime Node.js).

1. **Project → Settings → Environment Variables** : ajouter `OWM_API_KEY` (environnements Production et Preview), en la marquant **Sensitive** : c'est désormais un vrai secret, lu uniquement par la fonction et jamais par le navigateur.
2. Supprimer l'ancienne variable `VITE_OWM_API_KEY` si elle existe.
3. Redéployer pour que la fonction prenne en compte la variable.

Vérification : `https://meteoci.vercel.app/api/weather?endpoint=weather&lat=5.36&lon=-4.01` doit renvoyer du JSON (ou `503 NO_KEY` si la variable manque).

### GitHub Pages

Le workflow `.github/workflows/static.yml` s'exécute à chaque push sur `main` : `npm ci --ignore-scripts`, `npm audit`, lint, typecheck, build, puis publication de `./dist`. Le build définit `VITE_WEATHER_API_BASE=https://meteoci.vercel.app/api/weather` : le site Pages appelle le proxy Vercel (requêtes CORS autorisées pour `https://issouf14-dev.github.io`).

1. **Settings → Pages → Source** : GitHub Actions.
2. Aucun secret n'est nécessaire : l'ancien secret `VITE_OWM_API_KEY` peut être supprimé (**Settings → Secrets and variables → Actions**).

---

## Sécurité

- **Clé API côté serveur uniquement.** Le navigateur n'appelle jamais OpenWeatherMap directement : il interroge le proxy `api/weather.ts` (Vercel Function), qui ajoute la clé `OWM_API_KEY` lue dans l'environnement du serveur. Aucune clé n'est présente dans le bundle publié (ni sur Vercel, ni sur GitHub Pages).
- **Proxy restreint** :
  - liste blanche stricte des paramètres : `endpoint` (`weather` ou `forecast`) et un seul lieu (`lat` + `lon` bornés, `id` numérique, ou `q` validé avec la même règle que la recherche, éventuellement suivi d'un code pays `,CC`) ; tout autre paramètre est refusé (`400`) et `units=metric`, `lang=fr` sont imposés ;
  - timeout de la requête amont (8 s), erreurs converties en JSON `{ "error": ... }` (`400`, `403`, `404`, `429`, `502`, `503`, `504`) sans jamais renvoyer la clé ni l'URL amont ;
  - CORS limité à `https://meteoci.vercel.app`, `https://issouf14-dev.github.io`, aux déploiements de prévisualisation Vercel du projet et à `localhost` (ports 5173 et 4173) ; une autre origine reçoit `403` sans en-tête CORS ;
  - cache CDN des réponses réussies (`s-maxage=300, stale-while-revalidate=600`, `Vary: Origin`) : les requêtes répétées n'atteignent pas OpenWeatherMap ;
  - limitation de débit en mémoire (60 requêtes par minute et par IP). Elle est **best effort** : les compteurs sont propres à chaque instance de la fonction et réinitialisés à son recyclage ; le cache CDN et les quotas d'OpenWeatherMap restent les vraies protections.
- **Rotation.** L'ancienne clé a été publiée dans des bundles (variable `VITE_*`) : générez une nouvelle clé sur [openweathermap.org](https://home.openweathermap.org/api_keys), supprimez l'ancienne, puis mettez à jour `.env.local` et la variable Vercel `OWM_API_KEY`.
- **Secrets.** `.env.local` est ignoré par git ; seul `.env.example` est versionné. La CI GitHub Pages n'a besoin d'aucun secret.
- **CSP stricte** : `default-src 'none'`, `script-src 'self'`, polices auto-hébergées, connexions limitées à `'self'` et `https://meteoci.vercel.app` (proxy). Elle est injectée dans le build (balise meta) et envoyée en en-tête HTTP sur Vercel. Zod est configuré en `jitless` pour éviter `eval` / `new Function`.
- **En-têtes HTTP (Vercel)** : `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy` ; pour `/api/*` : `nosniff`, `X-Frame-Options: DENY`, CSP `default-src 'none'`, `X-Robots-Tag: noindex`.
- **Validation et XSS** : réponses de l'API, saisie de recherche et données `localStorage` validées par Zod ; aucun `innerHTML` ni `dangerouslySetInnerHTML`.
- **Chaîne d'approvisionnement** : actions GitHub épinglées par SHA de commit, `npm ci --ignore-scripts`, `npm audit`, mises à jour hebdomadaires via Dependabot (npm et GitHub Actions).

---

## Structure du projet

```
├── index.html                  # Point d'entrée Vite
├── api/
│   └── weather.ts              # Vercel Function : proxy OpenWeatherMap (clé côté serveur)
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
│   ├── hooks/                  # use-reduced-motion, use-weather, use-weather-activity,
│   │                           #   use-weather-service
│   └── lib/                    # weather, schemas, zod, env, cities, date, storage,
│                               #   validation, site, brand-icons, weather-icons, utils
├── biome.json                  # Lint + formatage
├── vercel.json                 # Build, en-têtes de sécurité, cache
├── vite.config.ts              # Alias @, Tailwind, base relative, CSP, proxy météo local
├── tsconfig.api.json           # Vérification des types de api/
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
