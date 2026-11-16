import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

type Props = {
  lat: number;
  lng: number;
  onPick: (point: { lat: number; lng: number }) => void;
};

declare global {
  interface Window {
    google?: any;
    __basketMapsReady?: Promise<void>;
  }
}

function loadMaps(key: string, channel?: string) {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.__basketMapsReady) return window.__basketMapsReady;
  window.__basketMapsReady = new Promise<void>((resolve, reject) => {
    const callbackName = "__basketMapsInit";
    (window as any)[callbackName] = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=${callbackName}${
      channel ? `&channel=${channel}` : ""
    }`;
    script.async = true;
    script.onerror = () => reject(new Error("Chargement de la carte impossible"));
    document.head.appendChild(script);
  });
  return window.__basketMapsReady;
}

export function SpotMapPicker({ lat, lng, onPick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const pickRef = useRef(onPick);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  pickRef.current = onPick;

  const browserKey = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as
    | string
    | undefined;
  const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as
    | string
    | undefined;

  useEffect(() => {
    if (!browserKey) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    loadMaps(browserKey, channel)
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        const center = { lat, lng };
        const map = new window.google.maps.Map(containerRef.current, {
          center,
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        });
        const marker = new window.google.maps.Marker({ position: center, map });
        map.addListener("click", (event: any) => {
          if (!event.latLng) return;
          const point = { lat: event.latLng.lat(), lng: event.latLng.lng() };
          marker.setPosition(point);
          pickRef.current(point);
        });
        mapRef.current = map;
        markerRef.current = marker;
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserKey, channel]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const point = { lat, lng };
    mapRef.current.setCenter(point);
    markerRef.current?.setPosition(point);
  }, [lat, lng, ready]);

  if (failed) return null;

  return (
    <div className="relative h-52 w-full">
      <div ref={containerRef} className="h-full w-full" />
      {!ready ? (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : null}
    </div>
  );
}