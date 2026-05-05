"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Mail, Loader2, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmailAuthProps {
  onSuccess?: () => void;
  redirectUrl?: string;
}

export function EmailAuth({ onSuccess, redirectUrl = "/" }: EmailAuthProps) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOTP = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/email/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      setOtpSent(true);
      setStep("otp");
      
      // If in development, log the OTP for testing
      if (process.env.NODE_ENV === 'development' && data.otp) {
        console.log(`📧 [Email Auth] OTP for ${email}: ${data.otp}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verify OTP via API
      const verifyResponse = await fetch("/api/auth/email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || "Invalid OTP");
      }

      // Create NextAuth session
      const result = await signIn("credentials", {
        redirect: false,
        email: verifyData.user.email,
        otp: otp,
        isEmailOtpAuth: "true",
      });

      if (result?.ok) {
        console.log("✅ [Email Auth] Authentication successful");
        
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(verifyData.isNewUser ? "/auth/welcome?newUser=true" : redirectUrl);
          router.refresh();
        }
      } else {
        throw new Error(result?.error || "Authentication failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setOtp("");
    setOtpSent(false);
    setError(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          {step === "email" ? "Sign in with Email" : "Enter Verification Code"}
        </CardTitle>
        <CardDescription>
          {step === "email"
            ? "Enter your email address to receive a one-time password"
            : `We sent a 6-digit code to ${email}. Enter it below to sign in.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === "email" ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    handleSendOTP();
                  }
                }}
                autoComplete="username"
                disabled={loading}
                className="w-full"
              />
            </div>
            <Button
              onClick={handleSendOTP}
              disabled={loading || !email}
              className="w-full hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  Send Verification Code
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtp(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading && otp.length === 6) {
                    handleVerifyOTP();
                  }
                }}
                disabled={loading}
                className="w-full text-center text-2xl tracking-widest"
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the 6-digit code sent to your email
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleBackToEmail}
                disabled={loading}
                className="flex-1 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40"
              >
                Back
              </Button>
              <Button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
                className="flex-1 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Sign In"
                )}
              </Button>
            </div>

            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSendOTP}
                disabled={loading}
                className="text-xs hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300"
              >
                Resend Code
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

