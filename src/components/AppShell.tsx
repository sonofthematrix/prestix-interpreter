"use client";

import { Suspense } from "react";
import { useAppSelector } from "@/store/hooks";
import { AuthGate } from "./AuthGate";
import { AppDataLoader } from "./AppDataLoader";
import { AudienceHashSync } from "./AudienceHashSync";
import { ThemeSync } from "./ThemeSync";
import { LangParamSync } from "./LangParamSync";
import { Header } from "./Header";
import { NavDrawer } from "./NavDrawer";
import { SiteFooter } from "./SiteFooter";
import { AppKitSIWETrigger } from "./auth/AppKitSIWETrigger";

export function AppShell({ children }: { children: React.ReactNode }) {
  const language = useAppSelector((s) => s.ui.language);

  return (
    <AuthGate>
      <AppKitSIWETrigger />
      <AppDataLoader />
      <ThemeSync />
      <Suspense fallback={null}>
        <LangParamSync />
      </Suspense>
      <AudienceHashSync />
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Header />
        <main key={language} className="flex min-h-0 flex-1 flex-col pb-[var(--footer-height)]">
          {children}
        </main>
        <SiteFooter />
        <NavDrawer />
      </div>
    </AuthGate>
  );
}
