"use client";

import { ClientThemeProvider } from '@/components/client-theme-provider';
import { HeaderErrorBoundary, LayoutErrorBoundary, SidebarErrorBoundary } from '@/components/error-boundary';
import { AppHeader } from '@/components/navigation/app-header';
import { AppSidebar } from '@/components/navigation/app-sidebar';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useBreakpointEffect, useSidebarStore } from '@/utils/sidebar-store';
import { usePathname } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
  showSidebar?: boolean;
  showHeader?: boolean;
}

export function AppLayout({
  children,
  className,
  showSidebar = true,
  showHeader = true
}: AppLayoutProps) {
  const { isAuthenticated } = useAuth();

  // Zustand store state
  const {
    collapsed: sidebarCollapsed,
    toggled: sidebarOpen,
    isMobile,
    currentBreakpoint,
    toggleSidebar,
    toggleCollapsed,
    closeOnMobile
  } = useSidebarStore();

  const [mounted, setMounted] = useState(false);

  // Initialize responsive behavior
  useBreakpointEffect();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    console.log('Sidebar toggle clicked:', {
      isMobile,
      sidebarOpen,
      currentBreakpoint,
      windowWidth: typeof window !== 'undefined' ? window.innerWidth : 'N/A'
    });

    if (isMobile) {
      toggleSidebar();
    } else {
      toggleCollapsed();
    }
  };

  const handleSidebarClose = () => {
    closeOnMobile();
  };

  // Handle route changes for mobile sidebar
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  
  useEffect(() => {
    // Only close sidebar if pathname actually changed and we're on mobile
    if (previousPathname.current !== pathname && isMobile && sidebarOpen) {
      closeOnMobile();
    }
    previousPathname.current = pathname;
  }, [pathname, isMobile, sidebarOpen, closeOnMobile]);

  // Handle escape key for mobile sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobile && sidebarOpen) {
        closeOnMobile();
      }
    };

    if (isMobile && sidebarOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when mobile sidebar is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, sidebarOpen, closeOnMobile]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <LayoutErrorBoundary>
      <ClientThemeProvider>
        <div className="min-h-screen bg-background">
          {/* Header */}
          {showHeader && (
            <HeaderErrorBoundary>
              <AppHeader
                onMenuToggle={handleSidebarToggle}
                sidebarOpen={sidebarOpen}
                sidebarCollapsed={sidebarCollapsed}
              />
            </HeaderErrorBoundary>
          )}

          <div className="flex h-[calc(100vh-4rem)]">
            {/* Sidebar */}
            {showSidebar && (
              <>
                {/* Desktop Sidebar */}
                <div className="hidden md:flex">
                  <SidebarErrorBoundary>
                    <AppSidebar
                      isOpen={true}
                      className="h-full"
                    />
                  </SidebarErrorBoundary>
                </div>

                {/* Mobile Sidebar Overlay */}
                {sidebarOpen && isMobile && (
                  <div className="md:hidden fixed inset-0 z-[60]">
                    {/* Backdrop - covers screen below header to keep header visible */}
                    <div
                      className="fixed top-16 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm"
                      onClick={handleSidebarClose}
                    />
                    {/* Sidebar - positioned below header with visual separation */}
                    <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-80 max-w-[85vw] z-[61] border-t border-border dark:border-gray-700 shadow-2xl">
                      <SidebarErrorBoundary>
                        <AppSidebar
                          isOpen={true}
                          onClose={handleSidebarClose}
                          className="h-full"
                        />
                      </SidebarErrorBoundary>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Main Content */}
            <main className={cn(
              "flex-1 overflow-auto transition-all duration-300",
              showSidebar && "md:ml-0", // No margin on desktop since sidebar is fixed
              className
            )}>
              <div className="h-full">
                {children}
              </div>
            </main>
          </div>
        </div>
      </ClientThemeProvider>
    </LayoutErrorBoundary>
  );
}

// Layout variants for different page types
export function DashboardLayout({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <AppLayout showSidebar={true} showHeader={true} className={className}>
      {children}
    </AppLayout>
  );
}

export function AuthLayout({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <AppLayout showSidebar={false} showHeader={false} className={className}>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </AppLayout>
  );
}

export function DocsLayout({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <AppLayout showSidebar={true} showHeader={true} className={className}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8 lg:px-8 lg:py-12">
          <div className="max-w-7xl mx-auto">
            {/* Docs Content with Brand Styling */}
            <div className="bg-card dark:bg-gray-900/50 border border-border dark:border-gray-800 rounded-2xl shadow-xl backdrop-blur-sm">
              <div className="p-6 lg:p-8">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export function LandingLayout({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <AppLayout showSidebar={false} showHeader={true} className={className}>
      {children}
    </AppLayout>
  );
}
