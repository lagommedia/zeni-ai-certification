import { Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

export function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex items-center gap-1 font-semibold text-gold">
        <Trophy className="size-4" />
        {rank}
      </span>
    );
  }
  if (rank === 2 || rank === 3) {
    return (
      <span className={cn("flex items-center gap-1 font-semibold", rank === 2 ? "text-hero" : "text-ruby")}>
        <Medal className="size-4" />
        {rank}
      </span>
    );
  }
  return <span className="text-muted-foreground tabular-nums">{rank}</span>;
}
