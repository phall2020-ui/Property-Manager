import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '../../lib/api';
import type { Attachment } from '../../types/attachments';
import { formatFileSize, isImageFile } from '../../lib/file-utils';
import { Download, Trash2, FileText, Image as ImageIcon, Eye } from 'lucide-react';
import ImageLightbox from './ImageLightbox';

interface AttachmentListProps {
  ticketId: string;
  attachments: Attachment[];
  canDelete?: boolean;
}

export default function AttachmentList({ ticketId, attachments, canDelete = false }: AttachmentListProps) {
  const queryClient = useQueryClient();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'before' | 'after'>('all');

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => ticketsApi.deleteAttachment(ticketId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', ticketId] });
      setDeleteConfirm(null);
    },
  });

  const handleDelete = (attachmentId: string) => {
    if (deleteConfirm === attachmentId) {
      deleteMutation.mutate(attachmentId);
    } else {
      setDeleteConfirm(attachmentId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const handleDownload = (attachment: Attachment) => {
    window.open(attachment.url, '_blank');
  };

  const handleViewImage = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Filter by category
  const filteredAttachments = attachments.filter(att => {
    if (activeTab === 'all') return true;
    return att.category === activeTab;
  });

  const images = filteredAttachments.filter(att => isImageFile(att.contentType));
  const documents = filteredAttachments.filter(att => !isImageFile(att.contentType));

  if (attachments.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">No attachments yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['all', 'before', 'after'] as const).map(tab => {
          const count = tab === 'all' 
            ? attachments.length 
            : attachments.filter(a => a.category === tab).length;
          
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {/* Images Grid */}
      {images.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Images ({images.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((attachment, index) => (
              <div key={attachment.id} className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                <img
                  src={attachment.url}
                  alt={attachment.filename}
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => handleViewImage(index)}
                    className="p-2 bg-white rounded-full hover:bg-gray-100"
                    aria-label="View image"
                  >
                    <Eye className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={() => handleDownload(attachment)}
                    className="p-2 bg-white rounded-full hover:bg-gray-100"
                    aria-label="Download image"
                  >
                    <Download className="w-4 h-4 text-gray-700" />
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(attachment.id)}
                      className={`p-2 rounded-full hover:bg-gray-100 ${
                        deleteConfirm === attachment.id ? 'bg-red-600' : 'bg-white'
                      }`}
                      aria-label={deleteConfirm === attachment.id ? 'Confirm delete' : 'Delete'}
                    >
                      <Trash2 className={`w-4 h-4 ${
                        deleteConfirm === attachment.id ? 'text-white' : 'text-red-600'
                      }`} />
                    </button>
                  )}
                </div>

                {/* Filename tooltip */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {attachment.filename}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents List */}
      {documents.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documents ({documents.length})
          </h4>
          <div className="space-y-2">
            {documents.map((attachment) => (
              <div
                key={attachment.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {attachment.filename}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span>{formatFileSize(attachment.size)}</span>
                        <span>•</span>
                        <span>
                          {new Date(attachment.createdAt).toLocaleString('en-GB', {
                            dateStyle: 'short',
                            timeZone: 'Europe/London',
                          })}
                        </span>
                        {attachment.category && attachment.category !== 'other' && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{attachment.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleDownload(attachment)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      aria-label="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(attachment.id)}
                        className={`p-2 rounded ${
                          deleteConfirm === attachment.id
                            ? 'bg-red-600 text-white'
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                        aria-label={deleteConfirm === attachment.id ? 'Confirm delete' : 'Delete'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {deleteConfirm === attachment.id && (
                  <p className="text-xs text-red-600 mt-2">
                    Click again to confirm deletion
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxOpen && images.length > 0 && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
