import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Keeps signup counts, affluence and player lists in sync across devices. */
export function useRealtimeSessions() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("basket-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "session_signups" }, () => {
        queryClient.invalidateQueries({ queryKey: ["sessions"] });
        queryClient.invalidateQueries({ queryKey: ["session"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "game_sessions" }, () => {
        queryClient.invalidateQueries({ queryKey: ["sessions"] });
        queryClient.invalidateQueries({ queryKey: ["session"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "session_waitlist" }, () => {
        queryClient.invalidateQueries({ queryKey: ["sessions"] });
        queryClient.invalidateQueries({ queryKey: ["session"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "space_members" }, () => {
        queryClient.invalidateQueries({ queryKey: ["my-spaces"] });
        queryClient.invalidateQueries({ queryKey: ["space-members"] });
        queryClient.invalidateQueries({ queryKey: ["sessions"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}