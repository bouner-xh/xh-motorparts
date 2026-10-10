'use client';

import {useState} from 'react';
import {SafeImage} from '@/components/ui/SafeImage';

// 產品頁圖庫：大圖加縮圖列，點縮圖切換大圖；只有一張圖時不顯示縮圖列，畫面和單張圖時相同（U9）
export function ProductGallery({images, alt, thumbLabel}: {images: string[]; alt: string; thumbLabel: string}) {
  const [active, setActive] = useState(0);
  const current = images[Math.min(active, images.length - 1)] ?? images[0];

  return (
    <>
      <SafeImage src={current} alt={alt} width={900} height={900} unoptimized />
      {images.length > 1 ? (
        <ul className="product-gallery__thumbs" aria-label={alt}>
          {images.map((src, index) => (
            <li key={`${src}-${index}`}>
              <button
                type="button"
                className="product-gallery__thumb"
                aria-label={thumbLabel.replace('{n}', String(index + 1)).replace('{total}', String(images.length))}
                aria-current={index === active ? 'true' : undefined}
                onClick={() => setActive(index)}
              >
                <SafeImage src={src} alt="" width={120} height={120} unoptimized />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
