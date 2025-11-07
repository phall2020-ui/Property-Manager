export interface Attachment {
  id: string;
  ticketId: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
  category?: 'before' | 'after' | 'other';
  uploadedBy: string;
  uploadedByRole: string;
  createdAt: string;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  attachment?: Attachment;
}
