import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import FileUpload from '../../components/FileUpload';

describe('FileUpload', () => {
  const mockOnFileSelect = vi.fn();
  const mockOnRemoveExisting = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderFileUpload = (props = {}) => {
    return render(
      <FileUpload
        onFileSelect={mockOnFileSelect}
        {...props}
      />
    );
  };

  it('renders the upload dropzone', () => {
    renderFileUpload();
    
    expect(screen.getByText(/click to upload or drag and drop/i)).toBeInTheDocument();
    expect(screen.getByText(/all file types accepted/i)).toBeInTheDocument();
  });

  it('shows accept types and max size', () => {
    renderFileUpload({ accept: '.pdf,.doc', maxSize: 5 });
    
    expect(screen.getByText(/accepted: \.pdf,\.doc/i)).toBeInTheDocument();
    expect(screen.getByText(/max 5mb/i)).toBeInTheDocument();
  });

  it('handles file selection via input', async () => {
    const user = userEvent.setup();
    renderFileUpload();
    
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(mockOnFileSelect).toHaveBeenCalledWith([file]);
    });
    
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
  });

  it('handles multiple file selection', async () => {
    const user = userEvent.setup();
    renderFileUpload({ multiple: true });
    
    const file1 = new File(['content1'], 'file1.pdf', { type: 'application/pdf' });
    const file2 = new File(['content2'], 'file2.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    await user.upload(input, [file1, file2]);
    
    await waitFor(() => {
      expect(mockOnFileSelect).toHaveBeenCalledWith([file1, file2]);
    });
    
    expect(screen.getByText('file1.pdf')).toBeInTheDocument();
    expect(screen.getByText('file2.pdf')).toBeInTheDocument();
  });

  it('validates file size and shows error', async () => {
    const user = userEvent.setup();
    renderFileUpload({ maxSize: 0.001 }); // 0.001MB = ~1KB
    
    // Create a file larger than 1KB
    const largeFile = new File(['x'.repeat(2000)], 'large.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    await user.upload(input, largeFile);
    
    await waitFor(() => {
      expect(screen.getByText(/some files exceed the .* limit/i)).toBeInTheDocument();
    });
    
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('allows removing selected files', async () => {
    const user = userEvent.setup();
    renderFileUpload({ multiple: true });
    
    const file1 = new File(['content1'], 'file1.pdf', { type: 'application/pdf' });
    const file2 = new File(['content2'], 'file2.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    await user.upload(input, [file1, file2]);
    
    await waitFor(() => {
      expect(screen.getByText('file1.pdf')).toBeInTheDocument();
    });
    
    // Find and click the remove button for the first file
    const removeButtons = screen.getAllByRole('button');
    const firstRemoveButton = removeButtons.find(btn => 
      btn.parentElement?.textContent?.includes('file1.pdf')
    );
    
    if (firstRemoveButton) {
      await user.click(firstRemoveButton);
    }
    
    await waitFor(() => {
      // Should be called again with only file2
      expect(mockOnFileSelect).toHaveBeenLastCalledWith([file2]);
    });
  });

  it('displays existing files', () => {
    const existingFiles = [
      { id: '1', name: 'existing1.pdf', url: 'http://example.com/file1.pdf' },
      { id: '2', name: 'existing2.pdf' },
    ];
    
    renderFileUpload({ existingFiles, onRemoveExisting: mockOnRemoveExisting });
    
    expect(screen.getByText('Existing Files')).toBeInTheDocument();
    expect(screen.getByText('existing1.pdf')).toBeInTheDocument();
    expect(screen.getByText('existing2.pdf')).toBeInTheDocument();
  });

  it('handles removing existing files', async () => {
    const user = userEvent.setup();
    const existingFiles = [
      { id: '1', name: 'existing.pdf', url: 'http://example.com/file.pdf' },
    ];
    
    renderFileUpload({ existingFiles, onRemoveExisting: mockOnRemoveExisting });
    
    // Find the remove button in the existing files section
    const removeButtons = screen.getAllByRole('button');
    const existingRemoveButton = removeButtons.find(btn => 
      btn.closest('.bg-gray-100')
    );
    
    if (existingRemoveButton) {
      await user.click(existingRemoveButton);
    }
    
    await waitFor(() => {
      expect(mockOnRemoveExisting).toHaveBeenCalledWith('1');
    });
  });

  it('disables when disabled prop is true', () => {
    renderFileUpload({ disabled: true });
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeDisabled();
    
    // Drop zone should show opacity-50 for disabled state
    const dropZone = input.closest('.relative');
    expect(dropZone).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('formats file sizes correctly', async () => {
    const user = userEvent.setup();
    renderFileUpload();
    
    // Create a file with known size (5000 bytes = ~4.88 KB)
    const file = new File(['x'.repeat(5000)], 'test.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText(/\d+(\.\d+)?\s*KB/i)).toBeInTheDocument();
    });
  });
});
