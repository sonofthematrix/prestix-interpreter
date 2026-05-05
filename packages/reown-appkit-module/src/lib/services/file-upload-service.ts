/**
 * Comprehensive File Upload Service for Vercel Blob Storage
 * 
 * Features:
 * - Multi-format support (images, documents, videos, audio)
 * - Admin-configurable upload limits per category/section
 * - Automatic file conversion via MCP for unsupported formats
 * - Database integration with Neon PostgreSQL
 * - Comprehensive validation and error handling
 */

import type { AuthUser } from '@/lib/auth';
import { createClient } from '@/lib/db';
import { del, head, put } from '@vercel/blob';
import {
  DEFAULT_UPLOAD_LIMITS,
  FileCategory,
  SUPPORTED_AUDIO_TYPES,
  SUPPORTED_DOCUMENT_TYPES,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  type FileMetadata,
  type UploadConfig,
  type UploadResult,
} from './file-upload-constants';

// Re-export types and constants for backward compatibility
export {
  DEFAULT_UPLOAD_LIMITS, FileCategory, SUPPORTED_AUDIO_TYPES, SUPPORTED_DOCUMENT_TYPES, SUPPORTED_IMAGE_TYPES, SUPPORTED_VIDEO_TYPES, type FileMetadata, type UploadConfig,
  type UploadResult
};

/**
 * Get upload configuration from SystemConfig or defaults
 */
async function getUploadConfig(
  category: FileCategory,
  user: AuthUser
): Promise<UploadConfig> {
  const db = await createClient(user);
  
  try {
    // Try to get configuration from SystemConfig
    const configKey = `upload.${category}.config`;
    const config = await db.systemConfig.findUnique({
      where: { key: configKey },
    });

    if (config && config.type === 'json') {
      const parsedConfig = JSON.parse(config.value);
      return {
        maxSize: parsedConfig.maxSize || DEFAULT_UPLOAD_LIMITS[category].maxSize,
        allowedTypes: parsedConfig.allowedTypes || DEFAULT_UPLOAD_LIMITS[category].allowedTypes,
        requireConversion: parsedConfig.requireConversion || false,
        conversionTarget: parsedConfig.conversionTarget,
      };
    }
  } catch (error) {
    console.warn(`Failed to load upload config for ${category}, using defaults:`, error);
  }

  // Return defaults
  return {
    maxSize: DEFAULT_UPLOAD_LIMITS[category].maxSize,
    allowedTypes: DEFAULT_UPLOAD_LIMITS[category].allowedTypes,
  };
}

/**
 * Check if file type requires conversion
 */
function requiresConversion(fileType: string, allowedTypes: string[]): boolean {
  return !allowedTypes.includes(fileType);
}

/**
 * Call MCP server for file conversion
 */
async function convertFileViaMCP(
  file: File,
  targetType: string
): Promise<{ success: boolean; file?: File; error?: string }> {
  try {
    // Convert file to base64 (handles large files efficiently)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64 in chunks to avoid stack overflow
    let base64Data = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      base64Data += String.fromCharCode.apply(null, Array.from(chunk));
    }
    base64Data = btoa(base64Data);

    // Call MCP server conversion tool
    const mcpResponse = await fetch('/api/mcp/convert-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileData: base64Data,
        fileName: file.name,
        fileType: file.type,
        targetType: targetType,
      }),
    });

    if (!mcpResponse.ok) {
      const errorData = await mcpResponse.json();
      return { success: false, error: errorData.error || 'Conversion failed' };
    }

    const result = await mcpResponse.json();
    
    if (!result.success) {
      return { success: false, error: result.error || 'Conversion failed' };
    }

    // Convert base64 back to File
    const binaryString = atob(result.fileData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const convertedFile = new File([bytes], result.fileName, { type: result.fileType });
    
    return { success: true, file: convertedFile };
  } catch (error) {
    console.error('MCP conversion error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Conversion failed' 
    };
  }
}

/**
 * Validate file before upload
 */
export async function validateFile(
  file: File,
  category: FileCategory,
  user: AuthUser
): Promise<{ valid: boolean; error?: string; config?: UploadConfig }> {
  const config = await getUploadConfig(category, user);

  // Check file size
  if (file.size > config.maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${(config.maxSize / 1024 / 1024).toFixed(2)}MB`,
      config,
    };
  }

  // Check file type
  const requiresConv = requiresConversion(file.type, config.allowedTypes);
  
  if (requiresConv && !config.requireConversion) {
    return {
      valid: false,
      error: `File type ${file.type} is not supported. Allowed types: ${config.allowedTypes.join(', ')}`,
      config,
    };
  }

  return { valid: true, config };
}

/**
 * Upload file to Vercel Blob Storage
 */
export async function uploadFile(
  file: File,
  category: FileCategory,
  user: AuthUser,
  options?: {
    entityId?: string;
    entityType?: string;
    customPath?: string;
    metadata?: Record<string, any>;
  }
): Promise<UploadResult> {
  try {
    // Get upload configuration
    const config = await getUploadConfig(category, user);

    // Validate file
    const validation = await validateFile(file, category, user);
    if (!validation.valid) {
      return {
        success: false,
        url: '',
        pathname: '',
        size: file.size,
        type: file.type,
        category,
        error: validation.error,
      };
    }

    let fileToUpload = file;
    let convertedFrom: string | undefined;
    let conversionLog: string | undefined;

    // Handle file conversion if needed
    if (config.requireConversion && requiresConversion(file.type, config.allowedTypes)) {
      const targetType = config.conversionTarget || 'image/png'; // Default conversion target
      
      const conversionResult = await convertFileViaMCP(file, targetType);
      
      if (!conversionResult.success) {
        return {
          success: false,
          url: '',
          pathname: '',
          size: file.size,
          type: file.type,
          category,
          error: `File conversion failed: ${conversionResult.error}`,
        };
      }

      fileToUpload = conversionResult.file!;
      convertedFrom = file.type;
      conversionLog = `Converted from ${file.type} to ${targetType}`;
    }

    // Generate blob path
    const timestamp = Date.now();
    const sanitizedCategory = category.replace(/[^a-zA-Z0-9]/g, '-');
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
    const pathPrefix = options?.customPath || sanitizedCategory;
    const blobPath = `${pathPrefix}/${timestamp}-${sanitizedFileName}`;

    // Upload to Vercel Blob
    const blob = await put(blobPath, fileToUpload, {
      access: 'public',
      addRandomSuffix: false,
    });

    // Record upload in database
    const db = await createClient(user);
    const metadata: FileMetadata = {
      originalSize: file.size,
      type: fileToUpload.type,
      category,
      uploadedAt: new Date().toISOString(),
      convertedFrom,
      conversionLog,
      ...options?.metadata,
    };

    try {
      await db.imageUpload.create({
        data: {
          category: category,
          userId: user.id,
          entityId: options?.entityId || null,
          originalUrl: blob.url,
          variants: {},
          metadata: metadata as any,
          status: 'completed',
          processingLog: conversionLog || null,
        },
      });
    } catch (dbError) {
      console.warn('Failed to record upload in database:', dbError);
      // Continue even if DB recording fails
    }

    return {
      success: true,
      url: blob.url,
      pathname: blob.pathname,
      size: fileToUpload.size,
      type: fileToUpload.type,
      category,
      entityId: options?.entityId,
      entityType: options?.entityType,
      metadata,
      convertedFrom,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      url: '',
      pathname: '',
      size: file.size,
      type: file.type,
      category,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete file from Vercel Blob Storage
 */
export async function deleteFile(
  url: string,
  user: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user has permission (admin or file owner)
    const db = await createClient(user);
    const upload = await db.imageUpload.findFirst({
      where: {
        originalUrl: url,
      },
    });

    if (!upload) {
      // File doesn't exist in DB, try to delete from blob anyway
      await del(url);
      return { success: true };
    }

    // Check permissions
    if (user.role !== 'ADMIN' && upload.userId !== user.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Delete from Vercel Blob
    await del(url);

    // Delete from database
    await db.imageUpload.delete({
      where: { id: upload.id },
    });

    return { success: true };
  } catch (error) {
    console.error('Delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Get file info from blob URL
 */
export async function getFileInfo(url: string): Promise<{
  exists: boolean;
  size?: number;
  type?: string;
  lastModified?: Date;
}> {
  try {
    const info = await head(url);
    return {
      exists: true,
      size: info.size,
      type: info.contentType || undefined,
      lastModified: info.uploadedAt || undefined,
    };
  } catch (error) {
    return { exists: false };
  }
}

/**
 * Get all uploads for a user or entity
 */
export async function getUserUploads(
  user: AuthUser,
  options?: {
    category?: FileCategory;
    entityId?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ uploads: any[]; total: number }> {
  const db = await createClient(user);
  
  const where: any = {
    userId: user.role === 'ADMIN' ? undefined : user.id,
  };

  if (options?.category) {
    where.category = options.category;
  }

  if (options?.entityId) {
    where.entityId = options.entityId;
  }

  const [uploads, total] = await Promise.all([
    db.imageUpload.findMany({
      where,
      take: options?.limit || 50,
      skip: options?.offset || 0,
      orderBy: { createdAt: 'desc' },
    }),
    db.imageUpload.count({ where }),
  ]);

  return { uploads, total };
}

