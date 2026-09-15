import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RankBadge } from "./rank-badge";

export type LeaderboardDisplayRow = {
  id: string;
  rank: number;
  name: string;
  avatarColor: string;
  teamId: string | null;
  teamName: string | null;
  completedCourses: number;
  speedPoints: number;
  accuracyPoints: number;
  masteryPoints: number;
  totalPoints: number;
};

function Initials({ name }: { name: string }) {
  return (
    <>
      {name
        .split(" ")
        .map((n) => n[0])
        .join("")}
    </>
  );
}

export function LeaderboardTable({
  rows,
  showTeam = false,
  showBreakdown = true,
}: {
  rows: LeaderboardDisplayRow[];
  showTeam?: boolean;
  showBreakdown?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">Rank</TableHead>
            <TableHead>Member</TableHead>
            {showTeam && <TableHead>Team</TableHead>}
            {showBreakdown && <TableHead className="text-right">Speed</TableHead>}
            {showBreakdown && <TableHead className="text-right">Accuracy</TableHead>}
            {showBreakdown && <TableHead className="text-right">Mastery</TableHead>}
            <TableHead className="text-right">Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <RankBadge rank={row.rank} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback
                      style={{ backgroundColor: row.avatarColor }}
                      className="text-xs font-medium text-onyx"
                    >
                      <Initials name={row.name} />
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{row.name}</span>
                </div>
              </TableCell>
              {showTeam && (
                <TableCell>
                  {row.teamName ? (
                    <Badge variant="secondary">{row.teamName}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              )}
              {showBreakdown && (
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {row.speedPoints}
                </TableCell>
              )}
              {showBreakdown && (
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {row.accuracyPoints}
                </TableCell>
              )}
              {showBreakdown && (
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {row.masteryPoints}
                </TableCell>
              )}
              <TableCell className="text-right font-semibold text-onyx tabular-nums">
                {row.totalPoints}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
