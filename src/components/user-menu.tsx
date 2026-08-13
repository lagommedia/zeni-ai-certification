"use client";

import { LogOut, UserRoundCog } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/app/login/actions";

type UserSummary = {
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  title: string | null;
  avatarColor: string;
};

export function UserMenu({ user }: { user: UserSummary }) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar className="size-8">
          <AvatarFallback style={{ backgroundColor: user.avatarColor }} className="text-sm font-medium text-onyx">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-3 px-1.5 py-2">
          <Avatar className="size-9">
            <AvatarFallback style={{ backgroundColor: user.avatarColor }} className="text-sm font-medium text-onyx">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="px-2 pb-2">
          <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className="gap-1">
            <UserRoundCog className="size-3" />
            {user.role === "ADMIN" ? "Administrator" : user.title ?? "Member"}
          </Badge>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => logoutAction()}>
          <LogOut className="size-4" />
          Switch account / Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
