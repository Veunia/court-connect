import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile, upsertProfile, type Profile } from "@/lib/basket";

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, ready };
}

/** Current user's profile, created on first use from the auth account. */
export function useProfile(user: User | null) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;
      const existing = await fetchProfile(user.id);
      if (existing) return existing;
      await upsertProfile({
        id: user.id,
        email: user.email ?? null,
        full_name: (user.user_metadata?.["full_name"] as string | undefined) ?? user.email?.split("@")[0] ?? null,
      });
      return fetchProfile(user.id);
    },
  });

  return { ...query, refreshProfile: () => queryClient.invalidateQueries({ queryKey: ["profile", user?.id] }) };
}