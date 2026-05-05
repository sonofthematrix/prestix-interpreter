"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Megaphone, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { HubGate } from "@/components/hub/HubGate";
import { VenueWallTexture } from "@/components/hub/VenueWallTexture";
import { useHubViewPreference } from "@/hooks/useHubViewPreference";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setHubSidebarOpen } from "@/store/slices/uiSlice";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/** PromoHub icon: Lucide Megaphone — announcement, broadcast, promotion, marketing. Best match for promoter hub. */
const PROMOHUB_ICON = Megaphone;

const NAV = [
  { href: "/hub", label: "Dashboard" },
  { href: "/hub/marketplace", label: "Marketplace" },
  { href: "/hub/venues", label: "Venues" },
  { href: "/hub/events", label: "Events" },
  { href: "/hub/promoters", label: "Promoters" },
  { href: "/hub/bookings", label: "Bookings" },
  { href: "/hub/purchases", label: "Purchases" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/hub" && pathname.startsWith(href));
}

export default function HubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((s) => s.ui.hubSidebarOpen);
  const setSidebarOpen = (open: boolean) => dispatch(setHubSidebarOpen(open));
  const PromoHubIcon = PROMOHUB_ICON;

  useHubViewPreference();

  const navLinkClass = (href: string) =>
    cn(
      "block rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
      isActive(pathname, href)
        ? "bg-muted text-foreground"
        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
    );

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <VenueWallTexture />
      <header className="sticky top-14 z-40 border-b border-border bg-background/95 backdrop-blur shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          {/* Mobile: sidebar toggle */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="md:hidden flex items-center justify-center rounded-md p-2 text-foreground hover:bg-muted/50"
                aria-label="Open hub menu"
              >
                <PanelLeft className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b border-border px-4 py-4 text-left">
                <SheetTitle className="font-serif text-lg font-semibold">
                  Hub Menu
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-0.5 p-3" aria-label="Hub navigation">
                {NAV.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={navLinkClass(href)}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <Link
            href="/hub"
            className="flex items-center gap-2 font-serif text-lg font-semibold text-foreground transition-colors hover:text-accent"
            aria-label="Promoter Hub"
          >
            <PromoHubIcon className="h-5 w-5 shrink-0" aria-hidden />
            Promoter Hub
          </Link>

          {/* Desktop: horizontal tabs */}
          <nav className="hidden md:flex flex-1 gap-1" aria-label="Hub navigation">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={navLinkClass(href)}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8">
        <HubGate roleRequired={false}>{children}</HubGate>
      </main>
    </div>
  );
}
