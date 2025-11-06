'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileImage, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
  label?: string;
  helperText?: string;
}

interface FileWithPreview {
  file: File;
  preview: string;
  progress: number;
}

/**
 * FileUpload component with drag-drop, preview, and validation
 * Supports:
 * - Drag and drop
 * - Click to browse
 * - Image previews
 * - File size validation
 * - File type validation
 * - Multiple files (configurable max)
 * - Progress indication
 * - Remove files
 */
export function FileUpload({
  onFilesChange,
  maxFiles = 3,
  maxSizeMB = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  disabled = false,
  label = 'Upload Files',
  helperText,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return `File type not accepted. Allowed: ${acceptedTypes
        .map((t) => t.split('/')[1])
        .join(', ')}`;
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `File size exceeds ${maxSizeMB} MB`;
    }

    return null;
  };

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(newFiles);

      // Check total file count
      if (files.length + fileArray.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const validFiles: FileWithPreview[] = [];

      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }

        // Create preview for images
        const preview = URL.createObjectURL(file);
        validFiles.push({
          file,
          preview,
          progress: 100, // In real upload, this would be updated
        });
      }

      const updatedFiles = [...files, ...validFiles];
      setFiles(updatedFiles);
      onFilesChange(updatedFiles.map((f) => f.file));
    },
    [files, maxFiles, onFilesChange]
  );

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = files.filter((_, i) => i !== index);
      // Revoke object URL to free memory
      URL.revokeObjectURL(files[index].preview);
      setFiles(newFiles);
      onFilesChange(newFiles.map((f) => f.file));
      setError(null);
    },
    [files, onFilesChange]
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  // Cleanup previews on unmount
  React.useEffect(() => {
    return () => {
      files.forEach((file) => URL.revokeObjectURL(file.preview));
    };
  }, []);

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}

      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : error
            ? 'border-red-300 bg-red-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center text-center">
          <Upload className="h-10 w-10 text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-700">
            Drop files here or click to browse
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {`Up to ${maxFiles} files, ${maxSizeMB} MB each`}
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Helper text */}
      {!error && helperText && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}

      {/* File previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {files.map((fileWithPreview, index) => (
            <div
              key={index}
              className="relative group rounded-lg border border-gray-200 overflow-hidden"
            >
              {/* Image preview */}
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                {fileWithPreview.file.type.startsWith('image/') ? (
                  <img
                    src={fileWithPreview.preview}
                    alt={fileWithPreview.file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileImage className="h-12 w-12 text-gray-400" />
                )}
              </div>

              {/* File info */}
              <div className="p-2 bg-white">
                <p className="text-xs font-medium text-gray-700 truncate">
                  {fileWithPreview.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(fileWithPreview.file.size / 1024).toFixed(1)} KB
                </p>

                {/* Progress bar (if uploading) */}
                {fileWithPreview.progress < 100 && (
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${fileWithPreview.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                disabled={disabled}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                aria-label={`Remove ${fileWithPreview.file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
