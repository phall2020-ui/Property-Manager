import type { DragEvent, ChangeEvent } from 'react';
import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '../../lib/api';
import { validateFile, validateTotalSize, formatFileSize, isImageFile } from '../../lib/file-utils';
import type { UploadProgress } from '../../types/attachments';
import { Upload, X, FileText, Image, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface AttachmentUploaderProps {
  ticketId: string;
  onUploadComplete?: () => void;
}

export default function AttachmentUploader({ ticketId, onUploadComplete }: AttachmentUploaderProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [category, setCategory] = useState<'before' | 'after' | 'other'>('other');

  const uploadMutation = useMutation({
    mutationFn: async ({ file, category }: { file: File; category?: 'before' | 'after' | 'other' }) => {
      // Update progress to uploading
      setUploads(prev => 
        prev.map(u => u.file === file ? { ...u, status: 'uploading' as const, progress: 50 } : u)
      );
      
      const result = await ticketsApi.uploadAttachment(ticketId, file, category);
      
      // Update progress to success
      setUploads(prev => 
        prev.map(u => u.file === file ? { ...u, status: 'success' as const, progress: 100, attachment: result } : u)
      );
      
      return result;
    },
    onError: (error: Error, { file }) => {
      const message = error instanceof Error && 'response' in error 
        ? (error as any).response?.data?.message  // eslint-disable-line @typescript-eslint/no-explicit-any
        : 'Upload failed';
      setUploads(prev =>
        prev.map(u => u.file === file ? { 
          ...u, 
          status: 'error' as const, 
          error: message
        } : u)
      );
      toast.error(`Failed to upload ${file.name}: ${message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', ticketId] });
      toast.success('File uploaded successfully!');
      onUploadComplete?.();
    },
  });

  const handleFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Validate total size
    const existingFiles = uploads.filter(u => u.status !== 'error').map(u => u.file);
    const allFiles = [...existingFiles, ...fileArray];
    const totalSizeValidation = validateTotalSize(allFiles);
    
    if (!totalSizeValidation.valid) {
      setUploads(prev => [...prev, {
        file: fileArray[0], // Just use first file for error display
        progress: 0,
        status: 'error',
        error: totalSizeValidation.error,
      }]);
      return;
    }

    // Validate each file and add to queue
    const newUploads: UploadProgress[] = fileArray.map(file => {
      const validation = validateFile(file);
      
      if (!validation.valid) {
        return {
          file,
          progress: 0,
          status: 'error' as const,
          error: validation.error,
        };
      }

      return {
        file,
        progress: 0,
        status: 'pending' as const,
      };
    });

    setUploads(prev => [...prev, ...newUploads]);

    // Start uploading valid files
    newUploads.forEach(upload => {
      if (upload.status === 'pending') {
        uploadMutation.mutate({ file: upload.file, category });
      }
    });
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeUpload = (file: File) => {
    setUploads(prev => prev.filter(u => u.file !== file));
  };

  const clearCompleted = () => {
    setUploads(prev => prev.filter(u => u.status !== 'success'));
  };

  const hasCompletedUploads = uploads.some(u => u.status === 'success');
  const hasActiveUploads = uploads.some(u => u.status === 'pending' || u.status === 'uploading');

  return (
    <div className="space-y-4">
      {/* Category Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        <div className="flex gap-2">
          {(['before', 'after', 'other'] as const).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 text-sm rounded-md border font-medium ${
                category === cat
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-600 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-sm font-medium text-gray-700 mb-1">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-gray-500 mb-4">
          Images (PNG, JPG, WebP, GIF) and PDF • Max 10MB per file • Max 50MB total
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.webp,.gif,.pdf"
          onChange={handleFileInput}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 font-medium"
        >
          Select Files
        </button>
      </div>

      {/* Upload Queue */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              Upload Queue ({uploads.length})
            </h4>
            {hasCompletedUploads && !hasActiveUploads && (
              <button
                type="button"
                onClick={clearCompleted}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Clear completed
              </button>
            )}
          </div>

          <div className="space-y-2">
            {uploads.map((upload, index) => (
              <div
                key={`${upload.file.name}-${index}`}
                className="bg-white border border-gray-200 rounded-lg p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {isImageFile(upload.file) ? (
                      <Image className="w-5 h-5 text-gray-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {upload.file.name}
                      </p>
                      {upload.status !== 'uploading' && (
                        <button
                          type="button"
                          onClick={() => removeUpload(upload.file)}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mb-2">
                      {formatFileSize(upload.file.size)}
                    </p>

                    {upload.status === 'uploading' && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                    )}

                    {upload.status === 'success' && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-medium">Uploaded successfully</span>
                      </div>
                    )}

                    {upload.status === 'error' && (
                      <div className="flex items-start gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="text-xs">{upload.error}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
