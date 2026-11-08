import { CloudSun, ExternalLink, House, MapPin, Sun } from "lucide-react";

import { Github } from "@/lib/brand-icons";
import { SITE, SOCIAL_LINKS } from "@/lib/site";

const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" } as const;

/** Pied de page de l'original : logo + description, liens utiles, suivez-nous. */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__grid">
        <div>
          <p className="footer__brand">
            <CloudSun aria-hidden="true" />
            <span>Météo CI</span>
          </p>
          <p className="footer__description">
            Consultez les prévisions météorologiques des principales villes de Côte d'Ivoire en
            temps réel. Données fiables et mises à jour régulièrement.
          </p>
        </div>

        <nav aria-labelledby="footer-liens">
          <h2 id="footer-liens" className="footer__section-title">
            Liens utiles
          </h2>
          <ul className="footer__nav">
            <li className="footer__nav-item">
              <a href="#accueil" className="footer__nav-link">
                <House aria-hidden="true" />
                Accueil
              </a>
            </li>
            <li className="footer__nav-item">
              <a href="#villes" className="footer__nav-link">
                <MapPin aria-hidden="true" />
                Prévisions par ville
              </a>
            </li>
            <li className="footer__nav-item">
              <a href="https://openweathermap.org/" className="footer__nav-link" {...EXTERNAL}>
                <Sun aria-hidden="true" />
                OpenWeatherMap
                <ExternalLink aria-hidden="true" className="opacity-70" />
                <span className="sr-only">(nouvel onglet)</span>
              </a>
            </li>
            <li className="footer__nav-item">
              <a href={SITE.repository} className="footer__nav-link" {...EXTERNAL}>
                <Github aria-hidden="true" />
                Code source
                <ExternalLink aria-hidden="true" className="opacity-70" />
                <span className="sr-only">(nouvel onglet)</span>
              </a>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="footer__section-title">Suivez-nous</h2>
          <ul className="footer__social">
            {SOCIAL_LINKS.map(({ label, href, Icon }) => {
              const external = href.startsWith("http");
              return (
                <li key={label}>
                  <a
                    href={href}
                    aria-label={external ? `${label} (nouvel onglet)` : label}
                    title={label}
                    className="footer__social-link"
                    {...(external ? EXTERNAL : {})}
                  >
                    <Icon aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="footer__bottom">
        <p>© {year} Météo CI — Tous droits réservés.</p>
        <p className="footer__credits">
          <span>Développé par {SITE.author}</span>
          <span aria-hidden="true" className="footer__dot">
            •
          </span>
          <span>
            Données{" "}
            <a href="https://openweathermap.org/" {...EXTERNAL}>
              OpenWeatherMap
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          </span>
        </p>
      </div>
    </footer>
  );
}
