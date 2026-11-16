import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Single-line-art basketball drawn in the Lucide style (24px grid, 2px round
 * stroke, currentColor) so the app has one icon system: no system emoji.
 * Size it with a `size-*` class like any lucide-react icon.
 */
export function BasketballIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("lucide lucide-basketball", className)}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2.5 12h19" />
      <path d="M12 2.5v19" />
      <path d="M5 5c2.6 2.1 4 4.6 4 7s-1.4 4.9-4 7" />
      <path d="M19 5c-2.6 2.1-4 4.6-4 7s1.4 4.9 4 7" />
    </svg>
  );
}
