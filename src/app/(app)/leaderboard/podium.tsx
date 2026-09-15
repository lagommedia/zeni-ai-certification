import Image from "next/image";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PodiumConfetti } from "./podium-confetti";

export type PodiumEntry = {
  id: string;
  name: string;
  avatarColor: string;
  avatarUrl: string | null;
  teamName: string | null;
  totalPoints: number;
};

const PLACE_STYLE = {
  1: { block: "bg-gold", height: "h-28", avatar: "size-20", ring: "ring-gold" },
  2: { block: "bg-hero", height: "h-20", avatar: "size-16", ring: "ring-hero" },
  3: { block: "bg-ruby", height: "h-16", avatar: "size-16", ring: "ring-ruby" },
} as const;

function PodiumColumn({ entry, place }: { entry: PodiumEntry; place: 1 | 2 | 3 }) {
  const style = PLACE_STYLE[place];
  return (
    <div className="flex flex-col items-center gap-2">
      {place === 1 && <Crown className="size-6 fill-gold text-gold" />}
      <div className={cn("relative flex items-center justify-center overflow-hidden rounded-full ring-4", style.avatar, style.ring)}>
        {entry.avatarUrl ? (
          <Image
            src={entry.avatarUrl}
            alt=""
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <div
            className="flex size-full items-center justify-center text-lg font-medium text-onyx"
            style={{ backgroundColor: entry.avatarColor }}
          >
            {entry.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
        )}
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <p className="text-sm font-semibold text-onyx">{entry.name}</p>
        {entry.teamName && <p className="text-xs text-muted-foreground">{entry.teamName}</p>}
        <p className="text-sm font-bold text-onyx tabular-nums">{entry.totalPoints.toLocaleString()} XP</p>
      </div>
      <div
        className={cn(
          "flex w-24 items-start justify-center rounded-t-lg pt-2 text-2xl font-bold text-pearl",
          style.block,
          style.height
        )}
      >
        {place}
      </div>
    </div>
  );
}

export function Podium({ entries }: { entries: PodiumEntry[] }) {
  if (entries.length === 0) return null;
  const [first, second, third] = entries;

  return (
    <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-xl border bg-card px-5 pb-0 pt-8">
      <PodiumConfetti />
      <div className="flex items-end justify-center gap-4 sm:gap-8">
        {second && <PodiumColumn entry={second} place={2} />}
        {first && <PodiumColumn entry={first} place={1} />}
        {third && <PodiumColumn entry={third} place={3} />}
      </div>
    </div>
  );
}
