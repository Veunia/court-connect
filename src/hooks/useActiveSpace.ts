import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { fetchMySpaces, type MySpace } from "@/lib/spaces";

const STORAGE_KEY = "basket-active-space";

/** Espace actif (persisté), validé contre la liste des espaces du membre. */
export function useActiveSpace(user: User | null) {
  const [storedId, setStoredId] = useState<string | null>(null);

  useEffect(() => {
    setStoredId(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  const query = useQuery({
    queryKey: ["my-spaces", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchMySpaces(user!.id),
  });

  const spaces: MySpace[] = query.data ?? [];
  const active = spaces.find((s) => s.id === storedId) ?? spaces[0] ?? null;

  function selectSpace(id: string) {
    window.localStorage.setItem(STORAGE_KEY, id);
    setStoredId(id);
  }

  return {
    spaces,
    activeSpace: active,
    activeSpaceId: active?.id ?? null,
    isLoading: query.isLoading,
    selectSpace,
    refresh: query.refetch,
  };
}
