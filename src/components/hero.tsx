import { useEffect, useRef, useState } from "react";
import { ArrowDown, Clock, MapPin, Pause, Play, RefreshCw } from "lucide-react";

import { RotatingTitle } from "@/components/rotating-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

const VIDEO_SRC = `${import.meta.env.BASE_URL}video/v1.mp4`;

export function Hero({ cityCount }: { cityCount: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const paused = userPaused ?? reduced;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    if (paused) {
      video.pause();
    } else {
      video.play().catch(() => {
        /* lecture automatique bloquée : on garde le fond dégradé */
      });
    }
  }, [paused]);

  return (
    <section id="accueil" className="relative isolate overflow-hidden">
      {/* Fond de repli (dégradé aux couleurs de la marque) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-gradient-to-br from-blue-900 via-primary to-secondary"
      />
      {!failed && (
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-700 ease-out",
            ready ? "opacity-100" : "opacity-0",
          )}
          muted
          loop
          playsInline
          autoPlay={!paused}
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
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/60 via-slate-950/40 to-background"
      />

      <div className="container flex min-h-[68vh] flex-col items-center justify-center py-20 text-center text-white sm:min-h-[72vh]">
        <Badge
          variant="glass"
          className="mb-6 px-3 py-1 text-sm animate-in fade-in-0 slide-in-from-bottom-2 [animation-duration:600ms]"
        >
          <MapPin aria-hidden="true" />
          Côte d'Ivoire
        </Badge>

        <div className="w-full max-w-4xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]">
          <RotatingTitle />
        </div>

        <p className="mt-5 max-w-2xl text-pretty text-base text-white/85 animate-in fade-in-0 slide-in-from-bottom-3 [animation-delay:150ms] [animation-duration:700ms] fill-mode-backwards sm:text-lg">
          Prévisions météorologiques en temps réel pour les principales villes ivoiriennes,
          jusqu'à 5 jours à l'avance.
        </p>

        <ul className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm animate-in fade-in-0 [animation-delay:300ms] [animation-duration:700ms] fill-mode-backwards">
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
          className="mt-9 rounded-full shadow-lg shadow-black/20 animate-in fade-in-0 zoom-in-95 [animation-delay:450ms] [animation-duration:600ms] fill-mode-backwards hover:-translate-y-0.5"
        >
          <a href="#villes">
            Voir les prévisions
            <ArrowDown aria-hidden="true" />
          </a>
        </Button>
      </div>

      {!failed && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute bottom-4 right-4 rounded-full bg-black/25 text-white backdrop-blur-md hover:bg-black/40 hover:text-white"
          aria-label={paused ? "Lire la vidéo d'arrière-plan" : "Mettre en pause la vidéo d'arrière-plan"}
          onClick={() => setUserPaused(!paused)}
        >
          {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        </Button>
      )}
    </section>
  );
}
