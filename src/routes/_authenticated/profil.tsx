import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, Loader2, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PlayerAvatar } from "@/components/basket/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, useProfile } from "@/hooks/useCurrentUser";
import { POSITIONS, uploadAvatar, upsertProfile } from "@/lib/basket";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/validation";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Vérifie la vraie nature du fichier via sa signature binaire : le type
 * déclaré par le navigateur peut être falsifié en renommant le fichier.
 */
async function isRealImage(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const at = (i: number) => bytes[i] ?? -1;
  const jpeg = at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff;
  const png =
    at(0) === 0x89 &&
    at(1) === 0x50 &&
    at(2) === 0x4e &&
    at(3) === 0x47 &&
    at(4) === 0x0d &&
    at(5) === 0x0a;
  const webp =
    at(0) === 0x52 &&
    at(1) === 0x49 &&
    at(2) === 0x46 &&
    at(3) === 0x46 &&
    at(8) === 0x57 &&
    at(9) === 0x45 &&
    at(10) === 0x42 &&
    at(11) === 0x50;
  return jpeg || png || webp;
}

/** Redimensionne l'image côté navigateur pour limiter le poids envoyé. */
async function resizeImage(file: File, size = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.85);
  });
}

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil — Basket Crew" },
      {
        name: "description",
        content: "Ton nom, ton poste, ta photo et tes statistiques de joueur.",
      },
      { property: "og:title", content: "Mon profil — Basket Crew" },
      { property: "og:description", content: "Gère ton profil de joueur et déconnecte-toi." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useCurrentUser();
  const { data: profile } = useProfile(user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [position, setPosition] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name ?? "");
    setPosition(profile.position ?? null);
    setAvatarUrl(profile.avatar_url ?? "");
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non connecté");
      await upsertProfile({
        id: user.id,
        email: user.email ?? null,
        full_name: name.trim() || null,
        position,
        avatar_url: avatarUrl.trim() || null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Profil enregistré.");
    },
    onError: (err) => toast.error(errorMessage(err, "L'enregistrement a échoué.")),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Non connecté");
      if (!ALLOWED_TYPES.includes(file.type)) throw new Error("format");
      if (file.size > MAX_AVATAR_BYTES) throw new Error("taille");
      if (!(await isRealImage(file))) throw new Error("format");
      const blob = await resizeImage(file);
      const url = await uploadAvatar(user.id, blob);
      await upsertProfile({ id: user.id, avatar_url: url });
      return url;
    },
    onSuccess: async (url) => {
      setAvatarUrl(url);
      await queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Photo de profil mise à jour.");
    },
    onError: (err: Error) => {
      if (err.message === "format") toast.error("Formats acceptés : JPEG, PNG ou WebP.");
      else if (err.message === "taille") toast.error("Image trop lourde (5 Mo maximum).");
      else toast.error("L'envoi de la photo a échoué.");
    },
  });

  const removeAvatar = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non connecté");
      await upsertProfile({ id: user.id, avatar_url: null });
    },
    onSuccess: async () => {
      setAvatarUrl("");
      await queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Photo retirée.");
    },
    onError: () => toast.error("Impossible de retirer la photo."),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="mx-auto max-w-lg px-5 py-6">
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Retour
      </Link>

      <div className="flex items-center gap-4">
        <PlayerAvatar
          name={name || profile?.full_name}
          url={avatarUrl || profile?.avatar_url}
          className="size-16"
        />
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-bold tracking-wide uppercase">
            {name || "Joueur"}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) upload.mutate(file);
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={upload.isPending}
          onClick={() => fileRef.current?.click()}
        >
          {upload.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Camera className="size-4" />
          )}
          Changer la photo
        </Button>
        {avatarUrl ? (
          <Button
            type="button"
            variant="outline"
            disabled={removeAvatar.isPending}
            onClick={() => removeAvatar.mutate()}
          >
            <Trash2 className="size-4" /> Retirer la photo
          </Button>
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-3xl font-bold">{profile?.matches_played ?? 0}</p>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Matchs joués</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-3xl font-bold">{profile?.cancellations ?? 0}</p>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Annulations</p>
        </div>
      </div>

      <form
        className="mt-8 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Prénom / Nom</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Poste (facultatif)</Label>
          <div className="flex flex-wrap gap-2">
            {POSITIONS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPosition(position === value ? null : value)}
                className={cn(
                  "h-10 rounded-full border px-4 text-sm transition-colors",
                  position === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="avatar">Ou coller une URL d'image (facultatif)</Label>
          <Input
            id="avatar"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
          />
          <p className="text-xs text-muted-foreground">Sans photo, tes initiales sont affichées.</p>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={save.isPending}
          className="w-full font-display font-bold tracking-widest"
        >
          Enregistrer
        </Button>
      </form>

      <Button variant="outline" size="lg" onClick={signOut} className="mt-6 w-full">
        <LogOut className="size-4" /> Se déconnecter
      </Button>
    </main>
  );
}
