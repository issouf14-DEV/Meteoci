import { KeyRound } from "lucide-react";

/** Alerte « clé API manquante », au style des notifications de l'original. */
export function ApiKeyBanner() {
  return (
    <div role="alert" className="notice">
      <KeyRound aria-hidden="true" className="notice__icon" />
      <div>
        <p className="notice__title">Clé API OpenWeatherMap manquante</p>
        <p className="notice__text">
          Ajoutez <code>VITE_OWM_API_KEY</code> dans le fichier <code>.env.local</code> (ou dans les
          secrets GitHub pour le déploiement), puis relancez l'application.
        </p>
      </div>
    </div>
  );
}
