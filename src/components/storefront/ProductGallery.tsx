import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface ProductGalleryProps {
  images: { url: string; publicId: string; alt?: string; isPrimary: boolean }[];
}

export function ProductGallery({ images }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-96 bg-surface-100 dark:bg-surface-800 rounded-xl flex items-center justify-center">
        <span className="text-surface-400">No image available</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full h-96 rounded-xl overflow-hidden bg-surface-100 dark:bg-surface-800">
        <Image
          src={images[selectedIndex]?.url || "https://via.placeholder.com/800x800"}
          alt={images[selectedIndex]?.alt || `Product image ${selectedIndex + 1}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
        {images.length > 1 && (
          <>
            <button
              onClick={() => setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-surface-900/80 rounded-full p-2 hover:bg-white dark:hover:bg-surface-900 transition-colors touch-target"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-surface-900/80 rounded-full p-2 hover:bg-white dark:hover:bg-surface-900 transition-colors touch-target"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedIndex(idx)}
            aria-label={`View image ${idx + 1} of ${images.length}`}
            aria-current={idx === selectedIndex}
            className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors flex-shrink-0 ${
              idx === selectedIndex ? "border-brand-600" : "border-transparent"
            }`}
          >
            <Image src={img.url} alt={img.alt || `Thumbnail ${idx + 1}`} width={80} height={80} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
