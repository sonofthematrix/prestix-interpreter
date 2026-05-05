'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'; 
import { ArrowRight, CheckCircle2, Newspaper, User, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NewUserWelcomeProps {
  onNavigate?: (path: string) => void;
}

/**
 * New User Welcome Page
 * 
 * Shown after successful wallet/social/email authentication for new users.
 * Provides intuitive navigation options to key areas of the platform.
 */
export function NewUserWelcome({ onNavigate }: NewUserWelcomeProps) {
  const router = useRouter();

  const handleNavigation = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      router.push(path);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-6">
        {/* Success Alert */}
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900 dark:text-green-100">
            Account Created Successfully!
          </AlertTitle>
          <AlertDescription className="text-green-800 dark:text-green-200">
            Welcome to RWA Market Pro! Your account has been set up and you're ready to start exploring.
          </AlertDescription>
        </Alert>

        {/* Main Card */}
        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold">
              Welcome to RWA Market Pro
            </CardTitle>
            <CardDescription className="text-lg">
              Get started by exploring one of these areas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Navigation Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* View Tokens */}
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow border-border hover:border-primary/50"
                onClick={() => handleNavigation('/profile/tokens')}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-3 rounded-full bg-primary/10 dark:bg-primary/20">
                      <Wallet className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">View Tokens</h3>
                      <p className="text-sm text-muted-foreground">
                        Explore your token holdings and investments
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigation('/profile/tokens');
                      }}
                    >
                      View Tokens
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Profile */}
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow border-border hover:border-primary/50"
                onClick={() => handleNavigation('/profile')}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-3 rounded-full bg-primary/10 dark:bg-primary/20">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Profile</h3>
                      <p className="text-sm text-muted-foreground">
                        Complete your profile and settings
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigation('/profile');
                      }}
                    >
                      Go to Profile
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Community Blog */}
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow border-border hover:border-primary/50"
                onClick={() => handleNavigation('/blog')}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-3 rounded-full bg-primary/10 dark:bg-primary/20">
                      <Newspaper className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Community</h3>
                      <p className="text-sm text-muted-foreground">
                        Read blog posts and news
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigation('/blog');
                      }}
                    >
                      View Blog
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Or Continue to Home */}
            <div className="pt-4 border-t border-border">
              <Button
                variant="ghost"
                className="w-full hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300"
                onClick={() => handleNavigation('/')}
              >
                Or continue to home
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

