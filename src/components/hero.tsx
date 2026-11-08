import { ArrowDown, Clock, MapPin, Pause, Play, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { RotatingTitle } from "@/components/rotating-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

const VIDEO_SRC = `${import.meta.env.BASE_URL}video/v1.mp4`;

/** Mode « économie de données » du navigateur (Chrome/Android). */
function prefersSaveData(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

export function Hero({ cityCount }: { cityCount: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const [saveData] = useState(prefersSaveData);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === "undefined" || !document.hidden,
  );
  const showVideo = !failed && !saveData;
  const paused = userPaused ?? reduced;

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
    <section ref={sectionRef} id="accueil" className="relative isolate overflow-hidden">
      {/* Fond de repli et « poster » (dégradé aux couleurs de la marque) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-linear-to-br/srgb from-blue-900 via-primary to-secondary"
      />
      {showVideo && (
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-300 ease-out",
            ready ? "opacity-100" : "opacity-0",
          )}
          muted
          loop
          playsInline
          preload="metadata"
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
      {/* Voile sombre uniforme derrière le texte (blanc ≥ 5:1 même sur une image claire) */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-slate-950/55" />
      {/* Fondu vers le fond de page, dans une bande sous le contenu */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-16 bg-linear-to-b/srgb from-transparent to-background"
      />

      <div className="container flex min-h-[68svh] flex-col items-center justify-center pt-20 pb-24 text-center text-white sm:min-h-[72svh]">
        <Badge
          variant="glass"
          className="mb-6 px-3 py-1 text-sm animate-in fade-in-0 slide-in-from-bottom-2 animation-duration-300 ease-out"
        >
          <MapPin aria-hidden="true" />
          Côte d'Ivoire
        </Badge>

        <div className="w-full max-w-4xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]">
          <RotatingTitle />
        </div>

        <p className="mt-5 max-w-2xl text-pretty text-base text-white/90 animate-in fade-in-0 slide-in-from-bottom-3 [--tw-animation-delay:100ms] animation-duration-300 ease-out fill-mode-backwards sm:text-lg">
          Prévisions météorologiques en temps réel pour les principales villes ivoiriennes, jusqu'à
          5 jours à l'avance.
        </p>

        <ul className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm animate-in fade-in-0 [--tw-animation-delay:200ms] animation-duration-300 ease-out fill-mode-backwards">
          <li>
            <Badge variant="glass" className="px-3 py-1">
              <MapPin aria-hidden="true" /> {cityCount} villes
            </Badge>
          </li>
          <li>
            <Badge variant="glass" className="px-3 py-1">
              <Clock aria-hidden="true" /> Prévisions sur 5 jours
            </Badge>
          </li>
          <li>
            <Badge variant="glass" className="px-3 py-1">
              <RefreshCw aria-hidden="true" /> Mise à jour toutes les 10 min
            </Badge>
          </li>
        </ul>

        <Button
          asChild
          size="lg"
          variant="accent"
          className="mt-9 rounded-full shadow-lg shadow-black/20 animate-in fade-in-0 zoom-in-95 [--tw-animation-delay:300ms] animation-duration-300 ease-out fill-mode-backwards hover:-translate-y-0.5"
        >
          <a href="#villes">
            Voir les prévisions
            <ArrowDown aria-hidden="true" />
          </a>
        </Button>
      </div>

      {showVideo && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute right-4 bottom-20 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white"
          aria-label={
            paused ? "Lire la vidéo d'arrière-plan" : "Mettre en pause la vidéo d'arrière-plan"
          }
          onClick={() => setUserPaused(!paused)}
        >
          {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        </Button>
      )}
    </section>
  );
}
