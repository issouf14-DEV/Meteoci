import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "@/App";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { purgeLegacyStorage } from "@/lib/storage";
import "@/index.css";

// Supprime les comptes / mots de passe / e-mails stockés par l'ancienne version.
purgeLegacyStorage();

const container = document.getElementById("root");
if (!container) throw new Error("Élément #root introuvable.");

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider delayDuration={300}>
        <App />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
);
