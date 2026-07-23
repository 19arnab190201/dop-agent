import {
  Home,
  AlertTriangle,
  Users,
  GraduationCap,
  Wallet,
  FileText,
  Upload,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Today", icon: Home },
  { href: "/overdue", label: "Overdue", icon: AlertTriangle },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/maturity", label: "Maturity", icon: GraduationCap },
];

export const MORE_NAV: NavItem[] = [
  { href: "/import", label: "Import", icon: Upload },
  { href: "/commission", label: "Commission", icon: Wallet },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const ALL_NAV: NavItem[] = [...PRIMARY_NAV, ...MORE_NAV];
