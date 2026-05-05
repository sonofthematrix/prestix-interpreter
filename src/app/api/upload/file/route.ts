/**
 * POST /api/upload/file — Upload any file type to Vercel Blob Storage
 *
 * Supports single file upload or multiple files.
 * Handles all supported file types (images, documents, videos, audio).
 * Returns blob URLs after successful upload confirmation.
 */

import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";

// Supported file types and their categories
const SUPPORTED_TYPES = {
  // Images
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'image/tiff': 'image',
  'image/bmp': 'image',
  // Documents
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  'application/vnd.ms-powerpoint': 'document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
  'text/plain': 'document',
  'text/csv': 'document',
  'text/html': 'document',
  'application/json': 'document',
  'application/xml': 'document',
  'text/xml': 'document',
  // Videos
  'video/mp4': 'video',
  'video/avi': 'video',
  'video/mov': 'video',
  'video/wmv': 'video',
  'video/flv': 'video',
  'video/webm': 'video',
  'video/mkv': 'video',
  // Audio
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/mp3': 'audio',
  'audio/aac': 'audio',
  'audio/flac': 'audio',
  // Archives
  'application/zip': 'archive',
  'application/x-zip-compressed': 'archive',
  'application/x-rar-compressed': 'archive',
  'application/x-7z-compressed': 'archive',
  // Other
  'application/octet-stream': 'binary',
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB for general files

function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB` };
  }

  // Check file type
  if (!SUPPORTED_TYPES[file.type as keyof typeof SUPPORTED_TYPES]) {
    return {
      valid: false,
      error: `File type ${file.type} is not supported. Supported types: ${Object.keys(SUPPORTED_TYPES).join(', ')}`
    };
  }

  return { valid: true };
}

function generateBlobPath(file: File, type: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
  const category = type || 'general';
  const sanitizedCategory = category.replace(/[^a-zA-Z0-9]/g, '-');

  return `${sanitizedCategory}/${timestamp}-${randomId}-${sanitizedFileName}`;
}

export async function POST(request: NextRequest) {
  try {
    // Optional authentication check
    try {
      const session = await getServerSession();
      if (!session?.user) {
        console.warn("No authenticated session for file upload");
      }
    } catch (authError) {
      console.warn("Authentication check failed:", authError);
      // Continue without auth for now
    }

    // Parse form data
    const formData = await request.formData();
    const type = (formData.get("type") as string) || "general";

    // Handle multiple files
    const files: File[] = [];
    const fileKeys = Array.from(formData.keys()).filter(key => key.startsWith('file'));

    if (fileKeys.length === 0) {
      // Check for single file
      const singleFile = formData.get("file") as File;
      if (singleFile) {
        files.push(singleFile);
      } else {
        return NextResponse.json(
          { success: false, error: "No files provided" },
          { status: 400 }
        );
      }
    } else {
      // Multiple files
      for (const key of fileKeys) {
        const file = formData.get(key) as File;
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid files provided" },
        { status: 400 }
      );
    }

    // Validate all files first
    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }
    }

    // Upload files to Vercel Blob
    const uploadResults = [];

    for (const file of files) {
      try {
        // Generate unique blob path
        const blobPath = generateBlobPath(file, type);

        // Upload to Vercel Blob with public access
        const blob = await put(blobPath, file, {
          access: 'public',
          addRandomSuffix: false,
        });

        // Wait for confirmation (blob.url should be available)
        if (!blob.url) {
          throw new Error("Blob upload failed - no URL returned");
        }

        uploadResults.push({
          originalName: file.name,
          size: file.size,
          type: file.type,
          category: SUPPORTED_TYPES[file.type as keyof typeof SUPPORTED_TYPES] || 'unknown',
          url: blob.url,
          pathname: blob.pathname,
          uploadedAt: new Date().toISOString(),
        });

      } catch (uploadError) {
        console.error(`Failed to upload file ${file.name}:`, uploadError);

        // Clean up any successfully uploaded files if one fails
        for (const result of uploadResults) {
          try {
            await del(result.url);
          } catch (cleanupError) {
            console.error(`Failed to cleanup ${result.url}:`, cleanupError);
          }
        }

        return NextResponse.json(
          { success: false, error: `Upload failed for ${file.name}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    // All files uploaded successfully
    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadResults.length} file(s)`,
      files: uploadResults.length === 1 ? uploadResults[0] : uploadResults,
      urls: uploadResults.map(result => result.url),
      totalFiles: uploadResults.length,
    });

  } catch (err) {
    console.error("[api/upload/file] POST:", err);
    return NextResponse.json(
      { success: false, error: "Upload failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload/file — Delete file from Vercel Blob Storage
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL parameter required" },
        { status: 400 }
      );
    }

    // Optional authentication check
    try {
      const session = await getServerSession();
      if (!session?.user) {
        console.warn("No authenticated session for file deletion");
      }
    } catch (authError) {
      console.warn("Authentication check failed:", authError);
    }

    // Delete from Vercel Blob
    try {
      await del(url);
    } catch (deleteError) {
      console.error("Failed to delete blob:", deleteError);
      return NextResponse.json(
        { success: false, error: "Failed to delete file" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });

  } catch (err) {
    console.error("[api/upload/file] DELETE:", err);
    return NextResponse.json(
      { success: false, error: "Delete failed" },
      { status: 500 }
    );
  }
}