import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { BasketballIcon } from "./BasketballIcon";
import { PlayerAvatar } from "./PlayerAvatar";
import { SpaceSwitcher } from "./SpaceSwitcher";
import type { Profile } from "@/lib/basket";
import type { MySpace } from "@/lib/spaces";

type Props = {
  profile: Profile | null | undefined;
  spaces?: MySpace[];
  activeSpace?: MySpace | null;
  onSelectSpace?: (id: string) => void;
};

export function AppHeader({ profile, spaces, activeSpace, onSelectSpace }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <BasketballIcon className="size-5" />
            </span>
            <span className="hidden font-display text-xl font-bold tracking-widest uppercase sm:inline">
              Basket Crew
            </span>
          </Link>
          {spaces && onSelectSpace ? (
            <SpaceSwitcher
              spaces={spaces}
              activeSpace={activeSpace ?? null}
              onSelect={onSelectSpace}
            />
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/session/nouvelle"
            aria-label="Créer une session"
            className="hidden size-10 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 sm:grid"
          >
            <Plus className="size-5" />
          </Link>
          <Link to="/profil" aria-label="Mon profil">
            <PlayerAvatar name={profile?.full_name} url={profile?.avatar_url} />
          </Link>
        </div>
      </div>
    </header>
  );
}
