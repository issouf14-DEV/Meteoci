import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function getInitial(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/** Vrai si l'utilisateur a demandé à réduire les animations. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(getInitial);

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia(QUERY);
    const onChange = () => setReduced(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
