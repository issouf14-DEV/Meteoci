import { useEffect, useState } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

const MESSAGES = [
  "Bienvenue sur Météo CI",
  "La météo de Côte d'Ivoire",
  "Prévisions en temps réel",
] as const;

const TYPE_MS = 70;
const DELETE_MS = 35;
const HOLD_MS = 2000;
const NEXT_MS = 300;
const FADE_INTERVAL_MS = 4000;

/** Titre animé (effet machine à écrire), rendu en texte React. */
export function RotatingTitle() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const word = MESSAGES[index];

  useEffect(() => {
    if (reduced) {
      const id = window.setInterval(
        () => setIndex((i) => (i + 1) % MESSAGES.length),
        FADE_INTERVAL_MS,
      );
      return () => window.clearInterval(id);
    }

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
    <h1 className="flex min-h-[2.5em] items-center justify-center font-heading text-4xl font-bold leading-tight tracking-tight sm:min-h-[1.3em] sm:leading-none sm:text-5xl lg:text-6xl">
      <span className="sr-only">Météo CI — la météo de Côte d'Ivoire</span>
      {reduced ? (
        <span
          key={index}
          aria-hidden="true"
          className="animate-in fade-in-0 animation-duration-600"
        >
          {word}
        </span>
      ) : (
        <span aria-hidden="true" className="text-balance">
          {word.slice(0, length)}
          <span className="ml-1 inline-block h-[0.9em] w-[3px] translate-y-[0.08em] rounded-full bg-accent align-baseline animate-blink" />
        </span>
      )}
    </h1>
  );
}
