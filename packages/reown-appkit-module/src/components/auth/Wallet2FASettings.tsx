"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAccount, useConnect } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shield, Wallet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { obfuscateWalletAddress } from "@/lib/utils";
import { createClient } from "@/lib/db";
import { User } from "../../../zenstack/models"; 

/**
 * Wallet 2FA Settings Component
 * 
 * Allows users to:
 * - Configure wallet address for 2FA
 * - Enable/disable wallet 2FA
 * - View wallet connection status
 */
export function Wallet2FASettings() {
  const { data: session, update } = useSession();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [wallet2FAEnabled, setWallet2FAEnabled] = useState(false);
  const [authMethod, setAuthMethod] = useState<string>("email");

  // Load current settings
  useEffect(() => {
    if (!session?.user?.id) return;

    const loadSettings = async () => {
      try {
        // Convert session user to AuthUser format
        const authUser = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.name || '',
          role: (session.user as any)?.role || 'CUSTOMER',
        };
        const db = await createClient(authUser);
        const user = await db.user.findUnique({
          where: { id: session.user.id },
        });
        if (user) {
          setWalletAddress(user.walletAddress || null);
          setAuthMethod(user.authMethod || "email");
          // Wallet 2FA is enabled if authMethod is "both"
          setWallet2FAEnabled(user.authMethod === "both");
        }
      } catch (error) {
        console.error("Failed to load wallet 2FA settings:", error);
        toast({
          title: "Error",
          description: "Failed to load wallet settings",
          variant: "destructive",
        });
      }
    };

    loadSettings();
  }, [session, toast]);

  const handleConnectWallet = async () => {
    if (!connectors || connectors.length === 0) {
      toast({
        title: "No Wallet Available",
        description: "Please install a wallet extension like MetaMask",
        variant: "destructive",
      });
      return;
    }

    try {
      await connect({ connector: connectors[0] });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  const handleSaveWalletAddress = async () => {
    if (!address || !session?.user?.id) return;

    setSaving(true);
    try {
      // Convert session user to AuthUser format
      const authUser = {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.name || '',
        role: (session.user as any)?.role || 'CUSTOMER',
      };
      const db = await createClient(authUser);
      await db.user.update({
        where: { id: session.user.id },
        data: {
          walletAddress: address,
          // Keep current authMethod, don't change it automatically
        },
      });

      setWalletAddress(address);
      await update(); // Refresh session

      toast({
        title: "Wallet Address Saved",
        description: "Your wallet address has been configured",
      });
    } catch (error) {
      console.error("Failed to save wallet address:", error);
      toast({
        title: "Error",
        description: "Failed to save wallet address",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle2FA = async (enabled: boolean) => {
    if (!session?.user?.id) return;

    if (enabled && !walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please configure a wallet address first",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Convert session user to AuthUser format
      const authUser = {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.name || '',
        role: (session.user as any)?.role || 'CUSTOMER',
      };
      const db = await createClient(authUser);
      const newAuthMethod = enabled ? "both" : "email";

      await db.user.update({
        where: { id: session.user.id },
        data: {
          authMethod: newAuthMethod,
        },
      });

      setWallet2FAEnabled(enabled);
      setAuthMethod(newAuthMethod);
      await update(); // Refresh session

      toast({
        title: enabled ? "Wallet 2FA Enabled" : "Wallet 2FA Disabled",
        description: enabled
          ? "You'll need to sign with your wallet on next login"
          : "Wallet 2FA has been disabled",
      });
    } catch (error) {
      console.error("Failed to update wallet 2FA:", error);
      toast({
        title: "Error",
        description: "Failed to update wallet 2FA settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const configuredWallet = walletAddress || (isConnected ? address : null);
  const walletMatches = walletAddress && address && walletAddress.toLowerCase() === address.toLowerCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
          <Shield className="h-5 w-5" />
          Wallet-Based 2FA
        </CardTitle>
        <CardDescription>
          Add an extra layer of security by requiring wallet signature for authentication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Wallet Address Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-foreground dark:text-white">Wallet Address</Label>
              <p className="text-sm text-muted-foreground dark:text-gray-400">
                Connect your wallet to enable 2FA
              </p>
            </div>
            {configuredWallet && (
              <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                <CheckCircle className="h-3 w-3 mr-1" />
                Configured
              </Badge>
            )}
          </div>

          {configuredWallet ? (
            <div className="space-y-2">
              <div className="p-3 bg-muted dark:bg-gray-900 rounded-md">
                <p className="text-sm font-mono text-foreground dark:text-white">
                  {obfuscateWalletAddress(configuredWallet)}
                </p>
              </div>
              {isConnected && walletMatches && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Connected wallet matches configured address
                  </AlertDescription>
                </Alert>
              )}
              {isConnected && !walletMatches && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Connected wallet does not match configured address
                  </AlertDescription>
                </Alert>
              )}
              {!isConnected && (
                <Button
                  onClick={handleConnectWallet}
                  variant="outline"
                  className="w-full hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect Wallet
                </Button>
              )}
              {isConnected && address && !walletAddress && (
                <Button
                  onClick={handleSaveWalletAddress}
                  disabled={saving}
                  className="w-full hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4 mr-2" />
                      Save Wallet Address
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {!isConnected ? (
                <Button
                  onClick={handleConnectWallet}
                  variant="outline"
                  className="w-full hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect Wallet
                </Button>
              ) : (
                <Button
                  onClick={handleSaveWalletAddress}
                  disabled={saving}
                  className="w-full hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4 mr-2" />
                      Save Wallet Address
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Wallet 2FA Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50 dark:bg-gray-900/50">
          <div className="space-y-0.5">
            <Label htmlFor="wallet-2fa" className="text-foreground dark:text-white">
              Enable Wallet 2FA
            </Label>
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              Require wallet signature in addition to email/password authentication
            </p>
          </div>
          <Switch
            id="wallet-2fa"
            checked={wallet2FAEnabled}
            onCheckedChange={handleToggle2FA}
            disabled={saving || !configuredWallet}
          />
        </div>

        {wallet2FAEnabled && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Wallet 2FA is enabled. You'll need to sign with your wallet on your next login.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

