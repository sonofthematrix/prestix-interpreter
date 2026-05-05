/**
 * Marketplace Component Templates
 * Templates for auto-generating marketplace-specific components with video carousel support
 */

export interface MarketplaceTemplateConfig {
    modelName: string;
    hasVideo?: boolean;
    videoMapping?: 'auto' | 'manual' | 'property-based';
    carouselType?: 'hover' | 'auto-play' | 'manual';
    imageFields: string[];
    videoField?: string;
}

/**
 * Generate marketplace card component with hover video support
 */
export function generateMarketplaceCardTemplate(config: MarketplaceTemplateConfig): string {
    const { modelName, hasVideo = true, imageFields } = config;
    const lowerName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const primaryImageField = imageFields[0] || 'imageUrl';

    return `'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Heart, 
  Home, 
  Bed, 
  Bath, 
  Calendar, 
  Ruler, 
  Users, 
  CheckCircle2,
  Sparkles,
  Star,
  ExternalLink,
  DollarSign,
  Tag,
  Coins,
  ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PropertyLocationDialog } from './PropertyLocationDialog';
import { PurchaseDialog } from './PurchaseDialog';

interface ${modelName}CardProps {
  ${lowerName}: {
    id: string;
    ${primaryImageField}: string;
    title?: string;
    name?: string;
    description?: string;
    status?: string;
    location?: string;
    gpsLat?: number | null;
    gpsLng?: number | null;
    tokenPrice?: number;
    totalTokens?: number;
    soldTokens?: number;
    availableTokens?: number;
    expectedRoi?: number;
    assetType?: string;
    bedrooms?: number;
    bathrooms?: number;
    buildSize?: number;
    landSize?: number;
    constructionYear?: number;
    features?: string[];
    tokenHolders?: { id: string; userId: string }[];
    documents?: { id: string; verificationStatus?: string; category?: string }[];
    complianceRating?: number;
    rentalIncome?: number;
    rentalIncomeDays?: number;
    contractAddress?: string; // Blockchain contract address
    chainId?: number; // Chain ID (1 = Ethereum, 137 = Polygon, etc.)
    images?: { id: string; url: string }[];
    videoUrl?: string;
    [key: string]: any;
  };
  propertyIndex?: number;
  className?: string;
}

// Helper function to get video URL for ${modelName}
function getVideoUrl(${lowerName}: any, propertyIndex?: number): string | null {
  ${
      hasVideo
          ? `
  // Return null if ${lowerName} is not provided
  if (!${lowerName}) return null;
  
  // Strategy 1: Extract from imageUrl pattern (e.g., /images/v1p1.png -> 1)
  const imageMatch = ${lowerName}.${primaryImageField}?.match(/v(\\d+)p/);
  const extractedIndex = imageMatch ? parseInt(imageMatch[1]) : null;
  
  // Use provided index or extracted index
  const videoIndex = propertyIndex ?? extractedIndex;
  
  // Map to available video files (prop1.mp4 through prop5.mp4)
  if (videoIndex && videoIndex >= 1 && videoIndex <= 5) {
    return \`/videos/marketplace/prop\${videoIndex}.mp4\`;
  }
  `
          : ''
  }
  return null;
}

// Helper function to check if property is verified
function isPropertyVerified(${lowerName}: any): boolean {
  const documents = ${lowerName}.documents || [];
  const complianceRating = ${lowerName}.complianceRating || 0;
  
  // Property is verified if it has documents and high compliance rating
  const hasVerifiedDocs = documents.length > 0 && 
    documents.some((doc: any) => doc.verificationStatus === 'VERIFIED');
  
  return hasVerifiedDocs || complianceRating >= 8;
}

// Helper function to get unique token holders count
function getUniqueHoldersCount(${lowerName}: any): number {
  const tokenHolders = ${lowerName}.tokenHolders || [];
  // Since tokenHolders has unique constraint on [realEstateAssetId, userId], 
  // the length is already the count of unique holders
  return tokenHolders.length;
}

// Helper function to check verification status by category
function getVerificationStatus(${lowerName}: any) {
  const documents = ${lowerName}.documents || [];
  const complianceRating = ${lowerName}.complianceRating || 0;
  
  const hasVerifiedDoc = (category: string) => {
    return documents.some(
      (doc: any) => 
        doc.category?.toUpperCase() === category.toUpperCase() && 
        doc.verificationStatus === 'VERIFIED'
    );
  };
  
  return {
    landAndBuilding: hasVerifiedDoc('LEGAL') || hasVerifiedDoc('TECHNICAL'),
    insurance: hasVerifiedDoc('TECHNICAL') && complianceRating >= 7,
    ownerKYC: hasVerifiedDoc('COMPLIANCE'),
    financials: hasVerifiedDoc('FINANCIAL') || (${lowerName}.rentalIncome && ${lowerName}.rentalIncome > 0),
    ecoFriendly: complianceRating >= 8 || ${lowerName}.features?.some((f: string) => 
      f.toLowerCase().includes('eco') || 
      f.toLowerCase().includes('solar') || 
      f.toLowerCase().includes('energy')
    ),
  };
}

// Helper function to get blockchain explorer URL
function getBlockchainExplorerUrl(contractAddress: string | undefined, chainId?: number): string | null {
  if (!contractAddress) return null;
  
  // Default to Sepolia testnet (our testing environment)
  const chain = chainId || 11155111;
  
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io/token',           // Ethereum Mainnet
    5: 'https://goerli.etherscan.io/token',    // Goerli Testnet (deprecated)
    11155111: 'https://sepolia.etherscan.io/token', // Sepolia Testnet ⭐ DEFAULT
    137: 'https://polygonscan.com/token',      // Polygon Mainnet
    80001: 'https://mumbai.polygonscan.com/token', // Mumbai Testnet
    56: 'https://bscscan.com/token',           // BSC Mainnet
    97: 'https://testnet.bscscan.com/token',   // BSC Testnet
  };
  
  const baseUrl = explorers[chain] || explorers[11155111]; // Fallback to Sepolia
  return \`\${baseUrl}/\${contractAddress}\`;
}

// Helper function to format contract address for display (first 6 + last 4 chars)
function formatContractAddress(address: string | undefined): string {
  if (!address) return 'N/A';
  if (address.length < 12) return address;
  return \`\${address.slice(0, 6)}...\${address.slice(-4)}\`;
}

export function ${modelName}Card({ 
  ${lowerName}, 
  propertyIndex,
  className 
}: ${modelName}CardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isHovering, setIsHovering] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isCheckingFavorite, setIsCheckingFavorite] = useState(true);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageCarouselInterval, setImageCarouselInterval] = useState<NodeJS.Timeout | null>(null);
  const videoUrl = getVideoUrl(${lowerName}, propertyIndex);

  // Calculate token progress
  const totalTokens = ${lowerName}.totalTokens || 100;
  const soldTokens = ${lowerName}.soldTokens || 0;
  const tokensSoldPercentage = (soldTokens / totalTokens) * 100;
  
  // Get property verification status and unique holders
  const isVerified = isPropertyVerified(${lowerName});
  const uniqueHolders = getUniqueHoldersCount(${lowerName});
  const verificationStatus = getVerificationStatus(${lowerName});
  
  // Get top 3 features for display
  const topFeatures = (${lowerName}.features || []).slice(0, 3);

  // Check if property is favorited on mount
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        const response = await fetch('/api/marketplace/favorites');
        
        if (response.ok) {
          const data = await response.json();
          const favorites = data.favorites || [];
          const isFav = favorites.some(
            (fav: any) => fav.realEstateAssetId === ${lowerName}.id
          );
          setIsFavorited(isFav);
        }
      } catch (error) {
        // Silently fail - user can still try to favorite
        console.debug('Could not check favorite status:', error);
      } finally {
        setIsCheckingFavorite(false);
      }
    };

    checkFavoriteStatus();
  }, [${lowerName}.id]);

  // Handle video playback on hover
  useEffect(() => {
    if (videoRef.current) {
      if (isHovering) {
        videoRef.current.play().catch(err => {
          console.log('Video autoplay prevented:', err);
        });
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isHovering]);

  const handleCardClick = () => {
    router.push(\`/marketplace/\${${lowerName}.id}\`);
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const response = await fetch('/api/marketplace/favorites', {
        method: isFavorited ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: ${lowerName}.id }),
      });

      if (response.status === 401) {
        // User not authenticated - show toast and redirect
        toast({
          title: "Authentication Required",
          description: "Please sign in to save properties to your favorites",
          variant: "destructive",
        });
        setTimeout(() => {
          router.push('/auth/signin?callbackUrl=' + encodeURIComponent('/marketplace'));
        }, 1500);
        return;
      }

      if (response.ok) {
        const wasAlreadyFavorited = isFavorited;
        setIsFavorited(!isFavorited);
        
        // Show success toast
        toast({
          title: wasAlreadyFavorited ? "Removed from Favorites" : "Added to Favorites",
          description: wasAlreadyFavorited 
            ? "Property removed from your favorites list" 
            : "Property saved to your favorites list",
          variant: "default",
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || 'Failed to update favorite';
        const errorCode = errorData.code;
        
        console.error('Failed to update favorite:', errorMessage, errorData);
        
        // Show user-friendly error toast
        if (errorCode === 'USER_NOT_FOUND') {
          // User session is valid but account doesn't exist
          toast({
            title: "Account Not Found",
            description: "Your account no longer exists. Please sign out and sign in again.",
            variant: "destructive",
          });
          // Redirect to sign-in after 3 seconds
          setTimeout(() => {
            router.push('/auth/signin?callbackUrl=' + encodeURIComponent('/marketplace'));
          }, 3000);
        } else if (response.status === 409) {
          // Property already in favorites - sync state
          setIsFavorited(true);
          toast({
            title: "Already in Favorites",
            description: "This property is already saved to your favorites",
            variant: "default",
          });
        } else if (response.status === 404) {
          toast({
            title: "Not Found",
            description: "Property not found in your favorites",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: \`Failed to update favorites: \${errorMessage}\`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Network error updating favorite:', error);
      toast({
        title: "Network Error",
        description: "Please check your connection and try again",
        variant: "destructive",
      });
    }
  };

  const handleLocationClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking location
    setShowLocationDialog(true);
  };

  return (
    <Card 
      className={cn(
        'overflow-hidden hover:shadow-lg dark:hover:shadow-gray-900/50 transition-shadow duration-300 group cursor-pointer',
        'bg-card dark:bg-gray-800 border-border dark:border-gray-700',
        className
      )}
      onClick={handleCardClick}
    >
      {/* Media Display */}
      <div 
        className="relative h-64 w-full overflow-hidden bg-gray-100 dark:bg-gray-900"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Static Image */}
        <Image
          src={${lowerName}.${primaryImageField}}
          alt={${lowerName}.title || ${lowerName}.name || '${modelName}'}
          fill
          className={\`object-cover transition-all duration-300 \${
            isHovering && videoUrl ? 'opacity-0' : 'opacity-100 group-hover:scale-105'
          }\`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={false}
        />
        
        {/* Video on hover */}
        ${
            hasVideo
                ? `{videoUrl && (
          <video
            ref={videoRef}
            className={\`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 \${
              isHovering ? 'opacity-100' : 'opacity-0'
            }\`}
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        )}`
                : ''
        }
        
        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          disabled={isCheckingFavorite}
          className={cn(
            "absolute top-3 right-3 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 shadow-lg hover:scale-110 z-10",
            isCheckingFavorite && "opacity-50 cursor-not-allowed"
          )}
          aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart 
            className={cn(
              "h-5 w-5 transition-all duration-200",
              isFavorited 
                ? "fill-red-500 text-red-500" 
                : "text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-500",
              isCheckingFavorite && "animate-pulse"
            )}
          />
        </button>
        
        {/* Token Progress Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-white/90">
              <span>{soldTokens.toLocaleString()} sold</span>
              <span>{(totalTokens - soldTokens).toLocaleString()} available</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/20">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500 ease-out"
                style={{ width: \`\${Math.max(tokensSoldPercentage, 0)}%\` }}
              />
            </div>
            <p className="text-xs text-white/80 text-center">
              {tokensSoldPercentage.toFixed(1)}% funded
            </p>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-foreground dark:text-white transition-colors line-clamp-1">
                {${lowerName}.title || ${lowerName}.name}
              </h3>
              {isVerified && (
                <CheckCircle2 
                  className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" 
                  aria-label="Verified Property"
                />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            {${lowerName}.status && (
              <Badge 
                className={cn(
                  'text-xs font-medium',
                  ${lowerName}.status === 'ACTIVE' 
                    ? 'bg-orange-600 hover:bg-orange-700 text-white dark:bg-orange-500 dark:hover:bg-orange-600' 
                    : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                )}
              >
                {${lowerName}.status}
              </Badge>
            )}
            {${lowerName}.assetType && (
              <Badge 
                variant="outline"
                className="text-xs border-border dark:border-gray-600 text-foreground dark:text-gray-300"
              >
                <Home className="h-3 w-3 mr-1" />
                {${lowerName}.assetType}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-4">
        <p className="text-sm text-muted-foreground dark:text-gray-400 line-clamp-2">
          {${lowerName}.description}
        </p>
        
        {/* ━━━━━━━━━━━━ TOKEN DETAILS SECTION ━━━━━━━━━━━━ */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Coins className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <h4 className="text-xs font-semibold text-foreground dark:text-white uppercase tracking-wide">
              Token Details
            </h4>
          </div>
          
          {/* Token Info Icons - Horizontal Layout matching Features */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 py-2 border-y border-border dark:border-gray-700">
            {/* Value */}
            <div className="flex items-center gap-1.5 text-sm text-foreground dark:text-gray-300" title="Asset Value">
              <DollarSign className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
              <span className="font-bold truncate">
                \$\{((${lowerName}.price || (Number(${lowerName}.tokenPrice) * Number(${lowerName}.totalTokens))) / 1000).toFixed(0)}k
              </span>
            </div>
            
            {/* Price */}
            <div className="flex items-center gap-1.5 text-sm text-foreground dark:text-gray-300" title="Token Price">
              <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-bold truncate">
                \$\{Number(${lowerName}.tokenPrice).toLocaleString()}
              </span>
            </div>
            
            {/* Available Tokens */}
            <div className="flex items-center gap-1.5 text-sm text-foreground dark:text-gray-300" title="Available / Total Tokens">
              <Coins className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
              <span className="font-bold truncate">
                {(${lowerName}.availableTokens ?? (Number(${lowerName}.totalTokens) - Number(soldTokens))).toLocaleString()}/{totalTokens.toLocaleString()}
              </span>
            </div>
            
            {/* Holders */}
            <div className="flex items-center gap-1.5 text-sm text-foreground dark:text-gray-300" title="Number of Token Holders">
              <Users className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="font-bold flex items-center gap-0.5">
                {uniqueHolders.toLocaleString()}
                {/* Show indicator if holder count is estimated */}
                {soldTokens > 0 && (${lowerName}.tokenHolders || []).length === 0 && (
                  <span 
                    className="text-xs text-amber-600 dark:text-amber-400" 
                    title="Estimated based on sold tokens (actual holder data not available)"
                  >
                    ~
                  </span>
                )}
              </span>
            </div>
          </div>
          
          {/* Contract Address Link */}
          {${lowerName}.contractAddress && (
            <a
              href={getBlockchainExplorerUrl(${lowerName}.contractAddress, ${lowerName}.chainId) || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-between gap-2 text-xs text-blue-700 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors group"
              title="View on Sepolia Etherscan"
            >
              <div className="flex items-center gap-1.5">
                <ExternalLink className="h-3 w-3 shrink-0 group-hover:scale-110 transition-transform" />
                <code className="font-mono font-semibold">
                  {formatContractAddress(${lowerName}.contractAddress)}
                </code>
              </div>
              <span className="text-[10px] text-muted-foreground dark:text-gray-500">Sepolia</span>
            </a>
          )}
          
          {/* Quick Purchase Button */}
          <Button 
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click navigation
              setShowPurchaseDialog(true);
            }}
            disabled={!${lowerName}.availableTokens || ${lowerName}.availableTokens === 0}
            className="w-full bg-gradient-to-r from-orange-700 to-orange-600 hover:from-orange-700 hover:to-orange-600 dark:from-orange-500 dark:to-orange-500 dark:hover:from-orange-600 dark:hover:to-orange-500 text-primary-foreground font-semibold shadow-lg shadow-orange-500/30 dark:shadow-orange-400/20 hover:shadow-xl hover:shadow-orange-500/40 dark:hover:shadow-orange-400/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            size="sm"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {${lowerName}.availableTokens && ${lowerName}.availableTokens > 0 ? 'Buy Token' : 'Sold Out'}
          </Button>
        </div>
        
        {/* ━━━━━━━━━━━━ FEATURES & AMENITIES SECTION ━━━━━━━━━━━━ */}
        <div className="space-y-3 pt-2 border-t border-border dark:border-gray-700">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <h4 className="text-xs font-semibold text-foreground dark:text-white uppercase tracking-wide">
              Features & Amenities
            </h4>
          </div>
          
          {/* Property Details Icons - Responsive Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 py-2 border-y border-border dark:border-gray-700">
            {${lowerName}.bedrooms && (
              <div className="flex items-center gap-1.5 text-sm text-foreground dark:text-gray-300" title="Bedrooms">
                <Bed className="h-4 w-4 text-muted-foreground dark:text-gray-400 shrink-0" />
                <span className="font-medium">{${lowerName}.bedrooms}</span>
              </div>
            )}
            {${lowerName}.bathrooms && (
              <div className="flex items-center gap-1.5 text-sm text-foreground dark:text-gray-300" title="Bathrooms">
                <Bath className="h-4 w-4 text-muted-foreground dark:text-gray-400 shrink-0" />
                <span className="font-medium">{${lowerName}.bathrooms}</span>
              </div>
            )}
            {(${lowerName}.buildSize || ${lowerName}.landSize) && (
              <div className="flex items-center gap-1.5 text-sm text-foreground dark:text-gray-300" title="Size">
                <Ruler className="h-4 w-4 text-muted-foreground dark:text-gray-400 shrink-0" />
                <span className="font-medium truncate">
                  {(${lowerName}.buildSize || ${lowerName}.landSize)?.toLocaleString()} m²
                </span>
              </div>
            )}
            {${lowerName}.constructionYear && (
              <div className="flex items-center gap-1.5 text-sm text-foreground dark:text-gray-300" title="Year Built">
                <Calendar className="h-4 w-4 text-muted-foreground dark:text-gray-400 shrink-0" />
                <span className="font-medium">{${lowerName}.constructionYear}</span>
              </div>
            )}
          </div>
          
          {/* Top Features Tags */}
          {topFeatures.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {topFeatures.map((feature, index) => (
                <Badge 
                  key={index}
                  variant="secondary"
                  className="text-xs bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800"
                >
                  {feature}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t border-border dark:border-gray-700">
        <div className="w-full space-y-3">
          {/* Property Location */}
          {${lowerName}.location && (
            <button
              onClick={handleLocationClick}
              className="w-full text-sm text-muted-foreground dark:text-gray-400 flex items-center justify-center gap-1.5 hover:text-orange-600 dark:hover:text-orange-400 transition-colors group"
              title="View on map"
            >
              <svg 
                className="w-4 h-4 transition-transform group-hover:scale-110" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="group-hover:underline line-clamp-1">{${lowerName}.location}</span>
            </button>
          )}
          
          {/* Compliance Rating Stars */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {/* 1. Land & Building Certificates */}
            <div 
              className="flex flex-col items-center gap-0.5 group cursor-help" 
              title="Land & Building Certificates Verified"
            >
              <Star 
                className={cn(
                  "h-4 w-4 transition-all duration-200",
                  verificationStatus.landAndBuilding
                    ? "fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400"
                    : "text-gray-300 dark:text-gray-600"
                )}
              />
              <span className="text-[10px] text-muted-foreground dark:text-gray-500 group-hover:text-foreground dark:group-hover:text-gray-300 transition-colors">
                Land
              </span>
            </div>

            {/* 2. Insurance & Safety */}
            <div 
              className="flex flex-col items-center gap-0.5 group cursor-help" 
              title="Asset Insurance & Safety Report Verified"
            >
              <Star 
                className={cn(
                  "h-4 w-4 transition-all duration-200",
                  verificationStatus.insurance
                    ? "fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400"
                    : "text-gray-300 dark:text-gray-600"
                )}
              />
              <span className="text-[10px] text-muted-foreground dark:text-gray-500 group-hover:text-foreground dark:group-hover:text-gray-300 transition-colors">
                Safety
              </span>
            </div>

            {/* 3. Owner KYC/KYB */}
            <div 
              className="flex flex-col items-center gap-0.5 group cursor-help" 
              title="Owner KYC/KYB Completed"
            >
              <Star 
                className={cn(
                  "h-4 w-4 transition-all duration-200",
                  verificationStatus.ownerKYC
                    ? "fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400"
                    : "text-gray-300 dark:text-gray-600"
                )}
              />
              <span className="text-[10px] text-muted-foreground dark:text-gray-500 group-hover:text-foreground dark:group-hover:text-gray-300 transition-colors">
                Owner
              </span>
            </div>

            {/* 4. Financial Verification */}
            <div 
              className="flex flex-col items-center gap-0.5 group cursor-help" 
              title="Rental Income Financials Verified"
            >
              <Star 
                className={cn(
                  "h-4 w-4 transition-all duration-200",
                  verificationStatus.financials
                    ? "fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400"
                    : "text-gray-300 dark:text-gray-600"
                )}
              />
              <span className="text-[10px] text-muted-foreground dark:text-gray-500 group-hover:text-foreground dark:group-hover:text-gray-300 transition-colors">
                Finance
              </span>
            </div>

            {/* 5. Eco-Friendly */}
            <div 
              className="flex flex-col items-center gap-0.5 group cursor-help" 
              title="Eco-Friendly & Energy Efficient"
            >
              <Star 
                className={cn(
                  "h-4 w-4 transition-all duration-200",
                  verificationStatus.ecoFriendly
                    ? "fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400"
                    : "text-gray-300 dark:text-gray-600"
                )}
              />
              <span className="text-[10px] text-muted-foreground dark:text-gray-500 group-hover:text-foreground dark:group-hover:text-gray-300 transition-colors">
                Eco
              </span>
            </div>
          </div>
        </div>
      </CardFooter>

      {/* Location Dialog */}
      <PropertyLocationDialog
        open={showLocationDialog}
        onOpenChange={setShowLocationDialog}
        property={{
          title: ${lowerName}.title,
          name: ${lowerName}.name,
          location: ${lowerName}.location,
          gpsLat: ${lowerName}.gpsLat ? Number(${lowerName}.gpsLat) : null,
          gpsLng: ${lowerName}.gpsLng ? Number(${lowerName}.gpsLng) : null,
        }}
        proximityRadius={300}
      />

      {/* Purchase Dialog */}
      <PurchaseDialog
        isOpen={showPurchaseDialog}
        onClose={() => setShowPurchaseDialog(false)}
        asset={{
          id: ${lowerName}.id,
          title: ${lowerName}.title || ${lowerName}.name || 'Property',
          tokenPrice: Number(${lowerName}.tokenPrice || 0),
          availableTokens: ${lowerName}.availableTokens || (totalTokens - soldTokens),
          expectedMonthlyROI: ${lowerName}.expectedMonthlyROI,
        }}
      />
    </Card>
  );
}
`;
}

/**
 * Generate property media carousel component for detail pages
 */
export function generateMediaCarouselTemplate(config: MarketplaceTemplateConfig): string {
    const { modelName, imageFields } = config;
    const lowerName = modelName.charAt(0).toLowerCase() + modelName.slice(1);

    return `'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type MediaItem = {
  id: string;
  url: string;
  type: 'image' | 'video';
  alt?: string;
};

interface ${modelName}MediaCarouselProps {
  ${lowerName}Id: string;
  images?: Array<{ id: string; url: string }>;
  className?: string;
}

// Helper function to get video URL for ${modelName}
function get${modelName}VideoUrl(${lowerName}Id: string, imageUrl?: string): string | null {
  // Try multiple strategies to extract property index

  // Strategy 1: Extract from imageUrl pattern
  const imageMatch = imageUrl?.match(/v(\\d+)p/);
  if (imageMatch) {
    const index = parseInt(imageMatch[1]);
    if (index >= 1 && index <= 5) {
      return \`/videos/marketplace/prop\${index}.mp4\`;
    }
  }

  // Strategy 2: Extract from ${lowerName}Id patterns
  const propertyMappings: Record<string, number> = {
    'luxury-beachfront-villa-bali': 1,
    'luxury-beachfront-villa': 1,
    'modern-mountain-estate': 2,
    'mediterranean-coastal-villa': 3,
    'commercial-office-complex': 4,
    'luxury-marina-bay-villa': 5,
  };

  for (const [key, index] of Object.entries(propertyMappings)) {
    if (${lowerName}Id.toLowerCase().includes(key)) {
      return \`/videos/marketplace/prop\${index}.mp4\`;
    }
  }

  return null;
}

export function ${modelName}MediaCarousel({
  ${lowerName}Id,
  images = [],
  className,
}: ${modelName}MediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const carouselTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build media items array (images + video if available)
  const mediaItems: MediaItem[] = React.useMemo(() => {
    const items: MediaItem[] = images.map((img) => ({
      id: img.id,
      url: img.url,
      type: 'image' as const,
      alt: \`${modelName} image \${img.id}\`,
    }));

    // Try to get video URL
    const videoUrl = get${modelName}VideoUrl(${lowerName}Id, images[0]?.url);
    if (videoUrl) {
      // Insert video in the middle of the carousel
      const middleIndex = Math.floor(items.length / 2);
      items.splice(middleIndex, 0, {
        id: 'video-main',
        url: videoUrl,
        type: 'video' as const,
        alt: '${modelName} video tour',
      });
    }

    return items;
  }, [${lowerName}Id, images]);

  const currentItem = mediaItems[currentIndex];
  const isCurrentVideo = currentItem?.type === 'video';

  // Navigate to next item
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
  }, [mediaItems.length]);

  // Navigate to previous item
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  }, [mediaItems.length]);

  // Handle video ended event
  const handleVideoEnded = useCallback(() => {
    setIsVideoPlaying(false);
    if (isAutoPlaying) {
      goToNext();
    }
  }, [isAutoPlaying, goToNext]);

  // Video playback control
  useEffect(() => {
    if (videoRef.current && isCurrentVideo) {
      const video = videoRef.current;

      if (isAutoPlaying && !isVideoPlaying) {
        video.currentTime = 0;
        video
          .play()
          .then(() => setIsVideoPlaying(true))
          .catch((err) => {
            console.log('Video autoplay prevented:', err);
            setTimeout(() => goToNext(), 3000);
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isCurrentVideo, isAutoPlaying, goToNext]);

  // Auto-advance carousel (paused during video playback)
  useEffect(() => {
    if (carouselTimerRef.current) {
      clearTimeout(carouselTimerRef.current);
    }

    if (isAutoPlaying && (!isCurrentVideo || !isVideoPlaying)) {
      carouselTimerRef.current = setTimeout(() => {
        goToNext();
      }, 5000);
    }

    return () => {
      if (carouselTimerRef.current) {
        clearTimeout(carouselTimerRef.current);
      }
    };
  }, [currentIndex, isAutoPlaying, isCurrentVideo, isVideoPlaying, goToNext]);

  if (mediaItems.length === 0) {
    return (
      <div className="relative aspect-video bg-muted dark:bg-gray-900 rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground dark:text-gray-400">No media available</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Media Display */}
      <div className="relative aspect-video bg-muted dark:bg-gray-900 rounded-lg overflow-hidden group">
        {currentItem.type === 'image' ? (
          <Image
            src={currentItem.url}
            alt={currentItem.alt || '${modelName} media'}
            fill
            className="object-cover transition-opacity duration-500"
            priority={currentIndex === 0}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
          />
        ) : (
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            onEnded={handleVideoEnded}
            playsInline
            preload="metadata"
            muted={false}
          >
            <source src={currentItem.url} type="video/mp4" />
          </video>
        )}

        {/* Navigation Arrows */}
        {mediaItems.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
              type="button"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
              type="button"
              onClick={goToNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Auto-play Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white z-10"
          type="button"
          onClick={() => setIsAutoPlaying((prev) => !prev)}
        >
          {isAutoPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>

        {/* Media Counter */}
        <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full text-white text-sm z-10">
          {currentIndex + 1} / {mediaItems.length}
        </div>

        {/* Video Playing Indicator */}
        {isCurrentVideo && isVideoPlaying && (
          <div className="absolute top-4 left-4 bg-red-500 px-3 py-1.5 rounded-full text-white text-xs font-semibold flex items-center gap-2 z-10">
            <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse" />
            PLAYING VIDEO
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {mediaItems.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {mediaItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'relative flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden transition-all duration-300',
                'hover:ring-2 hover:ring-primary dark:hover:ring-blue-400',
                currentIndex === index
                  ? 'ring-2 ring-primary dark:ring-blue-400 scale-105'
                  : 'opacity-60 hover:opacity-100'
              )}
            >
              {item.type === 'image' ? (
                <Image
                  src={item.url}
                  alt={\`Thumbnail \$\{index + 1\}\`}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <div className="absolute inset-0 bg-black flex items-center justify-center">
                  <Play className="h-8 w-8 text-white" />
                </div>
              )}

              {currentIndex === index && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary dark:bg-blue-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
`;
}

/**
 * Generate Dynamic Property Grid component
 * Intelligent grid system that handles odd/even property counts
 */
export function generateDynamicGridTemplate(config: MarketplaceTemplateConfig): string {
    const { modelName } = config;
    const lowerName = modelName.charAt(0).toLowerCase() + modelName.slice(1);

    return `'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ${modelName}Card } from './${modelName}Card';

interface Dynamic${modelName}GridProps {
  ${lowerName}s: any[];
}

/**
 * Dynamic ${modelName} Grid Component
 * 
 * Intelligently arranges property cards based on count:
 * - If odd number: First card takes full width, remaining cards distributed evenly
 * - If even number: All cards distributed evenly across available columns
 * - Responsive: Adjusts columns based on screen size
 * - Fills page width optimally
 */
export function Dynamic${modelName}Grid({ ${lowerName}s }: Dynamic${modelName}GridProps) {
  const [gridLayout, setGridLayout] = useState<{
    featuredCard: any | null;
    regularCards: any[];
    columns: number;
  }>({ featuredCard: null, regularCards: [], columns: 3 });
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate optimal grid layout based on asset count and screen size
  useEffect(() => {
    const calculateLayout = () => {
      if (!containerRef.current || ${lowerName}s.length === 0) return;

      const width = containerRef.current.offsetWidth;
      const assetCount = ${lowerName}s.length;

      // Determine base columns based on screen width
      let baseColumns = 3; // Desktop default
      if (width < 768) {
        baseColumns = 1; // Mobile
      } else if (width < 1024) {
        baseColumns = 2; // Tablet
      } else if (width >= 1280) {
        baseColumns = 4; // Large desktop
      }

      /**
       * Smart Layout Algorithm:
       * - 1 property: Show as featured (full-width)
       * - 2 properties: Show as 2 columns
       * - 3 properties: Show as 3 columns
       * - 4 properties: Show as 2x2 grid
       * - 5 properties: First card featured, remaining 4 in 2x2
       * - 6 properties: Show as 3x2 grid
       * - 7 properties: First card featured, remaining 6 in 3x2
       * - 8+ properties: First card featured (if odd), rest in optimal grid
       */

      let layout = { featuredCard: null as any, regularCards: [] as any[], columns: baseColumns };

      // Special handling for small counts on desktop
      if (width >= 768) {
        if (assetCount === 1) {
          layout = {
            featuredCard: ${lowerName}s[0],
            regularCards: [],
            columns: 1,
          };
        } else if (assetCount === 2) {
          layout = {
            featuredCard: null,
            regularCards: ${lowerName}s,
            columns: 2,
          };
        } else if (assetCount === 3) {
          layout = {
            featuredCard: null,
            regularCards: ${lowerName}s,
            columns: 3,
          };
        } else if (assetCount === 4) {
          layout = {
            featuredCard: null,
            regularCards: ${lowerName}s,
            columns: 2,
          };
        } else if (assetCount === 5) {
          // Featured first card, 4 remaining in 2x2
          layout = {
            featuredCard: ${lowerName}s[0],
            regularCards: ${lowerName}s.slice(1),
            columns: 2,
          };
        } else if (assetCount === 6) {
          layout = {
            featuredCard: null,
            regularCards: ${lowerName}s,
            columns: 3,
          };
        } else if (assetCount === 7) {
          // Featured first card, 6 remaining in 3x2
          layout = {
            featuredCard: ${lowerName}s[0],
            regularCards: ${lowerName}s.slice(1),
            columns: 3,
          };
        } else {
          // 8+ properties: Handle odd numbers
          const isOdd = assetCount % 2 !== 0;
          if (isOdd) {
            layout = {
              featuredCard: ${lowerName}s[0],
              regularCards: ${lowerName}s.slice(1),
              columns: Math.min(baseColumns, 3),
            };
          } else {
            layout = {
              featuredCard: null,
              regularCards: ${lowerName}s,
              columns: baseColumns,
            };
          }
        }
      } else {
        // Mobile: simpler layout
        if (assetCount === 1) {
          layout = {
            featuredCard: ${lowerName}s[0],
            regularCards: [],
            columns: 1,
          };
        } else {
          layout = {
            featuredCard: null,
            regularCards: ${lowerName}s,
            columns: baseColumns,
          };
        }
      }

      setGridLayout(layout);
    };

    // Initial calculation
    calculateLayout();

    // Recalculate on resize
    const resizeObserver = new ResizeObserver(calculateLayout);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [${lowerName}s]);

  const { featuredCard, regularCards, columns } = gridLayout;

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Featured Card (Full Width) - Shows for specific layouts */}
      {featuredCard && (
        <div className="w-full animate-in fade-in slide-in-from-top-4 duration-500">
          <${modelName}Card
            ${lowerName}={featuredCard}
            propertyIndex={1}
            className="w-full"
          />
        </div>
      )}

      {/* Regular Cards Grid - Intelligently distributed */}
      {regularCards.length > 0 && (
        <div
          className={cn(
            'grid gap-4 sm:gap-5 md:gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500',
            // Dynamic column classes based on calculated layout
            columns === 1 && 'grid-cols-1',
            columns === 2 && 'grid-cols-1 sm:grid-cols-2',
            columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
            columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          )}
          style={{
            // Ensure cards fill available space optimally
            alignItems: 'start',
          }}
        >
          {regularCards.map((${lowerName}, index) => (
            <${modelName}Card
              key={${lowerName}.id}
              ${lowerName}={${lowerName}}
              propertyIndex={featuredCard ? index + 2 : index + 1}
              className="h-full"
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function for className concatenation
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default Dynamic${modelName}Grid;
`;
}

/**
 * Generate marketplace page with dynamic grid
 */
export function generateMarketplacePageTemplate(config: MarketplaceTemplateConfig): string {
    const { modelName } = config;
    const lowerName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const pluralName = `${lowerName}s`;

    return `'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/app-layout';
import { Dynamic${modelName}Grid } from '@/components/marketplace/Dynamic${modelName}Grid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Search, Loader2, ChevronDown, Filter } from 'lucide-react';

export default function ${modelName}MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [${pluralName}, set${modelName}s] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetch${modelName}s = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Use RealEstateAsset API for marketplace data (contains actual property data)
        const response = await fetch('/api/real-estate-assets', {
          credentials: 'include',
        });
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response format');
        }
        
        const text = await response.text();
        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from server');
        }
        
        const result = JSON.parse(text);
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch ${pluralName}');
        }
        
        // RealEstateAsset API returns { assets: [...] } structure
        const data = result.assets || result.data || [];
        set${modelName}s(Array.isArray(data) ? data : []);
        
      } catch (err) {
        console.error('Error fetching ${pluralName}:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetch${modelName}s();
  }, []);

  // Filter and sort ${pluralName}
  const filtered${modelName}s = ${pluralName}
    .filter((${lowerName}) => {
      if (statusFilter !== 'all' && ${lowerName}.status !== statusFilter) return false;
      if (assetTypeFilter !== 'all' && ${lowerName}.assetType !== assetTypeFilter) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          ${lowerName}.title?.toLowerCase().includes(query) ||
          ${lowerName}.name?.toLowerCase().includes(query) ||
          ${lowerName}.location?.toLowerCase().includes(query) ||
          ${lowerName}.description?.toLowerCase().includes(query)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return (a.tokenPrice || 0) - (b.tokenPrice || 0);
        case 'price-high':
          return (b.tokenPrice || 0) - (a.tokenPrice || 0);
        case 'funding':
          return ((b.soldTokens || 0) / (b.totalTokens || 1)) - ((a.soldTokens || 0) / (a.totalTokens || 1));
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground dark:text-white mb-2">
              ${modelName} Marketplace
            </h1>
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              Premium RWA Tokens
            </p>
          </div>
          <Badge variant="secondary" className="ml-4 px-3 py-1.5 text-sm font-semibold">
            {filtered${modelName}s.length} / {${pluralName}.length}
          </Badge>
        </div>

        {/* Collapsible Filters */}
        <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded} className="mb-6">
          <div className="bg-card dark:bg-gray-800/50 rounded-lg border border-border dark:border-gray-700">
            <div className="p-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by title, location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background dark:bg-gray-900 border-border dark:border-gray-600"
                  />
                </div>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="flex-shrink-0"
                    title="Toggle Filters"
                  >
                    <Filter className="h-4 w-4" />
                    <ChevronDown className={\`h-3 w-3 ml-1 transition-transform \${filtersExpanded ? 'rotate-180' : ''}\`} />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>

            <CollapsibleContent>
              <div className="border-t border-border dark:border-gray-700 p-4 pt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="asset-type" className="text-xs font-medium mb-1.5 block">Asset Type</Label>
                    <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
                      <SelectTrigger id="asset-type" className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="VILLA">Villa</SelectItem>
                        <SelectItem value="APARTMENT">Apartment</SelectItem>
                        <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                        <SelectItem value="LAND">Land</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="sort-by" className="text-xs font-medium mb-1.5 block">Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger id="sort-by" className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                        <SelectItem value="funding">Most Funded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-blue-400" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-600 dark:text-red-400 font-medium">Failed to load ${pluralName}</p>
            <p className="text-sm text-red-500 dark:text-red-400 mt-2">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filtered${modelName}s.length === 0 && (
          <div className="bg-muted/50 dark:bg-gray-800/50 rounded-lg p-12 text-center">
            <h3 className="text-xl font-semibold text-foreground dark:text-white mb-2">
              No ${pluralName} found
            </h3>
            <p className="text-muted-foreground dark:text-gray-400 mb-4">
              Try adjusting your filters or search query
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setAssetTypeFilter('all');
                setStatusFilter('ACTIVE');
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Dynamic Grid */}
        {!isLoading && !error && filtered${modelName}s.length > 0 && (
          <Dynamic${modelName}Grid ${pluralName}={filtered${modelName}s} />
        )}
      </div>
    </DashboardLayout>
  );
}
`;
}

/**
 * Export all marketplace templates
 */
export const marketplaceTemplates = {
    generateMarketplaceCardTemplate,
    generateMediaCarouselTemplate,
    generateDynamicGridTemplate,
    generateMarketplacePageTemplate,
};
