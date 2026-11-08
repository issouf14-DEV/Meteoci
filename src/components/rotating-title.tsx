import { memo, useEffect, useState } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

const MESSAGES = [
  "Bienvenue sur Météo CI",
  "La météo de Côte d'Ivoire",
  "Prévisions en temps réel",
] as const;

// Vitesses de la version d'origine (CONFIG.ANIMATION).
const TYPE_MS = 100;
const DELETE_MS = 60;
const HOLD_MS = 1000;
const NEXT_MS = 300;

/** Titre animé (effet machine à écrire + curseur clignotant), rendu en texte React. */
function RotatingTitleImpl() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const word = MESSAGES[index];

  useEffect(() => {
    // « Réduire les animations » : un seul message fixe, aucun changement (WCAG 2.2.2).
    if (reduced) return;

    let delay: number;
    let step: () => void;
    if (!deleting && length < word.length) {
      delay = TYPE_MS;
      step = () => setLength((l) => l + 1);
    } else if (!deleting) {
      delay = HOLD_MS;
      step = () => setDeleting(true);
    } else if (length > 0) {
      delay = DELETE_MS;
      step = () => setLength((l) => l - 1);
    } else {
      delay = NEXT_MS;
      step = () => {
        setDeleting(false);
        setIndex((i) => (i + 1) % MESSAGES.length);
      };
    }
    const id = window.setTimeout(step, delay);
    return () => window.clearTimeout(id);
  }, [reduced, deleting, length, word]);

  return (
    <h1 className="hero__title">
      <span className="sr-only">Météo CI — la météo de Côte d'Ivoire</span>
      <span aria-hidden="true">
        {reduced ? word : word.slice(0, length)}
        {!reduced && <span className="blinking-cursor">|</span>}
      </span>
    </h1>
  );
}

/** Isolé et mémoïsé : chaque lettre ne re-rend que ce titre. */
export const RotatingTitle = memo(RotatingTitleImpl);
