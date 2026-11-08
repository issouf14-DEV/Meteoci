import { type LucideIcon, MessageCircle } from "lucide-react";

import { Facebook, Github, Instagram, Twitter, Youtube } from "@/lib/brand-icons";

export const SITE = {
  name: "Météo CI",
  author: "FOFANA ISSOUF",
  /** Contact public : profil GitHub (aucune adresse e-mail personnelle exposée). */
  profile: "https://github.com/issouf14-DEV",
  repository: "https://github.com/issouf14-DEV/Meteoci",
  /** Rafraîchissement automatique des données. */
  refreshIntervalMs: 10 * 60 * 1000,
} as const;

export interface SocialLink {
  label: string;
  href: string;
  Icon: LucideIcon;
}

/**
 * Réseaux sociaux : renseignez l'URL pour afficher l'icône dans le pied de
 * page. Les entrées sans URL ne sont pas affichées (pas de liens morts).
 */
const SOCIAL_CANDIDATES: SocialLink[] = [
  { label: "GitHub", href: SITE.repository, Icon: Github },
  { label: "Facebook", href: "", Icon: Facebook },
  { label: "Twitter", href: "", Icon: Twitter },
  { label: "Instagram", href: "", Icon: Instagram },
  { label: "YouTube", href: "", Icon: Youtube },
  { label: "WhatsApp", href: "", Icon: MessageCircle },
];

export const SOCIAL_LINKS = SOCIAL_CANDIDATES.filter((link) => link.href.length > 0);
