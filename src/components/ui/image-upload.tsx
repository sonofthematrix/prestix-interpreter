'use client';

import React, { useState, useRef } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Card, CardContent } from './card';
import { cn } from '@/lib/utils';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { MediaLibrarySelector } from '@/components/hub/MediaLibrarySelector';
import { useToast } from '@/hooks/useToast'; 
import Image from 'next/image';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  placeholder?: string;
  className?: string;
  showPreview?: boolean;
  maxSize?: number; // in MB
  acceptedFormats?: string[];
  /** Show "Choose from library" for admin/venue host to pick from platform media */
  showLibrarySelector?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  placeholder = "Enter image URL or upload a file",
  className,
  showPreview = true,
  maxSize = 5,
  acceptedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  showLibrarySelector = false,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast("File too large", "error");
      return;
    }

    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      toast("Invalid file type", "error");
      toast("Invalid file type", "error");
      return;
    }

    try {
      setIsUploading(true);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'blog-cover');

      // Upload to our API endpoint
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      if (data.success) {
        // Handle new API response format
        let uploadedUrl: string | undefined;

        if (data.url) {
          // Legacy format
          uploadedUrl = data.url;
        } else if (data.urls && Array.isArray(data.urls) && data.urls.length > 0) {
          // New format - take first URL for single image component
          uploadedUrl = data.urls[0];
        } else if (data.files) {
          // New format - single file object
          if (typeof data.files === 'object' && data.files.url) {
            uploadedUrl = data.files.url;
          } else if (Array.isArray(data.files) && data.files.length > 0 && data.files[0].url) {
            uploadedUrl = data.files[0].url;
          }
        }

        if (uploadedUrl) {
          onChange(uploadedUrl);
          toast("Upload successful", "info");
        } else {
          toast("Upload failed", "error");
          throw new Error('No URL returned from upload');
        }
      } else {
        toast("Upload failed", "error");
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      toast("Upload failed", "error");
      throw new Error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    } 
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleUrlChange = (url: string) => {
    onChange(url);
  };

  const handleRemove = async () => {
    // If there's a current image URL, try to delete it from blob storage
    if (value) {
      try {
        const deleteResponse = await fetch(`/api/upload/image?url=${encodeURIComponent(value)}`, {
          method: 'DELETE',
        });
        const deleteData = await deleteResponse.json();
        if (!deleteData.success) {
          console.warn('Failed to delete file from storage:', deleteData.error);
        }
      } catch (error) {
        console.warn('Error deleting file from storage:', error);
      }
    }

    onChange('');
    onRemove?.();
  };

  // Helper function to get full URL for preview
  const getFullImageUrl = (url: string) => {
    if (!url) return '';
    
    // If it's already a full URL (starts with http/https), return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it's a relative URL, prepend the current origin
    if (url.startsWith('/')) {
      return `${window.location.origin}${url}`;
    }
    
    // For any other case, return as is
    return url;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* URL Input */}
      <div className="space-y-2">
        <Label htmlFor="image-url">Image URL</Label>
        <div className="flex gap-2">
          <Input
            id="image-url"
            value={value || ''}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1"
          />
          {value && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={isUploading}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Platform media library (admin/venue host) */}
      {showLibrarySelector && (
        <div className="space-y-2">
          <Label>Or choose from library</Label>
          <MediaLibrarySelector
            mode="single"
            onSelect={(urls) => urls[0] && onChange(urls[0])}
            triggerLabel="Choose from platform media"
          />
        </div>
      )}

      {/* File Upload Area */}
      <div className="space-y-2">
        <Label>Or upload a file</Label>
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            isUploading && "opacity-50 pointer-events-none"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.join(',')}
            onChange={handleFileInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          
          <div className="space-y-2">
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    Drop your image here, or{' '}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports: {acceptedFormats.map(format => format.split('/')[1].toUpperCase()).join(', ')} (max {maxSize}MB)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      {showPreview && value && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Preview</Label>
              <div className="relative">
                <Image
                  src={value.startsWith('/') ? value : getFullImageUrl(value)}
                  alt="Preview"
                  width={100}
                  height={100}
                  className="w-full h-48 object-cover rounded-lg border"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden w-full h-48 bg-muted rounded-lg border flex-col items-center justify-center">
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Invalid image URL</p>
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>URL: {value}</p>
                {value.startsWith('/') && (
                  <p>Full URL: {getFullImageUrl(value)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
