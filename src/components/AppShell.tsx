"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  LayoutDashboard,
  ListChecks,
  Newspaper,
  Search,
  Settings,
  Tags
} from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/keywords", label: "Keywords", icon: Tags },
  { href: "/releases", label: "Releases", icon: Search },
  { href: "/sources", label: "Sources", icon: Newspaper },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/checklist", label: "Checklist", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Drop Desk dashboard">
          <span className="brand-mark">DD</span>
          <span>
            <strong>Drop Desk</strong>
            <small>Release tracker</small>
          </span>
        </Link>

        <nav className="nav-list" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={active ? "nav-item active" : "nav-item"}>
                <Icon size={17} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
