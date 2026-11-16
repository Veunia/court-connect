import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sparkles, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COURT_THRESHOLDS, COURT_LABEL, type CourtType } from "@/lib/affluence";
import { CATEGORY_LABEL, type Category, type SessionInput } from "@/lib/basket";
import { suggestSessionTitles, suggestLocations } from "@/lib/ai.functions";
import { geocodePlace, reverseGeocodePoint } from "@/lib/maps.functions";
import { SpotMapPicker } from "@/components/basket/SpotMapPicker";
import { todayISO } from "@/lib/fr";
import { cn } from "@/lib/utils";

type Props = {
  initial?: Partial<SessionInput>;
  submitLabel: string;
  pending?: boolean;
  onSubmit: (input: SessionInput) => void;
};

const CATEGORIES: Category[] = ["interieur", "exterieur", "tournoi"];
const COURTS: CourtType[] = ["demi", "plein"];

export function SessionForm({ initial, submitLabel, pending, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.session_date ?? todayISO());
  const [start, setStart] = useState((initial?.start_time ?? "19:30").slice(0, 5));
  const [end, setEnd] = useState((initial?.end_time ?? "21:00").slice(0, 5));
  const [location, setLocation] = useState(initial?.location ?? "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "interieur");
  const [court, setCourt] = useState<CourtType>(initial?.court ?? "demi");
  const [maxPlayers, setMaxPlayers] = useState(
    initial?.max_players ?? COURT_THRESHOLDS.demi.suggested,
  );
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const askAi = useServerFn(suggestSessionTitles);
  const suggest = useMutation({
    mutationFn: () =>
      askAi({
        data: {
          location: location.trim() || "Gymnase",
          session_date: date,
          start_time: start,
          category,
          court,
        },
      }),
    onSuccess: (res) => {
      if (!res.titles.length) {
        toast.error("Aucune idée de titre pour le moment.");
        return;
      }
      setSuggestions(res.titles);
    },
    onError: () => toast.error("L'IA n'a pas pu proposer de titre. Réessaie."),
  });
  const askPlaces = useServerFn(suggestLocations);
  const [placeQuery, setPlaceQuery] = useState("");
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const pickedRef = useRef<string | null>(null);

  useEffect(() => {
    const value = location.trim();
    if (pickedRef.current === value) return;
    const timer = setTimeout(() => setPlaceQuery(value), 600);
    return () => clearTimeout(timer);
  }, [location]);

  const placesQuery = useQuery({
    queryKey: ["ai-places", placeQuery, category],
    enabled: placeQuery.length >= 3,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: () => askPlaces({ data: { query: placeQuery, category } }),
  });
  const places = placesQuery.data?.places ?? [];

  const askGeocode = useServerFn(geocodePlace);
  const mapQuery = useQuery({
    queryKey: ["map-preview", placeQuery],
    enabled: placeQuery.length >= 3,
    staleTime: 30 * 60 * 1000,
    retry: false,
    queryFn: () => askGeocode({ data: { address: placeQuery } }),
  });
  const spot = mapQuery.data?.found ? mapQuery.data : null;
  const mapsBrowserKey = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as
    string | undefined;

  const askReverse = useServerFn(reverseGeocodePoint);
  const [pickedPoint, setPickedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [pickedAddress, setPickedAddress] = useState<string | null>(null);
  const reverse = useMutation({
    mutationFn: (point: { lat: number; lng: number }) => askReverse({ data: point }),
    onSuccess: (res) => {
      if (!res.found) {
        toast.error("Aucune adresse trouvée à cet endroit.");
        return;
      }
      pickedRef.current = res.formatted;
      setPickedAddress(res.formatted);
      setLocation(res.formatted);
      setAutocompleteOpen(false);
    },
    onError: () => toast.error("Impossible de récupérer l'adresse de ce point."),
  });

  function handleMapPick(point: { lat: number; lng: number }) {
    setPickedPoint(point);
    reverse.mutate(point);
  }

  const center = pickedPoint ?? (spot ? { lat: spot.lat, lng: spot.lng } : null);
  const centerLabel = pickedAddress ?? spot?.formatted ?? null;

  function pickCourt(next: CourtType) {
    setCourt(next);
    setMaxPlayers(COURT_THRESHOLDS[next].suggested);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!location.trim()) {
      setError("Indique le lieu de la session.");
      return;
    }
    if (end <= start) {
      setError("L'heure de fin doit être après l'heure de début.");
      return;
    }
    const whatsappValue = whatsapp.trim();
    if (whatsappValue && !/^https:\/\/(chat\.whatsapp\.com|wa\.me)\//i.test(whatsappValue)) {
      setError("Le lien WhatsApp doit commencer par https://chat.whatsapp.com/ ou https://wa.me/");
      return;
    }
    setError(null);
    onSubmit({
      title: title.trim() ? title.trim() : null,
      session_date: date,
      start_time: start,
      end_time: end,
      location: location.trim(),
      category,
      court,
      max_players: Math.max(1, Number(maxPlayers) || 1),
      whatsapp_url: whatsappValue || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-5">
        <h2 className="font-display text-sm font-bold tracking-widest text-muted-foreground uppercase">
          Quand
        </h2>

        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="start">Début</Label>
            <Input
              id="start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">Fin</Label>
            <Input
              id="end"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              required
            />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="font-display text-sm font-bold tracking-widest text-muted-foreground uppercase">
          Où
        </h2>

        <div className="space-y-2">
          <Label htmlFor="location">Lieu</Label>
          <div className="relative">
            <Input
              id="location"
              value={location}
              onChange={(e) => {
                pickedRef.current = null;
                setLocation(e.target.value);
                setAutocompleteOpen(true);
              }}
              onFocus={() => setAutocompleteOpen(true)}
              placeholder="Ville, quartier ou gymnase"
              className="pr-10"
              autoComplete="off"
              required
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {placesQuery.isFetching ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <MapPin className="size-4" />
              )}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Saisis une ville ou un quartier : l'IA propose des spots de basket.
          </p>
          {autocompleteOpen && places.length > 0 ? (
            <ul className="space-y-2 pt-1">
              {places.map((place) => (
                <li key={place}>
                  <button
                    type="button"
                    onClick={() => {
                      pickedRef.current = place;
                      setLocation(place);
                      setPlaceQuery(place);
                      setAutocompleteOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-left text-sm text-foreground"
                  >
                    <MapPin className="size-4 shrink-0 text-primary" />
                    <span>{place}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {center && mapsBrowserKey ? (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <SpotMapPicker lat={center.lat} lng={center.lng} onPick={handleMapPick} />
              <p className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                {reverse.isPending ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
                ) : (
                  <MapPin className="size-3.5 shrink-0 text-primary" />
                )}
                <span>
                  {reverse.isPending
                    ? "Recherche de l'adresse…"
                    : (centerLabel ?? "Touche la carte pour choisir le spot")}
                </span>
              </p>
              <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                Touche la carte pour placer le spot : le champ Lieu se remplit automatiquement.
              </p>
            </div>
          ) : mapQuery.isFetching ? (
            <div className="flex h-44 items-center justify-center rounded-xl border border-border bg-card">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Catégorie</Label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={cn(
                  "h-11 rounded-full border font-display text-xs font-bold tracking-widest transition-colors",
                  category === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {CATEGORY_LABEL[value]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Type de terrain</Label>
          <div className="grid grid-cols-2 gap-2">
            {COURTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => pickCourt(value)}
                className={cn(
                  "h-11 rounded-full border font-display text-xs font-bold tracking-widest transition-colors",
                  court === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {COURT_LABEL[value]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="font-display text-sm font-bold tracking-widest text-muted-foreground uppercase">
          Réglages
        </h2>

        <div className="space-y-2">
          <Label htmlFor="title">Titre (facultatif)</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Session du mardi"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => suggest.mutate()}
            disabled={suggest.isPending}
            className="text-primary"
          >
            {suggest.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Suggérer un titre (IA)
          </Button>
          {suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {suggestions.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => {
                    setTitle(idea);
                    setSuggestions([]);
                  }}
                  className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  {idea}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="max">Nombre maximal de joueurs</Label>
          <Input
            id="max"
            type="number"
            min={1}
            max={40}
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
            required
          />
          <p className="text-xs text-muted-foreground">
            Suggestion : 12 joueurs en demi-terrain, 20 en tout-terrain.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp">Lien du groupe WhatsApp (facultatif)</Label>
          <Input
            id="whatsapp"
            type="url"
            inputMode="url"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="https://chat.whatsapp.com/..."
          />
          <p className="text-xs text-muted-foreground">
            Colle le lien d'invitation du groupe, ou un lien https://wa.me/33… pour être contacté
            directement.
          </p>
        </div>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        type="submit"
        size="xl"
        disabled={pending}
        className="w-full font-display text-base font-bold tracking-widest"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
