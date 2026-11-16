import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, LogOut, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PlayerAvatar } from "@/components/basket/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  fetchSpace,
  fetchSpaceInvites,
  fetchSpaceMembers,
  inviteByEmail,
  inviteLink,
  regenerateInviteCode,
  removeMember,
  revokeInvite,
  setInviteCodeActive,
  setMemberRole,
} from "@/lib/spaces";
import { errorMessage } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/espace/$id")({
  head: () => ({
    meta: [
      { title: "Gérer l'espace — Basket Crew" },
      {
        name: "description",
        content: "Membres, invitations et code d'accès de ton espace de basket.",
      },
      { property: "og:title", content: "Gérer l'espace — Basket Crew" },
      { property: "og:description", content: "Invite tes joueurs et garde ton club entre vous." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SpaceAdminPage,
});

function SpaceAdminPage() {
  const { id } = Route.useParams();
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");

  const spaceQuery = useQuery({ queryKey: ["space", id], queryFn: () => fetchSpace(id) });
  const membersQuery = useQuery({
    queryKey: ["space-members", id],
    queryFn: () => fetchSpaceMembers(id),
  });
  const me = membersQuery.data?.find((m) => m.user_id === user?.id);
  const isAdmin = me?.role === "admin";
  const invitesQuery = useQuery({
    queryKey: ["space-invites", id],
    enabled: isAdmin,
    queryFn: () => fetchSpaceInvites(id),
  });

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["space", id] }),
      queryClient.invalidateQueries({ queryKey: ["space-members", id] }),
      queryClient.invalidateQueries({ queryKey: ["space-invites", id] }),
      queryClient.invalidateQueries({ queryKey: ["my-spaces"] }),
    ]);
  };

  const invite = useMutation({
    mutationFn: () => inviteByEmail(id, email, user!.id),
    onSuccess: async () => {
      setEmail("");
      await refreshAll();
      toast.success("Invitation enregistrée. La personne rejoindra l'espace à sa connexion.");
    },
    onError: (err) => toast.error(errorMessage(err, "Invitation impossible (déjà envoyée ?).")),
  });

  const revoke = useMutation({
    mutationFn: (inviteId: string) => revokeInvite(inviteId),
    onSuccess: refreshAll,
  });

  const roleChange = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "admin" | "member" }) =>
      setMemberRole(id, userId, role),
    onSuccess: refreshAll,
    onError: () => toast.error("Modification impossible."),
  });

  const kick = useMutation({
    mutationFn: (userId: string) => removeMember(id, userId),
    onSuccess: refreshAll,
    onError: () => toast.error("Retrait impossible."),
  });

  const leave = useMutation({
    mutationFn: () => removeMember(id, user!.id),
    onSuccess: async () => {
      await refreshAll();
      toast.success("Tu as quitté l'espace.");
      navigate({ to: "/espaces" });
    },
  });

  const regenerate = useMutation({
    mutationFn: () => regenerateInviteCode(id),
    onSuccess: async () => {
      await refreshAll();
      toast.success("Nouveau code généré.");
    },
    onError: () => toast.error("Génération impossible."),
  });

  const toggleCode = useMutation({
    mutationFn: (active: boolean) => setInviteCodeActive(id, active),
    onSuccess: refreshAll,
    onError: () => toast.error("Modification impossible."),
  });

  const space = spaceQuery.data;

  if (spaceQuery.isLoading) {
    return (
      <main className="mx-auto max-w-lg space-y-4 px-5 py-6">
        <Skeleton className="h-10 rounded-2xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </main>
    );
  }

  if (!space) {
    return (
      <main className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-muted-foreground">
          Cet espace est introuvable ou tu n'en es pas membre.
        </p>
        <Button asChild size="lg" className="mt-6 font-display font-bold tracking-widest">
          <Link to="/espaces">Mes espaces</Link>
        </Button>
      </main>
    );
  }

  const members = membersQuery.data ?? [];
  const adminCount = members.filter((m) => m.role === "admin").length;

  return (
    <main className="mx-auto max-w-lg px-5 py-6 pb-16">
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Retour aux sessions
      </Link>
      <h1 className="font-display text-3xl font-bold tracking-wide uppercase">{space.name}</h1>
      {space.description ? (
        <p className="mt-1 text-sm text-muted-foreground">{space.description}</p>
      ) : null}

      {isAdmin ? (
        <section className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold tracking-widest uppercase">
            Code d'invitation
          </h2>
          <div className="flex items-center gap-2">
            <span className="flex-1 rounded-2xl bg-secondary px-4 py-3 text-center font-display text-2xl tracking-[0.3em]">
              {space.invite_code}
            </span>
            <Button
              variant="secondary"
              size="icon-lg"
              aria-label="Régénérer le code"
              disabled={regenerate.isPending}
              onClick={() => regenerate.mutate()}
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={async () => {
              await navigator.clipboard.writeText(inviteLink(space.invite_code));
              toast.success("Lien d'invitation copié !");
            }}
          >
            <Copy className="size-4" /> Copier le lien d'invitation
          </Button>
          <div className="flex items-center justify-between">
            <Label htmlFor="code-active">Code actif</Label>
            <Switch
              id="code-active"
              checked={space.invite_code_active}
              onCheckedChange={(value) => toggleCode.mutate(value)}
            />
          </div>
        </section>
      ) : null}

      {isAdmin ? (
        <section className="mt-4 space-y-4 rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold tracking-widest uppercase">
            Inviter par email
          </h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!email.trim()) return;
              invite.mutate();
            }}
            className="flex gap-2"
          >
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="joueur@email.com"
              required
            />
            <Button
              type="submit"
              size="lg"
              disabled={invite.isPending}
              className="font-display font-bold tracking-widest"
            >
              Inviter
            </Button>
          </form>
          {(invitesQuery.data ?? []).length > 0 ? (
            <ul className="space-y-2">
              {(invitesQuery.data ?? []).map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-muted-foreground">{row.email}</span>
                  <button
                    type="button"
                    aria-label={`Annuler l'invitation de ${row.email}`}
                    onClick={() => revoke.mutate(row.id)}
                    className="text-muted-foreground"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Aucune invitation en attente.</p>
          )}
        </section>
      ) : null}

      <section className="mt-4 space-y-3 rounded-3xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold tracking-widest uppercase">
          Membres ({members.length})
        </h2>
        <ul className="space-y-3">
          {members.map((member) => (
            <li key={member.user_id} className="flex items-center gap-3">
              <PlayerAvatar name={member.profile?.full_name} url={member.profile?.avatar_url} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {member.profile?.full_name ?? "Joueur"}
                  {member.user_id === user?.id ? " (toi)" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.role === "admin" ? "Admin" : member.profile?.position || "Membre"}
                </p>
              </div>
              {isAdmin && member.user_id !== user?.id ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      roleChange.mutate({
                        userId: member.user_id,
                        role: member.role === "admin" ? "member" : "admin",
                      })
                    }
                  >
                    {member.role === "admin" ? "Retirer admin" : "Nommer admin"}
                  </Button>
                  <button
                    type="button"
                    aria-label={`Retirer ${member.profile?.full_name ?? "ce joueur"}`}
                    onClick={() => kick.mutate(member.user_id)}
                    className="text-muted-foreground"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <Button
        variant="outline"
        className="mt-6 w-full gap-2 text-destructive"
        disabled={leave.isPending || (isAdmin && adminCount === 1 && members.length > 1)}
        onClick={() => leave.mutate()}
      >
        <LogOut className="size-4" /> Quitter cet espace
      </Button>
      {isAdmin && adminCount === 1 && members.length > 1 ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Nomme un autre admin avant de quitter l'espace.
        </p>
      ) : null}
    </main>
  );
}
