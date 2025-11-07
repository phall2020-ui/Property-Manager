import { useState, useEffect, KeyboardEvent } from 'react';
import { Attachment } from '../../types/attachments';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface ImageLightboxProps {
  images: Attachment[];
  initialIndex: number;
  onClose: () => void;
}

export default function ImageLightbox({ images, initialIndex, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const currentImage = images[currentIndex];

  useEffect(() => {
    const handleKeyPress = (e: globalThis.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.body.style.overflow = 'unset';
    };
  }, [currentIndex, images.length]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    resetTransforms();
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    resetTransforms();
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const resetTransforms = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleDownload = () => {
    window.open(currentImage.url, '_blank');
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-full text-white z-10"
        aria-label="Close viewer"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-4 p-2 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-full text-white z-10"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 p-2 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-full text-white z-10"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Toolbar */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-white bg-opacity-10 backdrop-blur-sm rounded-full px-4 py-2 z-10">
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full text-white"
          aria-label="Zoom out"
          disabled={zoom <= 0.5}
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <span className="text-white text-sm px-2 min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full text-white"
          aria-label="Zoom in"
          disabled={zoom >= 3}
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-white bg-opacity-20 mx-2" />
        <button
          onClick={handleRotate}
          className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full text-white"
          aria-label="Rotate"
        >
          <RotateCw className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-white bg-opacity-20 mx-2" />
        <button
          onClick={handleDownload}
          className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full text-white"
          aria-label="Download"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-10 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm z-10">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Main image */}
      <div className="max-w-7xl max-h-[90vh] overflow-auto">
        <img
          src={currentImage.url}
          alt={currentImage.filename}
          className="object-contain transition-transform"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            maxWidth: '90vw',
            maxHeight: '80vh',
          }}
        />
      </div>

      {/* Image info */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-10 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm max-w-md text-center">
        <p className="truncate">{currentImage.filename}</p>
        {currentImage.category && currentImage.category !== 'other' && (
          <p className="text-xs text-gray-300 mt-1 capitalize">{currentImage.category}</p>
        )}
      </div>
    </div>
  );
}
