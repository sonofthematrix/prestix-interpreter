"use client";

import Link from "next/link";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { AppKitSignButton } from "../components/AppKitSignButton";
import { WalletInfo } from "../components/navigation/WalletInfo";
import { TokenizinWalletButton } from "../components/navigation/TokenizinWalletButton";
import { NotificationBell } from "../components/notifications/notification-bell";
import { UserNotifications } from "../components/notifications/UserNotifications";
import { WalletSessionsList } from "../components/auth/WalletSessionsList";
import { SocialWalletVerification } from "../components/auth/SocialWalletVerification";
import { DashboardLayout } from "../components/layouts/app-layout";
import { 
  Palette, 
  Wallet, 
  Target, 
  Compass, 
  Lock, 
  FlaskConical,
  Sparkles
} from "lucide-react";

export default function Home() {
  return (
    <DashboardLayout>
      <HomeContent />
    </DashboardLayout>
  );
}

function HomeContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 lg:px-8 lg:py-12">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 flex items-center gap-2 w-fit mx-auto">
              <Sparkles className="h-4 w-4" />
              AppKit Module Test
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent mb-4">
              PRESTIX.VIP AppKit Module
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400 max-w-2xl mx-auto">
              Comprehensive UI components and wallet integration for Web3 applications.
              Test sidebar navigation, authentication flows, and AppKit wallet connectivity.
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Navigation Testing */}
            <Card className="bg-card dark:bg-gray-900/50 border border-border dark:border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Compass className="h-5 w-5 text-primary dark:text-orange-400" />
                  Navigation Testing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground dark:text-gray-400">
                  Test the sidebar and header navigation components.
                </p>
                <div className="flex items-center gap-2">
                  <TokenizinWalletButton />
                  <NotificationBell />
                  <WalletInfo />
                </div>
                <div className="pt-4 border-t border-border dark:border-gray-700">
                  <p className="text-xs text-muted-foreground dark:text-gray-500 mb-2">
                    Sidebar should be visible on the left with navigation items.
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-gray-500">
                    Header should be visible at the top with user controls.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Authentication Testing */}
            <Card className="bg-card dark:bg-gray-900/50 border border-border dark:border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary dark:text-orange-400" />
                  Authentication Testing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground dark:text-gray-400">
                  Test NextAuth.js integration and wallet authentication.
                </p>
                <div className="space-y-2">
                  <Link href="/auth/signin">
                    <Button variant="default" className="w-full">
                      Sign In Page
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button variant="outline" className="w-full">
                      Sign Up Page
                    </Button>
                  </Link>
                </div>
                <div className="pt-4 border-t border-border dark:border-gray-700">
                  <AppKitSignButton />
                </div>
                <div className="pt-4 border-t border-border dark:border-gray-700">
                  <WalletSessionsList />
                </div>
                <div className="pt-4 border-t border-border dark:border-gray-700">
                  <SocialWalletVerification />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Notifications - Show when wallet is connected */}
          <div className="mb-12">
            <UserNotifications />
          </div>

          {/* Feature Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-card dark:bg-gray-900/50 border border-border dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary dark:text-orange-400" />
                  UI Components
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground dark:text-gray-400">
                  Complete set of shadcn/ui components with PRESTIX.VIP theming and responsive design.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card dark:bg-gray-900/50 border border-border dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary dark:text-orange-400" />
                  Wallet Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground dark:text-gray-400">
                  Reown AppKit integration with MetaMask, WalletConnect, and Coinbase Wallet support.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card dark:bg-gray-900/50 border border-border dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary dark:text-orange-400" />
                  Layout System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground dark:text-gray-400">
                  Responsive sidebar navigation, header components, and flexible layout variants.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Testing Instructions */}
          <Card className="mt-8 bg-card dark:bg-gray-900/50 border border-border dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary dark:text-orange-400" />
                Testing Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">&quot;Sidebar Testing&quot;:</h4>
                  <ul className="text-sm text-muted-foreground dark:text-gray-400 space-y-1">
                    <li>• Toggle &quot;sidebar collapse on desktop&quot;</li>
                    <li>• Open/close &quot;sidebar on mobile&quot;</li>
                    <li>• Navigate through &quot;menu items&quot;</li>
                    <li>• Test &quot;responsive behavior&quot;</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">&quot;Authentication Testing&quot;:</h4>
                  <ul className="text-sm text-muted-foreground dark:text-gray-400 space-y-1">
                    <li>• Click &quot;Sign In Page&quot; to test NextAuth</li>
                    <li>• Try &quot;wallet connection button&quot;</li>
                    <li>• Test &quot;form validation&quot;</li>
                    <li>• Verify &quot;session persistence&quot;</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}