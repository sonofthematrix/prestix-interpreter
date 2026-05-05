/**
 * File Upload Constants and Types
 * 
 * Client-safe constants, enums, and types for file upload functionality.
 * These can be safely imported by client components without pulling in database code.
 */

// File type categories
export enum FileCategory {
  AVATAR = 'avatar',
  COVER_IMAGE = 'coverImage',
  PROPERTY = 'property',
  GAME_ICON = 'gameIcon',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  GENERAL = 'general',
  BRAND_LOGO = 'brandLogo',
  BLOG_IMAGE = 'blogImage',
  DOCUMENTATION = 'documentation',
  MARKETPLACE = 'marketplace',
}

// Supported file types
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
];

export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'application/xml',
  'text/xml',
];

export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo', // .avi
];

export const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
];

// Default upload limits (can be overridden by SystemConfig)
export const DEFAULT_UPLOAD_LIMITS: Record<FileCategory, { maxSize: number; allowedTypes: string[] }> = {
  [FileCategory.AVATAR]: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: SUPPORTED_IMAGE_TYPES,
  },
  [FileCategory.COVER_IMAGE]: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: SUPPORTED_IMAGE_TYPES,
  },
  [FileCategory.PROPERTY]: {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES],
  },
  [FileCategory.GAME_ICON]: {
    maxSize: 1 * 1024 * 1024, // 1MB
    allowedTypes: SUPPORTED_IMAGE_TYPES,
  },
  [FileCategory.DOCUMENT]: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [...SUPPORTED_DOCUMENT_TYPES, ...SUPPORTED_IMAGE_TYPES],
  },
  [FileCategory.VIDEO]: {
    maxSize: 500 * 1024 * 1024, // 500MB
    allowedTypes: SUPPORTED_VIDEO_TYPES,
  },
  [FileCategory.AUDIO]: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: SUPPORTED_AUDIO_TYPES,
  },
  [FileCategory.GENERAL]: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_DOCUMENT_TYPES],
  },
  [FileCategory.BRAND_LOGO]: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: SUPPORTED_IMAGE_TYPES,
  },
  [FileCategory.BLOG_IMAGE]: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: SUPPORTED_IMAGE_TYPES,
  },
  [FileCategory.DOCUMENTATION]: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: [...SUPPORTED_DOCUMENT_TYPES, ...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES],
  },
  [FileCategory.MARKETPLACE]: {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES],
  },
};

export interface UploadConfig {
  maxSize: number;
  allowedTypes: string[];
  requireConversion?: boolean;
  conversionTarget?: string;
}

export interface UploadResult {
  success: boolean;
  url: string;
  pathname: string;
  size: number;
  type: string;
  category: FileCategory;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, any>;
  convertedFrom?: string;
  error?: string;
}

export interface FileMetadata {
  originalSize: number;
  type: string;
  category: FileCategory;
  uploadedAt: string;
  dimensions?: { width: number; height: number };
  duration?: number; // For video/audio
  convertedFrom?: string;
  conversionLog?: string;
}

