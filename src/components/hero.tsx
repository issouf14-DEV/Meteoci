import { memo, useEffect, useRef, useState } from "react";

import { RotatingTitle } from "@/components/rotating-title";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const VIDEO_SRC = `${import.meta.env.BASE_URL}video/v1.mp4`;

/** Mode « économie de données » du navigateur (Chrome/Android). */
function prefersSaveData(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

/** Bandeau d'accueil de l'original : vidéo, voile sombre, titre animé, « Côte d'Ivoire ». */
function HeroImpl() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const [saveData] = useState(prefersSaveData);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === "undefined" || !document.hidden,
  );
  const showVideo = !failed && !saveData;
  // « Réduire les animations » : vidéo arrêtée (pas de bouton lecture/pause à l'écran).
  const paused = reduced;

  // Pas de décodage vidéo hors écran.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry?.isIntersecting ?? true),
      { threshold: 0 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Ni quand l'onglet est caché.
  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const shouldPlay = showVideo && !paused && onScreen && pageVisible;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    if (shouldPlay) {
      video.play().catch(() => {
        /* lecture automatique bloquée : on garde le fond dégradé */
      });
    } else {
      video.pause();
    }
  }, [shouldPlay]);

  return (
    <section ref={sectionRef} id="accueil" className="hero">
      {showVideo && (
        <video
          ref={videoRef}
          className="hero__video"
          style={{ opacity: ready ? 1 : 0 }}
          muted
          loop
          playsInline
          preload="metadata"
          poster="./video/poster.webp"
          aria-hidden="true"
          tabIndex={-1}
          disablePictureInPicture
          onLoadedData={() => setReady(true)}
          onPlaying={() => setReady(true)}
          onError={() => setFailed(true)}
        >
          <source src={VIDEO_SRC} type="video/mp4" onError={() => setFailed(true)} />
        </video>
      )}
      <div aria-hidden="true" className="hero__overlay" />

      <div className="hero__content">
        <RotatingTitle />
        <p className="hero__subtitle">Côte d'Ivoire</p>
      </div>
    </section>
  );
}

/** Mémoïsé : ne se re-rend pas à chaque actualisation des données. */
export const Hero = memo(HeroImpl);
