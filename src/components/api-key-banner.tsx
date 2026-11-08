import { KeyRound } from "lucide-react";

export function ApiKeyBanner() {
  return (
    <div className="container pt-6">
      <div
        role="alert"
        className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm animate-in fade-in-0 slide-in-from-top-2"
      >
        <KeyRound aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div>
          <p className="font-semibold">Clé API OpenWeatherMap manquante</p>
          <p className="mt-1 text-muted-foreground">
            Ajoutez{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">VITE_OWM_API_KEY</code>{" "}
            dans le fichier{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">.env.local</code> (ou
            dans les secrets GitHub pour le déploiement), puis relancez l'application.
          </p>
        </div>
      </div>
    </div>
  );
}
