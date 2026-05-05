"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, Chrome } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface NextAuthSignInFormProps {
  onSuccess?: () => void;
  redirectUrl?: string;
}

export function NextAuthSignInForm({ onSuccess, redirectUrl = "/" }: NextAuthSignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError(result.error === "CredentialsSignin" 
          ? "Invalid email or password" 
          : result.error);
        return;
      }

      if (result?.ok) {
        console.log("✅ [NextAuth] Email/password sign-in successful");
        
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(redirectUrl);
          router.refresh();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      // CRITICAL: For OAuth providers like Google, we MUST use redirect: true
      // This allows NextAuth to redirect the browser to Google's OAuth authorization page
      // With redirect: false, NextAuth won't redirect and Google OAuth won't work
      const result = await signIn("google", {
        redirect: true, // REQUIRED for OAuth providers - enables redirect to Google
        callbackUrl: redirectUrl,
      });

      // If redirect: true, signIn will redirect the browser and this code won't execute
      // If there's an error before redirect, result will contain error
      if (result?.error) {
        setError("Google sign-in failed. Please try again.");
        setLoading(false);
        return;
      }

      // If result.url exists (shouldn't happen with redirect: true, but handle it)
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Email/Password Form */}
      <form onSubmit={handleEmailPasswordSignIn} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-foreground dark:text-white">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-gray-400" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="pl-10 bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
              required
              autoComplete="username"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-foreground dark:text-white">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-gray-400" />
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="pl-10 bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In with Email"
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card dark:bg-gray-800 px-2 text-muted-foreground dark:text-gray-400">
            Or continue with
          </span>
        </div>
      </div>

      {/* Google OAuth Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Chrome className="h-4 w-4 mr-2" />
            Sign in with Google
          </>
        )}
      </Button>
    </div>
  );
}

