import { Bell, BookOpen, Award, Settings, BarChart3, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  // Visible to Admins *and* Team Leads — a per-team designation, not a Role
  // value, so this can't be collapsed into `adminOnly`.
  analyticsAccess?: boolean;
  showUnreadBadge?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/notifications", label: "Notifications", icon: Bell, showUnreadBadge: true },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/certificates", label: "Certificates", icon: Award },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3, analyticsAccess: true },
];
