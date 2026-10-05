import React, { useState } from 'react';
import { getProductImageUrl } from '../../utils/imageUrl';

interface ImageGalleryProps {
  images: string[];
  productName: string;
  updatedAt?: string | Date | number | null;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, productName, updatedAt }) => {
  const rawList =
    images && images.length > 0
      ? images
      : ['https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80'];

  const imageList = rawList.map((img) => getProductImageUrl(img, updatedAt));

  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="flex flex-col-reverse md:flex-row gap-4">
      {/* Thumbnail Strip */}
      {imageList.length > 1 && (
        <div className="flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto max-h-[480px] pb-2 md:pb-0 scrollbar-none">
          {imageList.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 bg-gray-50 ${
                activeIndex === idx ? 'border-[#237A3B] shadow-xs' : 'border-gray-200 hover:border-gray-300 opacity-75'
              }`}
            >
              <img
                src={img}
                alt={`${productName} thumbnail ${idx + 1}`}
                className="w-full h-full object-cover object-center"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main Active Image */}
      <div className="flex-1 relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shadow-xs">
        <img
          src={imageList[activeIndex] || imageList[0]}
          alt={productName}
          className="w-full h-full object-contain p-4 transition-all duration-300"
        />
      </div>
    </div>
  );
};
