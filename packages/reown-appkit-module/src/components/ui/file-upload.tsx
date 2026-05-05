'use client';

import React, { useCallback, useState } from 'react';
import { Upload, X, File, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
// Note: These utilities should be implemented locally or removed if not needed
// import { validateFileUpload, formatBytes, UPLOAD_LIMITS, type FileValidationOptions } from '../../lib/config/upload-limits';
const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 10,
};
const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
const validateFileUpload = (file: File, options?: any) => ({ valid: true, isValid: true, error: null });
type FileValidationOptions = any;

export interface FileUploadProps {
    onFileSelect: (file: File) => void;
    onFileRemove?: () => void;
    accept?: string;
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
    disabled?: boolean;
    className?: string;
    showPreview?: boolean;
    currentFile?: File | null;
}

export function FileUpload({
    onFileSelect,
    onFileRemove,
    accept,
    maxSize,
    allowedTypes,
    allowedExtensions,
    disabled = false,
    className,
    showPreview = true,
    currentFile,
}: FileUploadProps) {
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const validationOptions: FileValidationOptions = {
        maxSize,
        allowedTypes,
        allowedExtensions,
    };

    const handleFile = useCallback(
        (file: File) => {
            setError(null);

            // Validate file
            const validation = validateFileUpload(file, validationOptions);
            if (!validation.isValid) {  
                setError(validation.error || 'Invalid file');
                console.error(`Invalid file: ${file.name}`, validation);
                return;
            }

            // Create preview for images
            if (showPreview && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            }

            onFileSelect(file);
        },
        [onFileSelect, validationOptions, showPreview],
    );

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);

            if (disabled) return;

            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFile(e.dataTransfer.files[0]);
            }
        },
        [disabled, handleFile],
    );

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            e.preventDefault();
            if (disabled) return;

            if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
            }
        },
        [disabled, handleFile],
    );

    const handleRemove = useCallback(() => {
        setPreview(null);
        setError(null);
        onFileRemove?.();
    }, [onFileRemove]);

    const displayFile = currentFile;

    return (
        <div className={cn('w-full', className)}>
            {/* Upload Area */}
            {!displayFile && (
                <div
                    className={cn(
                        'relative border-2 border-dashed rounded-lg transition-colors',
                        'border-border dark:border-gray-700',
                        dragActive
                            ? 'border-primary dark:border-blue-500 bg-primary/5 dark:bg-blue-500/10'
                            : 'border-gray-300 dark:border-gray-600',
                        disabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer hover:border-primary dark:hover:border-blue-500',
                        error && 'border-red-500 dark:border-red-500',
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        onChange={handleChange}
                        accept={accept}
                        disabled={disabled}
                    />

                    <div className="flex flex-col items-center justify-center py-8 px-4">
                        <Upload
                            className={cn(
                                'h-12 w-12 mb-3',
                                dragActive ? 'text-primary dark:text-blue-400' : 'text-gray-400 dark:text-gray-500',
                            )}
                        />

                        <p className="text-sm font-medium text-foreground dark:text-white mb-1">
                            Drop file here or click to upload
                        </p>

                        <p className="text-xs text-muted-foreground dark:text-gray-400">
                            Maximum file size: {formatBytes(UPLOAD_LIMITS.MAX_FILE_SIZE || 0)}
                        </p>

                        {accept && (
                            <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">Accepted: {accept}</p>
                        )}
                    </div>
                </div>
            )}

            {/* File Preview */}
            {displayFile && (
                <div className="relative border rounded-lg p-4 bg-card dark:bg-gray-800 border-border dark:border-gray-700">
                    <div className="flex items-start gap-3">
                        {/* Preview Image or File Icon */}
                        {preview ? (
                            <img src={preview} alt="Preview" className="w-16 h-16 object-cover rounded" />
                        ) : (
                            <div className="w-16 h-16 flex items-center justify-center bg-muted dark:bg-gray-900 rounded">
                                <File className="h-8 w-8 text-muted-foreground dark:text-gray-400" />
                            </div>
                        )}

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground dark:text-white truncate">
                                {displayFile.name}
                            </p>
                            <p className="text-xs text-muted-foreground dark:text-gray-400">
                                {formatBytes(displayFile.size)}
                            </p>
                        </div>

                        {/* Remove Button */}
                        {!disabled && (
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="p-1 rounded hover:bg-muted dark:hover:bg-gray-700 transition-colors"
                            >
                                <X className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mt-2 flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}
        </div>
    );
}
