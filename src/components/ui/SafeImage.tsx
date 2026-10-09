'use client';

import Image, {type ImageProps} from 'next/image';
import {useCallback, useState, type SyntheticEvent} from 'react';
import {NO_IMAGE_URL} from '@/lib/product-image-url';

// 圖片網址載入失敗時（檔案被刪除、網址錯誤）自動換成「No Image」圖，不顯示破圖
export function SafeImage({src, onError, ...props}: ImageProps) {
  const source = typeof src === 'string' ? src : NO_IMAGE_URL;
  const [failedSource, setFailedSource] = useState('');

  // 圖片在畫面「互動化」之前就已載入失敗時，onError 不會觸發，所以掛上後再檢查一次
  const checkLoaded = useCallback(
    (img: HTMLImageElement | null) => {
      if (img && source !== NO_IMAGE_URL && img.complete && img.naturalWidth === 0) setFailedSource(source);
    },
    [source]
  );

  return (
    <Image
      {...props}
      ref={checkLoaded}
      src={failedSource === source ? NO_IMAGE_URL : source}
      onError={(event) => {
        if (source !== NO_IMAGE_URL) setFailedSource(source);
        onError?.(event);
      }}
    />
  );
}

// 給一般 <img>（例如後台縮圖）使用：載入失敗就換成「No Image」圖
export function fallbackToNoImage(event: SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget;
  if (!img.src.endsWith(NO_IMAGE_URL)) img.src = NO_IMAGE_URL;
}
