"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAccount, useSignMessage } from "wagmi";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Wallet2FAPromptProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Wallet 2FA Prompt Component
 * 
 * Displays when a user with wallet 2FA enabled needs to verify their wallet signature.
 * This component:
 * - Fetches the SIWE message for 2FA
 * - Requests wallet signature via wagmi
 * - Verifies the signature with the backend
 * - Completes the 2FA verification
 */
export function Wallet2FAPrompt({ onSuccess, onCancel }: Wallet2FAPromptProps) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [nonce, setNonce] = useState<string | null>(null);

  // Fetch 2FA message when component mounts
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchMessage = async () => {
      try {
        const response = await fetch("/api/auth/wallet-2fa/message");
        if (!response.ok) {
          throw new Error("Failed to fetch 2FA message");
        }
        
        const data = await response.json();
        setMessage(data.message);
        setNonce(data.nonce);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize 2FA");
      }
    };

    fetchMessage();
  }, [session]);

  const handleVerify = async () => {
    if (!address || !isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    if (!message || !nonce) {
      setError("2FA message not ready. Please wait...");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Sign the message with wallet
      console.log("🔐 [Wallet2FA] Requesting signature...");
      const signature = await signMessageAsync({ 
        account: address,
        message 
      });

      console.log("✅ [Wallet2FA] Signature received, verifying...");

      // Step 2: Verify signature with backend
      const verifyResponse = await fetch("/api/auth/wallet-2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature,
          message,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || "2FA verification failed");
      }

      const verifyData = await verifyResponse.json();
      
      if (!verifyData.success) {
        throw new Error(verifyData.error || "2FA verification failed");
      }

      console.log("✅ [Wallet2FA] Verification successful");

      // Step 3: Update session to clear pending 2FA flag
      await update();

      toast({
        title: "2FA Verified",
        description: "Wallet authentication successful",
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "2FA verification failed";
      setError(errorMessage);
      console.error("❌ [Wallet2FA] Verification error:", err);
      
      toast({
        title: "2FA Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user?.wallet2FARequired) {
    return null; // Don't show if 2FA not required
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle className="text-foreground dark:text-white">
            Wallet 2FA Required
          </CardTitle>
        </div>
        <CardDescription>
          Please sign a message with your wallet to complete authentication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isConnected && (
          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to continue with 2FA verification.
            </AlertDescription>
          </Alert>
        )}

        {message && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              You'll be asked to sign this message:
            </p>
            <div className="p-3 bg-muted dark:bg-gray-900 rounded-md">
              <p className="text-xs font-mono text-foreground dark:text-white break-all">
                {message}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleVerify}
            disabled={loading || !isConnected || !message}
            className="flex-1 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Verify with Wallet
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

