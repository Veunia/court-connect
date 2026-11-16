import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Plus, Settings, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MySpace } from "@/lib/spaces";
import { cn } from "@/lib/utils";

type Props = {
  spaces: MySpace[];
  activeSpace: MySpace | null;
  onSelect: (id: string) => void;
};

export function SpaceSwitcher({ spaces, activeSpace, onSelect }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-w-0 items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-left">
        <span className="truncate font-display text-sm font-bold tracking-widest uppercase">
          {activeSpace?.name ?? "Mes espaces"}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Mes espaces</DropdownMenuLabel>
        {spaces.map((space) => (
          <DropdownMenuItem key={space.id} onSelect={() => onSelect(space.id)} className="gap-2">
            <Check className={cn("size-4", space.id === activeSpace?.id ? "opacity-100" : "opacity-0")} />
            <span className="truncate">{space.name}</span>
          </DropdownMenuItem>
        ))}
        {spaces.length === 0 ? (
          <DropdownMenuItem disabled>Aucun espace</DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        {activeSpace ? (
          <DropdownMenuItem asChild>
            <Link to="/espace/$id" params={{ id: activeSpace.id }} className="gap-2">
              <Settings className="size-4" /> Gérer cet espace
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link to="/espaces" className="gap-2">
            <Plus className="size-4" /> Créer un espace
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/rejoindre" className="gap-2">
            <Users className="size-4" /> Rejoindre avec un code
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
