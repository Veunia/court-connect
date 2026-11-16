import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/fr";
import { cn } from "@/lib/utils";

type Props = {
  name: string | null | undefined;
  url?: string | null | undefined;
  className?: string;
};

export function PlayerAvatar({ name, url, className }: Props) {
  return (
    <Avatar className={cn("size-10 border border-border", className)}>
      {url ? <AvatarImage src={url} alt={name ?? "Joueur"} /> : null}
      <AvatarFallback className="bg-accent font-display font-bold text-accent-foreground">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}