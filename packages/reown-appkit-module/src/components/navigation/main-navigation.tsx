"use client";

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { AppConfig, getNavigationByAuth } from '@/config/app';
import { NavigationIcon, HeaderLogo, IconButton, HeaderAvatar } from '@/components/brand-assets';
import { TokenizinPalaceTheme } from '@/theme/tokenizin-palace-theme';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Palette, Settings } from 'lucide-react';
import { ThemeProviderProps } from 'next-themes';
import { ClientThemeProvider } from '../client-theme-provider';
import { AppLayout} from '../layouts/app-layout';
// ThemeCustomizer is imported from root src directory
// Note: This component may need to be moved to the module or accessed differently
// import { ThemeCustomizer } from '@/components/theme/theme-customizer';

interface MainNavigationProps {
  className?: string;
  variant?: 'header' | 'sidebar' | 'mobile';
}

export function MainNavigation({ className, variant = 'header' }: MainNavigationProps) {
  const { data: session, status } = useSession();
  const isAuthenticated = !!session;
  const navigationItems = getNavigationByAuth(isAuthenticated);
  TokenizinPalaceTheme
  if (variant === 'sidebar') {
    return (
      <nav className={cn("flex flex-col space-y-2 p-4", className)}>
        {navigationItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200",
              "hover:bg-accent hover:text-accent-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            )}
          >
            <NavigationIcon name={item.icon} />
            <span className="luxury-text">{item.title}</span>
            {item.badge && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {item.badge}
              </Badge>
            )}
          </Link>
        ))}
      </nav>
    );
  }

  if (variant === 'mobile') {
    return (
      <nav className={cn("flex flex-col space-y-1 p-4", className)}>
        {navigationItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200",
              "hover:bg-accent hover:text-accent-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            )}
          >
            <NavigationIcon name={item.icon} />
            <div className="flex flex-col">
              <span className="luxury-text font-medium">{item.title}</span>
              {item.description && (
                <span className="text-xs text-muted-foreground">{item.description}</span>
              )}
            </div>
            {item.badge && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {item.badge}
              </Badge>
            )}
          </Link>
        ))}
      </nav>
    );
  }

  // Header variant (default)
  return (
    <nav className={cn("hidden md:flex items-center space-x-6", className)}>
      {navigationItems.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={cn(
            "flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200",
            "hover:bg-accent hover:text-accent-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          )}
        >
          <NavigationIcon name={item.icon} />
          <span className="luxury-text">{item.title}</span>
          {item.badge && (
            <Badge variant="secondary" className="text-xs">
              {item.badge}
            </Badge>
          )}
        </Link>
      ))}
    </nav>
  );
}

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm",
      "shadow-luxury",
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                {/* <div className="flex flex-col">
                  <span className="text-lg font-bold luxury-heading text-foreground">
                    TIGER
                  </span>
                  <span className="text-sm luxury-text text-primary">
                    Palace Pro
                  </span>
                </div> */}
              </div>
            </Link>
          </div>

          {/* Main Navigation */}
          <MainNavigation variant="header" />

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Theme Customizer - Consolidated */}
            {/* TODO: ThemeCustomizer component needs to be accessible from module package */}
            {/* <ClientThemeProvider>
              <AppLayout>
                <ClientThemeProvider>
                  <ThemeCustomizer />
                </ClientThemeProvider>  
              </AppLayout>
            </ClientThemeProvider> */}

            {/* User Actions */}
            {session ? (
              <div className="flex items-center space-x-3">
                <HeaderAvatar userId={session.user?.id} />
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <span className="text-xs">{session.user?.id}</span>
                </Badge>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/profile">Profile</Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
                <Button size="sm">
                  <Link href="/register">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  return (
    <footer className={cn(
      "border-t border-border bg-background/80 backdrop-blur-sm",
      "shadow-luxury",
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <span className="text-white font-bold">T</span>
              </div>
              {/* <div className="flex flex-col">
                <span className="text-xl font-bold luxury-heading text-foreground">
                  TIGER
                </span>
                <span className="text-sm luxury-text text-primary">
                  Palace Pro
                </span>
              </div> */}
            </div>
            <p className="luxury-text text-muted-foreground mb-4 max-w-md">
              {AppConfig.description}
            </p>
            <div className="flex space-x-4">
              {Object.entries(AppConfig.social).map(([platform, url]) => (
                <IconButton
                  key={platform}
                  icon={platform}
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(url, '_blank')}
                  tooltip={`Follow us on ${platform}`}
                />
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="luxury-heading text-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {AppConfig.navigation.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="luxury-text text-muted-foreground hover:text-primary transition-colors"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="luxury-heading text-foreground mb-4">Contact</h3>
            <div className="space-y-2">
              <p className="luxury-text text-muted-foreground">
                {AppConfig.contact.email}
              </p>
              <p className="luxury-text text-muted-foreground">
                {AppConfig.contact.phone}
              </p>
              <p className="luxury-text text-muted-foreground">
                {AppConfig.contact.address}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="luxury-text text-muted-foreground">
            © 2024 Tokenizin. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/privacy" className="luxury-text text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="luxury-text text-muted-foreground hover:text-primary transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
