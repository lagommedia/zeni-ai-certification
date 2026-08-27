"use client";

import { Fragment, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EnrollmentStatusBadge, ExpandChevron, type EnrollmentStatusValue } from "./enrollment-status";

export type MemberProgressRow = {
  id: string;
  name: string;
  avatarColor: string;
  role: "ADMIN" | "USER";
  completed: number;
  inProgress: number;
  certificates: number;
  courses: { id: string; title: string; category: string; status: EnrollmentStatusValue }[];
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

// Used both as the page-level "Member progress" table and nested inside an
// expanded Team performance row — `dense` drops the outer border/rounding
// so it sits flush inside the parent row's cell.
export function MemberProgressTable({
  members,
  dense = false,
}: {
  members: MemberProgressRow[];
  dense?: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const table = (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead className="text-right">Completed</TableHead>
          <TableHead className="text-right">In progress</TableHead>
          <TableHead className="text-right">Certificates</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => {
          const isExpanded = expanded.has(member.id);
          return (
            <Fragment key={member.id}>
              <TableRow
                className="cursor-pointer"
                onClick={() => toggle(member.id)}
              >
                <TableCell>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    className="flex items-center gap-2 text-left"
                  >
                    <ExpandChevron expanded={isExpanded} />
                    <Avatar className="size-7">
                      <AvatarFallback
                        style={{ backgroundColor: member.avatarColor }}
                        className="text-xs font-medium text-onyx"
                      >
                        <Initials name={member.name} />
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{member.name}</span>
                    {member.role === "ADMIN" && (
                      <Badge variant="outline" className="text-[10px]">
                        Admin
                      </Badge>
                    )}
                  </button>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{member.completed}</TableCell>
                <TableCell className="text-right text-muted-foreground">{member.inProgress}</TableCell>
                <TableCell className="text-right text-muted-foreground">{member.certificates}</TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="bg-muted/30 p-0">
                    {member.courses.length === 0 ? (
                      <p className="px-8 py-3 text-xs text-muted-foreground">
                        Not enrolled in any courses yet.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-1.5 px-8 py-3">
                        {member.courses.map((course) => (
                          <li key={course.id} className="flex items-center justify-between gap-4">
                            <span className="text-sm">{course.title}</span>
                            <EnrollmentStatusBadge status={course.status} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );

  if (dense) return table;
  return <div className="overflow-hidden rounded-xl border bg-card">{table}</div>;
}
