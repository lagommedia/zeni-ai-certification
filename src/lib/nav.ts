import { Bell, BookOpen, Award, Settings, BarChart3, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  showUnreadBadge?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/notifications", label: "Notifications", icon: Bell, showUnreadBadge: true },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/certificates", label: "Certificates", icon: Award },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3, adminOnly: true },
];
