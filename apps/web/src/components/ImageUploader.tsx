'use client';

import { useState, useRef } from 'react';
import { Button } from '@toposonics/ui';

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
  preview: string | null;
  /**
   * Percentage (0-1) representing the current playback position for the scanline overlay
   */
  scanlineProgress?: number;
  /**
   * When true, shows the scanline overlay to mirror the current playback position
   */
  showScanline?: boolean;
}

export function ImageUploader({
  onImageSelected,
  preview,
  scanlineProgress = 0,
  showScanline = false,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelected(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelected(file);
    }
  };

  return (
    <div className="space-y-4">
      {preview ? (
        <div className="relative overflow-hidden rounded-xl">
          <img
            src={preview}
            alt="Selected image"
            className="w-full h-64 object-cover rounded-xl"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden
          >
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-primary-400 shadow-[0_0_12px_rgba(59,130,246,0.8)] transition-transform duration-75 transition-opacity"
              style={{
                transform: `translateX(${Math.min(Math.max(scanlineProgress, 0), 1) * 100}%)`,
                opacity: showScanline ? 1 : 0,
              }}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => fileInputRef.current?.click()}
          >
            Change Image
          </Button>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            isDragging
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-gray-700 hover:border-gray-600'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="text-6xl">📸</div>
            <div>
              <p className="text-lg font-medium mb-2">Drop an image here</p>
              <p className="text-sm text-gray-400 mb-4">or click to browse</p>
            </div>
            <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
              Select Image
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
