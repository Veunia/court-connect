import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  joinSession,
  joinWaitlist,
  leaveSession,
  leaveWaitlist,
  type SignupResult,
} from "@/lib/basket";

/** Messages d'erreur explicites plutôt qu'un message fourre-tout. */
function reportFailure(result: SignupResult): boolean {
  switch (result.status) {
    case "full":
      toast.error("Session complète : rejoins la liste d'attente.");
      return true;
    case "cancelled":
      toast.error("Cette session a été annulée.");
      return true;
    case "email_unconfirmed":
      toast.error("Confirme ton adresse email pour t'inscrire.");
      return true;
    case "forbidden":
      toast.error("Tu n'es plus membre du club de cette session.");
      return true;
    case "not_found":
      toast.error("Cette session n'existe plus.");
      return true;
    case "unauthenticated":
      toast.error("Reconnecte-toi pour t'inscrire.");
      return true;
    case "already_signed_up":
      toast.error("Tu es déjà inscrit à cette session.");
      return true;
    default:
      return false;
  }
}

function reportUnknown(error: unknown) {
  const err = error as { code?: string; message?: string; details?: string } | null;
  console.error("[signup] échec inattendu", err);
  toast.error("Action impossible pour le moment. Réessaie dans un instant.");
}

export function useSignupToggle(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, joined }: { sessionId: string; joined: boolean }) => {
      if (!userId) throw new Error("Non connecté");
      return joined ? leaveSession(sessionId) : joinSession(sessionId);
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
      if (reportFailure(result)) return;
      if (result.status === "waitlisted") {
        toast.success(`Session complète : tu es ${result.position ?? 1}e sur la liste d'attente.`);
        return;
      }
      toast.success(variables.joined ? "Tu n'es plus inscrit." : "Inscription confirmée !");
    },
    onError: reportUnknown,
  });
}

/** Rejoindre / quitter la liste d'attente d'une session complète. */
export function useWaitlistToggle(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, waiting }: { sessionId: string; waiting: boolean }) => {
      if (!userId) throw new Error("Non connecté");
      return waiting ? leaveWaitlist(sessionId) : joinWaitlist(sessionId);
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
      if (reportFailure(result)) return;
      if (result.status === "joined") {
        toast.success("Une place s'est libérée : tu es inscrit !");
        return;
      }
      toast.success(
        variables.waiting
          ? "Tu as quitté la liste d'attente."
          : "Tu es sur la liste d'attente : une place libérée est pour toi.",
      );
    },
    onError: reportUnknown,
  });
}
