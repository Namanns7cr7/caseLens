"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/icon";
import { Omnibox } from "@/components/layout/omnibox";

/**
 * The application shell.
 *
 * Layout follows DESIGN.md and UI_UX_SPEC.md:
 *   desktop  — pinned left rail + workspace, top app bar, status dock;
 *   tablet   — rail collapses to an overlay drawer;
 *   mobile   — linear stack with a bottom navigation bar.
 */

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/search", label: "Cases", icon: "search" },
  { href: "/investigations", label: "Investigate", icon: "account_tree" },
  { href: "/verify", label: "Verify", icon: "file_search" },
  { href: "/research", label: "Research", icon: "auto_awesome" },
];

const SECONDARY_NAV: NavItem[] = [
  { href: "/reports", label: "Reports", icon: "description" },
  { href: "/sources", label: "Sources", icon: "hub" },
];

const MOBILE_NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/investigations", label: "Investigate", icon: "account_tree" },
  { href: "/search", label: "Search", icon: "search" },
  { href: "/verify", label: "Verify", icon: "file_search" },
  { href: "/sources", label: "Sources", icon: "hub" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/home") return pathname === "/home";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand() {
  return (
    <Link href="/home" className="flex items-center gap-2 shrink-0 group rounded">
      <span className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white">
        <Icon name="gavel" size={18} />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-headline-md text-headline-md font-semibold tracking-tight text-on-surface leading-none">
          CaseLens
        </span>
        <span className="font-statute-code text-statute-code text-secondary tracking-widest uppercase mt-0.5">
          Legal Intelligence
        </span>
      </span>
    </Link>
  );
}

function RailLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-body-md",
        active
          ? "bg-secondary-fixed/50 text-on-secondary-fixed font-semibold border border-secondary/40"
          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface border border-transparent",
      )}
    >
      <Icon name={item.icon} size={18} className={active ? "text-secondary" : "text-muted"} />
      {item.label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const rail = (
    <nav className="flex flex-col gap-1 p-3" aria-label="Primary">
      <p className="px-2.5 pt-1 pb-2 font-label-md text-label-md uppercase tracking-wider text-muted">
        Investigate
      </p>
      {PRIMARY_NAV.map((item) => (
        <RailLink key={item.href} item={item} pathname={pathname} />
      ))}

      <p className="px-2.5 pt-4 pb-2 font-label-md text-label-md uppercase tracking-wider text-muted">
        Output
      </p>
      {SECONDARY_NAV.map((item) => (
        <RailLink key={item.href} item={item} pathname={pathname} />
      ))}

      <div className="mt-auto pt-6">
        <div className="rounded-lg border border-review-border bg-review-surface p-3 space-y-1">
          <p className="flex items-center gap-1.5 font-label-md text-label-md uppercase tracking-wider text-review-ink">
            <Icon name="info" size={14} />
            Unverified corpus
          </p>
          <p className="text-[12px] leading-relaxed text-review-ink/90">
            Nothing here was retrieved from a source. The whole index was written from model
            recollection for this demo.
          </p>
          <Link href="/sources" className="inline-block text-[12px] font-label-md text-secondary hover:underline">
            See what is indexed →
          </Link>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top app bar */}
      <header className="flex items-center gap-3 w-full px-space-md lg:px-space-lg py-space-sm border-b border-outline-variant sticky top-0 z-40 bg-surface-container-lowest shadow-sm">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="lg:hidden p-2 -ml-1 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
          aria-label="Open navigation"
        >
          <Icon name="menu" size={20} />
        </button>

        <Brand />

        <div className="flex-1 max-w-2xl hidden md:block">
          <Omnibox />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Link href="/verify" className="cl-btn-secondary hidden sm:inline-flex">
            <Icon name="upload" size={16} />
            <span className="hidden lg:inline">Verify a document</span>
            <span className="lg:hidden">Verify</span>
          </Link>
          <Link href="/investigations" className="cl-btn-primary">
            <Icon name="add_circle" size={16} />
            <span className="hidden lg:inline">New investigation</span>
            <span className="lg:hidden">New</span>
          </Link>
        </div>
      </header>

      {/* Mobile search row */}
      <div className="md:hidden px-margin-mobile py-2 border-b border-outline-variant bg-surface-container-lowest">
        <Omnibox />
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Desktop rail */}
        <aside className="hidden lg:flex w-[260px] shrink-0 border-r border-outline-variant bg-surface-container-lowest flex-col">
          {rail}
        </aside>

        {/* Tablet/mobile drawer */}
        {drawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-[rgba(15,37,55,0.45)] backdrop-blur-[4px]"
            />
            <div
              className="relative w-[280px] max-w-[85vw] h-full bg-surface-container-lowest border-r border-outline-variant flex flex-col overflow-y-auto"
              onClick={() => setDrawerOpen(false)}
            >
              <div className="flex items-center justify-between px-3 py-3 border-b border-outline-variant">
                <Brand />
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg"
                  aria-label="Close navigation"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
              {rail}
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0 pb-16 lg:pb-0">{children}</main>
      </div>

      {/* Status dock */}
      <footer className="hidden lg:flex bg-surface-container-lowest border-t border-outline-variant px-space-lg py-1.5 items-center justify-between font-statute-code text-statute-code text-[11px] text-on-surface-variant select-none">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-verified-ink font-semibold">
            <span className="w-2 h-2 rounded-full bg-on-tertiary-container" />
            Index online
          </span>
          <span className="text-muted">|</span>
          <span>INSC neutral citation standard</span>
          <span className="text-muted">|</span>
          <Link href="/sources" className="hover:text-secondary">
            Source transparency
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted">
            Deterministic checks run before any model is consulted
          </span>
          <span className="text-muted">|</span>
          <span className="font-semibold text-secondary">CaseLens</span>
        </div>
      </footer>

      {/* Mobile bottom navigation */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-container-lowest border-t border-outline-variant flex"
        aria-label="Primary"
      >
        {MOBILE_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors",
                active ? "text-secondary" : "text-muted",
              )}
            >
              <Icon name={item.icon} size={20} />
              <span className="text-[10px] font-label-md">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
