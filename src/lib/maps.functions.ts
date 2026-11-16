import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GeocodeInput = z.object({
  address: z.string().min(3).max(160),
});

const ReverseInput = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const geocodePlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GeocodeInput.parse(input))
  .handler(async ({ data }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovableKey || !mapsKey) throw new Error("Connexion cartes indisponible");

    const address = data.address.replace(/\s*[—–]\s*/g, ", ").trim();
    const response = await fetch(
      `https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json?address=${encodeURIComponent(address)}`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey,
        },
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Recherche cartographique échouée [${response.status}]: ${body}`);
    }

    const payload = (await response.json()) as {
      status?: string;
      results?: Array<{
        formatted_address?: string;
        geometry?: { location?: { lat: number; lng: number } };
      }>;
    };

    const first = payload.results?.[0];
    const location = first?.geometry?.location;
    if (!location) return { found: false as const };

    return {
      found: true as const,
      lat: location.lat,
      lng: location.lng,
      formatted: first?.formatted_address ?? address,
    };
  });

export const reverseGeocodePoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReverseInput.parse(input))
  .handler(async ({ data }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovableKey || !mapsKey) throw new Error("Connexion cartes indisponible");

    const response = await fetch(
      `https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json?latlng=${data.lat},${data.lng}&language=fr`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey,
        },
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Recherche cartographique échouée [${response.status}]: ${body}`);
    }

    const payload = (await response.json()) as {
      results?: Array<{ formatted_address?: string; name?: string }>;
    };

    const formatted = payload.results?.[0]?.formatted_address;
    if (!formatted) return { found: false as const };

    return { found: true as const, formatted, lat: data.lat, lng: data.lng };
  });
