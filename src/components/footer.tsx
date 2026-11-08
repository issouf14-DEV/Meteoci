import { CloudSun, ExternalLink } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { SITE, SOCIAL_LINKS } from "@/lib/site";

const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" } as const;

const linkClass =
  "inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-8 border-t bg-card/60">
      <div className="container grid gap-10 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white">
              <CloudSun aria-hidden="true" className="size-5" />
            </span>
            <span className="font-heading text-xl font-bold">
              Météo <span className="text-accent">CI</span>
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Consultez les prévisions météorologiques des principales villes de Côte d'Ivoire en
            temps réel. Données mises à jour régulièrement.
          </p>
        </div>

        <nav aria-labelledby="footer-liens">
          <h2 id="footer-liens" className="font-heading text-sm font-semibold uppercase tracking-wider">
            Liens utiles
          </h2>
          <ul className="mt-4 space-y-2.5">
            <li>
              <a href="#accueil" className={linkClass}>
                Accueil
              </a>
            </li>
            <li>
              <a href="#villes" className={linkClass}>
                Prévisions par ville
              </a>
            </li>
            <li>
              <a href="https://openweathermap.org/" className={linkClass} {...EXTERNAL}>
                OpenWeatherMap
                <ExternalLink aria-hidden="true" className="size-3.5" />
                <span className="sr-only">(nouvel onglet)</span>
              </a>
            </li>
            <li>
              <a href={SITE.repository} className={linkClass} {...EXTERNAL}>
                Code source
                <ExternalLink aria-hidden="true" className="size-3.5" />
                <span className="sr-only">(nouvel onglet)</span>
              </a>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider">Suivez-nous</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {SOCIAL_LINKS.map(({ label, href, Icon }) => {
              const external = href.startsWith("http");
              return (
                <li key={label}>
                  <a
                    href={href}
                    aria-label={external ? `${label} (nouvel onglet)` : label}
                    title={label}
                    className="grid size-10 place-items-center rounded-full border bg-background text-muted-foreground transition-[transform,color] duration-200 ease-out hover:-translate-y-0.5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background active:scale-95"
                    {...(external ? EXTERNAL : {})}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <Separator />

      <div className="container flex flex-col items-center justify-between gap-2 py-6 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
        <p>© {year} Météo CI — Tous droits réservés.</p>
        <p>
          Développé par <span className="font-medium text-foreground">{SITE.author}</span>
          <span aria-hidden="true"> · </span>
          Données{" "}
          <a href="https://openweathermap.org/" className="underline-offset-4 hover:underline" {...EXTERNAL}>
            OpenWeatherMap
          </a>
        </p>
      </div>
    </footer>
  );
}
