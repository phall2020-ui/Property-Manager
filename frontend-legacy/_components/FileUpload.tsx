'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileImage, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getAccessToken } from '@/lib/apiClient';

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  onUploadComplete?: (uploadedFiles: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
  label?: string;
  helperText?: string;
  uploadEndpoint?: string;
  autoUpload?: boolean;
}

interface FileWithPreview {
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  uploadedUrl?: string;
}

interface UploadedFile {
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

/**
 * FileUpload component with drag-drop, preview, upload to server, and validation
 * 
 * Features:
 * - Drag and drop
 * - Click to browse
 * - Image previews
 * - File size validation
 * - File type validation
 * - Multiple files (configurable max)
 * - Progress indication with real upload progress
 * - Remove files
 * - Auto-upload or manual upload
 * - Multipart/form-data upload
 * - Error handling per file
 * 
 * Note: Parent components should memoize onFilesChange and onUploadComplete callbacks
 * using useCallback to prevent unnecessary re-renders.
 */
export function FileUpload({
  onFilesChange,
  onUploadComplete,
  maxFiles = 3,
  maxSizeMB = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
  disabled = false,
  label = 'Upload Files',
  helperText,
  uploadEndpoint = '/api/documents/upload',
  autoUpload = false,
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

  const uploadFile = async (fileWithPreview: FileWithPreview, index: number) => {
    const formData = new FormData();
    formData.append('file', fileWithPreview.file);

    try {
      // Update status to uploading
      setFiles(prevFiles => 
        prevFiles.map((f, i) => 
          i === index ? { ...f, status: 'uploading' as const, progress: 0 } : f
        )
      );

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setFiles(prevFiles => 
            prevFiles.map((f, i) => 
              i === index ? { ...f, progress: percentComplete } : f
            )
          );
        }
      });

      // Handle completion
      return new Promise<UploadedFile>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              setFiles(prevFiles => 
                prevFiles.map((f, i) => 
                  i === index 
                    ? { ...f, status: 'success' as const, progress: 100, uploadedUrl: response.url } 
                    : f
                )
              );
              resolve({
                filename: fileWithPreview.file.name,
                url: response.url,
                size: fileWithPreview.file.size,
                mimeType: fileWithPreview.file.type,
              });
            } catch (parseError) {
              reject(new Error('Invalid server response'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });

        // NOTE: Since the backend endpoint doesn't exist yet, this will fail
        // In a real implementation, this would upload to the server
        xhr.open('POST', uploadEndpoint);
        
        // Get access token from apiClient (secure token management)
        const accessToken = getAccessToken();
        if (accessToken) {
          xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        }
        
        xhr.send(formData);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setFiles(prevFiles => 
        prevFiles.map((f, i) => 
          i === index ? { ...f, status: 'error' as const, error: errorMessage } : f
        )
      );
      throw err;
    }
  };

  const addFiles = useCallback(
    async (newFiles: FileList | File[]) => {
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
          progress: 0,
          status: 'pending',
        });
      }

      const updatedFiles = [...files, ...validFiles];
      setFiles(updatedFiles);
      
      // Stabilize callback invocation
      if (onFilesChange) {
        onFilesChange(updatedFiles.map((f) => f.file));
      }

      // Auto-upload if enabled
      if (autoUpload) {
        const startIndex = files.length;
        const uploadPromises = validFiles.map((fileWithPreview, idx) => 
          uploadFile(fileWithPreview, startIndex + idx)
        );

        try {
          const uploadedFiles = await Promise.all(uploadPromises);
          // Stabilize callback invocation
          if (onUploadComplete) {
            onUploadComplete(uploadedFiles);
          }
        } catch (err) {
          console.error('Error uploading files:', err);
        }
      }
    },
    // Note: files dependency is intentional here for functionality
    // onFilesChange and onUploadComplete should be memoized in parent components using useCallback
    [files, maxFiles, autoUpload, validateFile, uploadFile]
  );

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = files.filter((_, i) => i !== index);
      // Revoke object URL to free memory
      URL.revokeObjectURL(files[index].preview);
      setFiles(newFiles);
      
      // Stabilize callback invocation
      if (onFilesChange) {
        onFilesChange(newFiles.map((f) => f.file));
      }
      setError(null);
    },
    [files]
  );

  const uploadAllFiles = async () => {
    const pendingFiles = files
      .map((f, i) => ({ file: f, index: i }))
      .filter(({ file }) => file.status === 'pending' || file.status === 'error');

    if (pendingFiles.length === 0) return;

    const uploadPromises = pendingFiles.map(({ file, index }) => 
      uploadFile(file, index).catch(err => {
        console.error(`Error uploading ${file.file.name}:`, err);
        return null;
      })
    );

    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter((r): r is UploadedFile => r !== null);
    
    // Stabilize callback invocation
    if (successfulUploads.length > 0 && onUploadComplete) {
      onUploadComplete(successfulUploads);
    }
  };

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

  const hasPendingFiles = files.some(f => f.status === 'pending' || f.status === 'error');

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

      {/* Manual upload button */}
      {!autoUpload && hasPendingFiles && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            uploadAllFiles();
          }}
          disabled={disabled}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Upload Files
        </button>
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
                
                {/* Status overlay */}
                {fileWithPreview.status === 'uploading' && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                )}
                {fileWithPreview.status === 'success' && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="h-6 w-6 text-green-500 bg-white rounded-full" />
                  </div>
                )}
                {fileWithPreview.status === 'error' && (
                  <div className="absolute top-2 right-2">
                    <AlertCircle className="h-6 w-6 text-red-500 bg-white rounded-full" />
                  </div>
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

                {/* Error message */}
                {fileWithPreview.status === 'error' && fileWithPreview.error && (
                  <p className="text-xs text-red-600 mt-1">
                    {fileWithPreview.error}
                  </p>
                )}

                {/* Progress bar (if uploading) */}
                {fileWithPreview.status === 'uploading' && (
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
                disabled={disabled || fileWithPreview.status === 'uploading'}
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
