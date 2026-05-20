/**
 * File upload validation and limits.
 * Referenced by src/components/ui/file-upload.tsx.
 */

export type FileValidationOptions = {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
};

export const UPLOAD_LIMITS = {
  image: { maxSize: 50 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"] },
  document: { maxSize: 100 * 1024 * 1024, types: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
  media: { maxSize: 100 * 1024 * 1024, types: ["video/mp4", "audio/mpeg", "audio/wav"] },
  FORMATTED: '100.0 MB',
} as const;

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function validateFileUpload(
  file: File,
  options?: FileValidationOptions,
): { valid: boolean; error?: string } {
  if (options?.maxSize && file.size > options.maxSize) {
    return { valid: false, error: `File exceeds maximum size of ${formatBytes(options.maxSize)}.` };
  }
  if (options?.allowedTypes && options.allowedTypes.length > 0 && !options.allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not allowed.` };
  }
  if (options?.allowedExtensions && options.allowedExtensions.length > 0) {
    const extension = file.name.includes('.') ? `.${file.name.split('.').pop()?.toLowerCase()}` : '';
    const normalizedAllowedExtensions = options.allowedExtensions.map((item) => item.toLowerCase());
    if (!extension || !normalizedAllowedExtensions.includes(extension)) {
      return { valid: false, error: `File extension ${extension || '(none)'} is not allowed.` };
    }
  }
  return { valid: true };
}
