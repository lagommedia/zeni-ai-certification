"use client";

import { Fragment, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EnrollmentStatusBadge, ExpandChevron, type EnrollmentStatusValue } from "./enrollment-status";

export type CoursePerformanceRow = {
  id: string;
  title: string;
  category: string;
  enrolled: number;
  completed: number;
  rate: number;
  members: {
    id: string;
    name: string;
    avatarColor: string;
    role: "ADMIN" | "USER";
    status: EnrollmentStatusValue;
  }[];
};

export function CoursePerformanceTable({ courses }: { courses: CoursePerformanceRow[] }) {
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
            <TableHead>Course</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Enrolled</TableHead>
            <TableHead className="text-right">Completed</TableHead>
            <TableHead className="w-56">Completion rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map((course) => {
            const isExpanded = expanded.has(course.id);
            return (
              <Fragment key={course.id}>
                <TableRow className="cursor-pointer" onClick={() => toggle(course.id)}>
                  <TableCell className="font-medium">
                    <button type="button" aria-expanded={isExpanded} className="flex items-center gap-2 text-left">
                      <ExpandChevron expanded={isExpanded} />
                      {course.title}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{course.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{course.enrolled}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{course.completed}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={course.rate} className="h-1.5" />
                      <span className="w-9 shrink-0 text-right text-xs text-muted-foreground">
                        {course.rate}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="bg-muted/30 p-0">
                      <ul className="flex flex-col gap-1.5 px-8 py-3">
                        {course.members.map((member) => (
                          <li key={member.id} className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-2">
                              <Avatar className="size-6">
                                <AvatarFallback
                                  style={{ backgroundColor: member.avatarColor }}
                                  className="text-[10px] font-medium text-onyx"
                                >
                                  {member.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{member.name}</span>
                              {member.role === "ADMIN" && (
                                <Badge variant="outline" className="text-[10px]">
                                  Admin
                                </Badge>
                              )}
                            </span>
                            <EnrollmentStatusBadge status={member.status} />
                          </li>
                        ))}
                      </ul>
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
