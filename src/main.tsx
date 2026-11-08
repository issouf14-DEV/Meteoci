import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Police auto-hébergée (pas de CDN tiers) : famille "Inter Variable".
import "@fontsource-variable/inter";

import App from "@/App";
import { ThemeProvider } from "@/components/theme-provider";
import { purgeLegacyStorage } from "@/lib/storage";
import "@/index.css";

// Supprime les comptes / mots de passe / e-mails stockés par l'ancienne version.
purgeLegacyStorage();

const container = document.getElementById("root");
if (!container) throw new Error("Élément #root introuvable.");

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
