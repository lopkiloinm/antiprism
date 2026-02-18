"use client";

interface ImageViewerProps {
  imageUrl: string | null;
  alt?: string;
}

export function ImageViewer({ imageUrl, alt = "Image" }: ImageViewerProps) {
  if (!imageUrl) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--muted)] bg-[var(--background)]">
        No image
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-auto bg-[var(--background)] p-4">
      <img
        src={imageUrl}
        alt={alt}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
}
