/**
 * Marketplace Dialog Component
 *
 * RWA (Real World Asset) marketplace for trading tokenized assets:
 * - Property tokens (ERC-404)
 * - NFTs (ERC-721/ERC-1155)
 * - Fractional ownership
 * - Listing management
 * - Buy/Sell functionality
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { TigerSpinner } from '../../common/TigerSpinner';
import { ShoppingCart, Store, TrendingUp, Building2, Layers, Search, Filter, DollarSign } from 'lucide-react';
import Image from 'next/image';

interface MarketplaceListing {
  id: string;
  tokenAddress: string;
  tokenId: string;
  tokenType: 'ERC721' | 'ERC1155' | 'ERC404';
  seller: string;
  price: string;
  currency: 'ETH' | 'USDC' | 'EURC';
  title: string;
  description?: string;
  imageUrl?: string;
  quantity?: number; // For ERC-1155
  fractionalShares?: number; // For ERC-404
}

interface MarketplaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userAddress?: string;
}

// Mock marketplace listings (would come from smart contract/indexer in production)
const MOCK_LISTINGS: MarketplaceListing[] = [
  {
    id: '1',
    tokenAddress: '0x1234567890123456789012345678901234567890',
    tokenId: '1',
    tokenType: 'ERC404',
    seller: '0xabcd...5678',
    price: '0.5',
    currency: 'ETH',
    title: 'Tokenizin Suite #1',
    description: 'Luxury suite with fractional ownership',
    imageUrl: '/images/property-1.jpg',
    fractionalShares: 100,
  },
  {
    id: '2',
    tokenAddress: '0x2345678901234567890123456789012345678901',
    tokenId: '2',
    tokenType: 'ERC721',
    seller: '0xdef0...9abc',
    price: '1.2',
    currency: 'ETH',
    title: 'Premium Gaming NFT',
    description: 'Exclusive access to VIP gaming rooms',
    imageUrl: '/images/nft-1.jpg',
  },
  {
    id: '3',
    tokenAddress: '0x3456789012345678901234567890123456789012',
    tokenId: '3',
    tokenType: 'ERC1155',
    seller: '0x1234...abcd',
    price: '50',
    currency: 'USDC',
    title: 'TKNZN Reward Tokens',
    description: 'Redeemable for in-game rewards',
    imageUrl: '/images/token-1.jpg',
    quantity: 1000,
  },
];

export function MarketplaceDialog({ open, onOpenChange, userAddress }: MarketplaceDialogProps) {
  const [activeTab, setActiveTab] = useState<'browse' | 'myListings'>('browse');
  const [listings, setListings] = useState<MarketplaceListing[]>(MOCK_LISTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'ERC721' | 'ERC1155' | 'ERC404'>('all');
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Filter listings based on search and filter
  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          listing.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || listing.tokenType === filterType;
    return matchesSearch && matchesFilter;
  });

  // My listings (seller is current user)
  const myListings = listings.filter(listing =>
    userAddress && listing.seller.toLowerCase() === userAddress.toLowerCase()
  );

  const handlePurchase = async (listing: MarketplaceListing) => {
    setIsPurchasing(true);
    setSelectedListing(listing);

    try {
      // TODO: Implement marketplace purchase logic
      // 1. Check allowance for ERC-20 payments
      // 2. Call marketplace contract buy function
      // 3. Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✅ [Marketplace] Purchase successful:', listing.id);
    } catch (error) {
      console.error('❌ [Marketplace] Purchase failed:', error);
    } finally {
      setIsPurchasing(false);
      setSelectedListing(null);
    }
  };

  const getTokenTypeIcon = (type: string) => {
    switch (type) {
      case 'ERC721':
        return <Layers className="h-4 w-4" />;
      case 'ERC1155':
        return <Store className="h-4 w-4" />;
      case 'ERC404':
        return <Building2 className="h-4 w-4" />;
      default:
        return <ShoppingCart className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-b from-[#1C3A36] to-[#0F2A26] dark:from-[#1C3A36] dark:to-[#0F2A26] border-2 border-purple-600/30 dark:border-purple-400/30 rounded-2xl max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-[#F8F5F0] dark:text-[#F8F5F0] flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-purple-400" />
            RWA Marketplace
          </DialogTitle>
          <DialogDescription className="text-[#B8A898] dark:text-[#B8A898]">
            Buy and sell real-world asset tokens
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-[rgba(28,58,54,0.6)] border-2 border-purple-600/30">
            <TabsTrigger value="browse" className="data-[state=active]:bg-purple-500/30">
              <Store className="h-4 w-4 mr-2" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="myListings" className="data-[state=active]:bg-purple-500/30">
              <TrendingUp className="h-4 w-4 mr-2" />
              My Listings ({myListings.length})
            </TabsTrigger>
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse" className="space-y-4 mt-4">
            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#B8A898]" />
                <Input
                  placeholder="Search listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[rgba(28,58,54,0.9)] border-purple-600/30 text-[#F8F5F0]"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-4 py-2 rounded-lg bg-[rgba(28,58,54,0.9)] border-2 border-purple-600/30 text-[#F8F5F0] text-sm"
              >
                <option value="all">All Types</option>
                <option value="ERC721">ERC-721</option>
                <option value="ERC1155">ERC-1155</option>
                <option value="ERC404">ERC-404</option>
              </select>
            </div>

            {/* Listings Grid */}
            <div className="overflow-y-auto max-h-[50vh] pr-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <TigerSpinner size="lg" />
                </div>
              ) : filteredListings.length === 0 ? (
                <div className="text-center py-12 text-[#B8A898]">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No listings found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredListings.map((listing) => (
                    <Card
                      key={listing.id}
                      className="overflow-hidden transition-all hover:shadow-lg hover:border-purple-500/50 bg-gradient-to-r from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-purple-600/30 cursor-pointer"
                      onClick={() => setSelectedListing(listing)}
                    >
                      {/* Image */}
                      {listing.imageUrl && (
                        <div className="aspect-video relative bg-[#0F2A26]">
                          <Image
                            src={listing.imageUrl}
                            alt={listing.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm flex items-center gap-1">
                            {getTokenTypeIcon(listing.tokenType)}
                            <span className="text-xs font-medium text-white">
                              {listing.tokenType}
                            </span>
                          </div>
                        </div>
                      )}

                      <CardContent className="p-3">
                        <h3 className="font-medium text-sm text-[#F8F5F0] mb-1">
                          {listing.title}
                        </h3>
                        {listing.description && (
                          <p className="text-xs text-[#B8A898] mb-2 line-clamp-2">
                            {listing.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-purple-400" />
                            <span className="text-sm font-bold text-purple-400">
                              {listing.price} {listing.currency}
                            </span>
                          </div>
                          {listing.quantity && (
                            <span className="text-xs text-[#B8A898]">
                              Qty: {listing.quantity}
                            </span>
                          )}
                          {listing.fractionalShares && (
                            <span className="text-xs text-[#B8A898]">
                              {listing.fractionalShares} shares
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <Button
                            size="sm"
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePurchase(listing);
                            }}
                            disabled={isPurchasing}
                          >
                            {isPurchasing && selectedListing?.id === listing.id ? (
                              <>
                                <TigerSpinner size="sm" className="mr-2" />
                                Purchasing...
                              </>
                            ) : (
                              'Buy Now'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* My Listings Tab */}
          <TabsContent value="myListings" className="space-y-4 mt-4">
            <div className="overflow-y-auto max-h-[50vh]">
              {myListings.length === 0 ? (
                <div className="text-center py-12 text-[#B8A898]">
                  <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>You have no active listings</p>
                  <p className="text-xs mt-2">List your assets to start selling</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myListings.map((listing) => (
                    <Card
                      key={listing.id}
                      className="overflow-hidden bg-gradient-to-r from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-purple-600/30"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {listing.imageUrl && (
                            <div className="w-20 h-20 relative rounded-lg overflow-hidden flex-shrink-0">
                              <Image
                                src={listing.imageUrl}
                                alt={listing.title}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-medium text-[#F8F5F0] mb-1">
                              {listing.title}
                            </h3>
                            <p className="text-xs text-[#B8A898] mb-2">
                              {listing.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-purple-400">
                                {listing.price} {listing.currency}
                              </span>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="text-xs">
                                  Edit
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs text-red-400">
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
