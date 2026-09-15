import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RankBadge } from "./rank-badge";

export type RankListEntry = {
  id: string;
  rank: number;
  name: string;
  avatarColor: string;
  totalPoints: number;
};

export function RankList({ entries }: { entries: RankListEntry[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-center gap-2.5 text-sm">
          <span className="w-5 shrink-0">
            <RankBadge rank={entry.rank} />
          </span>
          <Avatar className="size-6">
            <AvatarFallback
              style={{ backgroundColor: entry.avatarColor }}
              className="text-[10px] font-medium text-onyx"
            >
              {entry.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 truncate font-medium">{entry.name}</span>
          <span className="font-semibold text-onyx tabular-nums">{entry.totalPoints.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}
