import { CloudOff } from "lucide-react";

/** Alerte « service météo indisponible », au style des notifications de l'original. */
export function ServiceUnavailableBanner() {
  return (
    <div role="alert" className="notice">
      <CloudOff aria-hidden="true" className="notice__icon" />
      <div>
        <p className="notice__title">Service météo indisponible</p>
        <p className="notice__text">
          Le serveur météo n'est pas configuré pour le moment : les prévisions ne peuvent pas être
          affichées. Réessayez plus tard.
        </p>
      </div>
    </div>
  );
}
