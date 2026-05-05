"use client";

// import { TestCaseIntegration } from '@/components/test-case-integration';
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// This page uses next-auth hooks that require client-side context
import { AuthLogo } from "@/components/brand-assets";
import { AppLayout } from "@/components/layouts/app-layout";
import { Button } from "../../../components/ui/button";  
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppConfig } from "@/config/app";
import {
  ArrowRight,
  Building,
  Lock,
  Mail,
  Shield,
  Sparkles,
  User,
  Wallet
} from "lucide-react";

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    walletAddress: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          walletAddress: formData.walletAddress || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Automatically sign in after successful registration
        const signInResult = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (signInResult?.error) {
          setError("Account created but sign in failed. Please try signing in manually.");
        } else {
          router.push("/");
          router.refresh();
        }
      } else {
        setError(result.error || "Registration failed");
      }
    } catch (error) {
      setError("An error occurred during registration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout showSidebar={true} showHeader={true}>
      <div className="auth-page flex items-center justify-center min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <AuthLogo />
            </div>
            <h1 className="text-3xl font-bold luxury-heading text-foreground mb-2">
              Create Your Account
            </h1>
            <p className="text-lg luxury-text text-muted-foreground">
              Join {AppConfig.siteName} and start building amazing applications
            </p>
          </div>
          {/* Main Card */}
          <Card className="luxury-border shadow-elevated">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl luxury-heading text-foreground">
                Sign Up
              </CardTitle>
              <CardDescription className="luxury-text text-muted-foreground">
                Create your premium marketplace account
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium luxury-text text-foreground">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      className="pl-10 luxury-border focus:ring-primary focus:border-primary"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium luxury-text text-foreground">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="pl-10 luxury-border focus:ring-primary focus:border-primary"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium luxury-text text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="pl-10 luxury-border focus:ring-primary focus:border-primary"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium luxury-text text-foreground dark:text-white">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-gray-400" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="pl-10 luxury-border focus:ring-primary focus:border-primary bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Wallet Address Field (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="walletAddress" className="text-sm font-medium luxury-text text-foreground dark:text-white">
                    Wallet Address <span className="text-xs text-muted-foreground dark:text-gray-400">(Optional)</span>
                  </Label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-gray-400" />
                    <Input
                      id="walletAddress"
                      name="walletAddress"
                      type="text"
                      autoComplete="off"
                      className="pl-10 luxury-border focus:ring-primary focus:border-primary bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                      placeholder="0x... (Optional)"
                      value={formData.walletAddress}
                      onChange={handleChange}
                      pattern="^0x[a-fA-F0-9]{40}$"
                      title="Enter a valid Ethereum address (0x followed by 40 hexadecimal characters)"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                    Link your Ethereum wallet for Web3 features
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {/* Sign Up Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full gradient-primary shadow-elevated hover:shadow-luxury transition-all duration-300"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Create Account
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-sm luxury-text text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/auth/signin"
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-card/50 backdrop-blur-sm rounded-lg luxury-border">
              <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-xs luxury-text text-muted-foreground">Secure & Private</p>
            </div>
            <div className="text-center p-4 bg-card/50 backdrop-blur-sm rounded-lg luxury-border">
              <Sparkles className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-xs luxury-text text-muted-foreground">AI-Powered Tools</p>
            </div>
            <div className="text-center p-4 bg-card/50 backdrop-blur-sm rounded-lg luxury-border">
              <Building className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-xs luxury-text text-muted-foreground">Premium Features</p>
            </div>
          </div>
        </div>
        
        {/* Test Case Integration - Outside form to avoid nested button */}
        {/* <TestCaseIntegration /> */}
      </div>
    </AppLayout>
  );
}
