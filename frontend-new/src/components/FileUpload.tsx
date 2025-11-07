import { useState, useRef } from 'react';
import { Upload, X, FileIcon } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  disabled?: boolean;
  existingFiles?: Array<{ id: string; name: string; url?: string }>;
  onRemoveExisting?: (fileId: string) => void;
}

export default function FileUpload({
  onFileSelect,
  accept,
  multiple = false,
  maxSize = 10,
  disabled = false,
  existingFiles = [],
  onRemoveExisting,
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError('');
    const fileArray = Array.from(files);
    
    // Validate file sizes
    const maxSizeBytes = maxSize * 1024 * 1024;
    const oversizedFiles = fileArray.filter(file => file.size > maxSizeBytes);
    
    if (oversizedFiles.length > 0) {
      setError(`Some files exceed the ${maxSize}MB limit`);
      return;
    }

    if (multiple) {
      const newFiles = [...selectedFiles, ...fileArray];
      setSelectedFiles(newFiles);
      onFileSelect(newFiles);
    } else {
      setSelectedFiles([fileArray[0]]);
      onFileSelect([fileArray[0]]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFileSelect(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          disabled={disabled}
        />
        
        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload className="w-10 h-10 text-gray-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              {dragActive ? 'Drop files here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {accept ? `Accepted: ${accept}` : 'All file types accepted'} (Max {maxSize}MB)
            </p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* Existing files */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Existing Files</h4>
          {existingFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-gray-100 rounded-lg"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <FileIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {file.url ? (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block"
                    >
                      {file.name}
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-gray-900 truncate block">
                      {file.name}
                    </span>
                  )}
                </div>
              </div>
              {onRemoveExisting && (
                <button
                  type="button"
                  onClick={() => onRemoveExisting(file.id)}
                  className="ml-2 text-red-600 hover:text-red-800 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Selected files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Selected Files</h4>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <FileIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="ml-2 text-red-600 hover:text-red-800 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
