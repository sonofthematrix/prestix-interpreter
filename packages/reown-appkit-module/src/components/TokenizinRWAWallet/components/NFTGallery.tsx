/**
 * NFT Gallery Component
 *
 * Displays a grid of NFTs (ERC-721 and ERC-1155) with:
 * - Visual card layout with images
 * - Collection name and token ID
 * - Balance for ERC-1155
 * - Floor price display
 * - Filter by token type
 * - Loading and error states
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { TigerSpinner } from '../../common/TigerSpinner';
import { ImageIcon, Layers, Filter } from 'lucide-react';
// Note: NFTMetadata type should be defined locally or imported from a types file
type NFTMetadata = {
  tokenId: string;
  contractAddress: string;
  tokenAddress?: string;
  name?: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  collectionName?: string;
  balance?: string;
  tokenType?: 'ERC721' | 'ERC1155' | 'ERC404';
  floorPrice?: { value: number; currency: string } | string;
  attributes?: Array<{ trait_type: string; value: string }>;
};

interface NFTGalleryProps {
  nfts: NFTMetadata[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

type FilterType = 'all' | 'ERC721' | 'ERC1155';

export function NFTGallery({ nfts, isLoading, error, onRefresh }: NFTGalleryProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedNFT, setSelectedNFT] = useState<NFTMetadata | null>(null);

  // Filter NFTs based on selected type
  const filteredNFTs = nfts.filter(nft => {
    if (filter === 'all') return true;
    return nft.tokenType === filter;
  });

  // Count by type
  const erc721Count = nfts.filter(nft => nft.tokenType === 'ERC721').length;
  const erc1155Count = nfts.filter(nft => nft.tokenType === 'ERC1155').length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <TigerSpinner size="lg" />
        <p className="text-sm text-[#B8A898] dark:text-[#B8A898] mt-4">
          Loading NFTs...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-400 dark:text-red-400 mb-2">Failed to load NFTs</div>
        <p className="text-xs text-[#B8A898] dark:text-[#B8A898] mb-4">{error}</p>
        <Button
          onClick={onRefresh}
          variant="outline"
          size="sm"
          className="text-xs"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="text-center py-8 text-[#B8A898] dark:text-[#B8A898] text-sm">
        <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No NFTs found</p>
        <p className="text-xs mt-1 opacity-75">Your NFT collection will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Button
          onClick={() => setFilter('all')}
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          className="text-xs whitespace-nowrap"
        >
          <Filter className="h-3 w-3 mr-1" />
          All ({nfts.length})
        </Button>
        <Button
          onClick={() => setFilter('ERC721')}
          variant={filter === 'ERC721' ? 'default' : 'outline'}
          size="sm"
          className="text-xs whitespace-nowrap"
        >
          <ImageIcon className="h-3 w-3 mr-1" />
          ERC-721 ({erc721Count})
        </Button>
        <Button
          onClick={() => setFilter('ERC1155')}
          variant={filter === 'ERC1155' ? 'default' : 'outline'}
          size="sm"
          className="text-xs whitespace-nowrap"
        >
          <Layers className="h-3 w-3 mr-1" />
          ERC-1155 ({erc1155Count})
        </Button>
      </div>

      {/* NFT Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {filteredNFTs.map((nft) => (
          <div
            key={`${nft.tokenAddress}-${nft.tokenId}`}
            onClick={() => setSelectedNFT(nft)}
            className="group cursor-pointer"
          >
            <Card className="overflow-hidden transition-all hover:shadow-lg hover:border-blue-500/50 bg-gradient-to-r from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] dark:from-[rgba(28,58,54,0.9)] dark:to-[rgba(15,42,38,0.9)] border-2 border-blue-600/30 dark:border-blue-400/30">
              {/* NFT Image */}
              <div className="aspect-square relative bg-[#1C3A36] dark:bg-[#0F2A26]">
                {nft.imageUrl ? (
                  <Image
                    src={nft.imageUrl}
                    alt={nft.name}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    unoptimized
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-[#B8A898]/30 dark:text-[#B8A898]/30" />
                  </div>
                )}

                {/* Token Type Badge */}
                <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm">
                  <span className="text-xs font-medium text-white">
                    {nft.tokenType === 'ERC1155' ? 'ERC-1155' : 'ERC-721'}
                  </span>
                </div>

                {/* Balance Badge for ERC-1155 */}
                {nft.tokenType === 'ERC1155' && nft.balance && parseInt(nft.balance) > 1 && (
                  <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-blue-500/80 backdrop-blur-sm">
                    <span className="text-xs font-medium text-white">
                      x{nft.balance}
                    </span>
                  </div>
                )}
              </div>

              {/* NFT Info */}
              <CardContent className="p-3">
                <div className="space-y-1">
                  <h3 className="font-medium text-sm text-[#F8F5F0] dark:text-[#F8F5F0] truncate">
                    {nft.name}
                  </h3>
                  <p className="text-xs text-[#B8A898] dark:text-[#B8A898] truncate">
                    {nft.collectionName || 'Unknown Collection'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#B8A898] dark:text-[#B8A898]">
                      #{nft.tokenId.substring(0, 8)}
                    </span>
                    {nft.floorPrice && (
                      <span className="text-xs font-medium text-blue-400 dark:text-blue-400">
                        {typeof nft.floorPrice === 'string' ? nft.floorPrice : `${nft.floorPrice.value.toFixed(3)} ${nft.floorPrice.currency}`}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* NFT Detail Modal */}
      {selectedNFT && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setSelectedNFT(null)}
        >
          <div
            className="bg-gradient-to-b from-[#1C3A36] to-[#0F2A26] dark:from-[#1C3A36] dark:to-[#0F2A26] border-2 border-blue-600/30 dark:border-blue-400/30 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="aspect-square relative bg-[#0F2A26] dark:bg-[#0F2A26] rounded-xl overflow-hidden mb-4">
              {selectedNFT.imageUrl ? (
                <Image
                  src={selectedNFT.imageUrl}
                  alt={selectedNFT.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-[#B8A898]/30 dark:text-[#B8A898]/30" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-3">
              <div>
                <h2 className="text-xl font-bold text-[#F8F5F0] dark:text-[#F8F5F0] mb-1">
                  {selectedNFT.name}
                </h2>
                <p className="text-sm text-[#B8A898] dark:text-[#B8A898]">
                  {selectedNFT.collectionName}
                </p>
              </div>

              {selectedNFT.description && (
                <p className="text-sm text-[#F8F5F0] dark:text-[#F8F5F0]">
                  {selectedNFT.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-[#B8A898] dark:text-[#B8A898] mb-1">Token ID</p>
                  <p className="text-sm font-medium text-[#F8F5F0] dark:text-[#F8F5F0] font-mono">
                    #{selectedNFT.tokenId}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#B8A898] dark:text-[#B8A898] mb-1">Type</p>
                  <p className="text-sm font-medium text-[#F8F5F0] dark:text-[#F8F5F0]">
                    {selectedNFT.tokenType}
                  </p>
                </div>
                {selectedNFT.tokenType === 'ERC1155' && (
                  <div>
                    <p className="text-xs text-[#B8A898] dark:text-[#B8A898] mb-1">Balance</p>
                    <p className="text-sm font-medium text-[#F8F5F0] dark:text-[#F8F5F0]">
                      {selectedNFT.balance}
                    </p>
                  </div>
                )}
                {selectedNFT.floorPrice && (
                  <div>
                    <p className="text-xs text-[#B8A898] dark:text-[#B8A898] mb-1">Floor Price</p>
                    <p className="text-sm font-medium text-blue-400 dark:text-blue-400">
                      {typeof selectedNFT.floorPrice === 'string' ? selectedNFT.floorPrice : `${selectedNFT.floorPrice.value.toFixed(3)} ${selectedNFT.floorPrice.currency}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Attributes */}
              {selectedNFT.attributes && selectedNFT.attributes.length > 0 && (
                <div>
                  <p className="text-xs text-[#B8A898] dark:text-[#B8A898] mb-2">Attributes</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedNFT.attributes.slice(0, 6).map((attr, index) => (
                      <div
                        key={index}
                        className="p-2 rounded-lg bg-[#0F2A26]/50 dark:bg-[#0F2A26]/50 border border-blue-600/20 dark:border-blue-400/20"
                      >
                        <p className="text-xs text-[#B8A898] dark:text-[#B8A898] truncate">
                          {attr.trait_type}
                        </p>
                        <p className="text-xs font-medium text-[#F8F5F0] dark:text-[#F8F5F0] truncate">
                          {attr.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => setSelectedNFT(null)}
                className="w-full"
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
