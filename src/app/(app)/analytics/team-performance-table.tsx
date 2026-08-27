"use client";

import { Fragment, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExpandChevron } from "./enrollment-status";
import { MemberProgressTable, type MemberProgressRow } from "./member-progress-table";

export type TeamPerformanceRow = {
  id: string;
  name: string;
  leadName: string | null;
  memberCount: number;
  completed: number;
  total: number;
  rate: number;
  members: MemberProgressRow[];
};

export function TeamPerformanceTable({ teams }: { teams: TeamPerformanceRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Team</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead className="text-right">Members</TableHead>
            <TableHead className="text-right">Completed</TableHead>
            <TableHead className="w-56">Completion rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team) => {
            const isExpanded = expanded.has(team.id);
            return (
              <Fragment key={team.id}>
                <TableRow
                  className={team.memberCount > 0 ? "cursor-pointer" : undefined}
                  onClick={() => team.memberCount > 0 && toggle(team.id)}
                >
                  <TableCell className="font-medium">
                    {team.memberCount > 0 ? (
                      <button type="button" aria-expanded={isExpanded} className="flex items-center gap-2 text-left">
                        <ExpandChevron expanded={isExpanded} />
                        {team.name}
                      </button>
                    ) : (
                      <span className="pl-6">{team.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{team.leadName ?? "—"}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{team.memberCount}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{team.completed}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={team.rate} className="h-1.5" />
                      <span className="w-9 shrink-0 text-right text-xs text-muted-foreground">
                        {team.rate}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
                {isExpanded && team.memberCount > 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="bg-muted/30 p-3">
                      <MemberProgressTable members={team.members} dense />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
