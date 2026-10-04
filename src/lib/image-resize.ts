// 產品照片上傳前在瀏覽器縮圖（P1，2026-10-04）
// 前台圖片不經過伺服器壓縮，原檔會直接傳給買家；手機照片常有 3–5 MB，所以上傳前先縮小
// 只在瀏覽器使用（canvas），不需新增套件

export const MAX_IMAGE_EDGE = 1600;
// 已經夠小的圖片不重新壓縮，避免畫質變差
const SKIP_BELOW_BYTES = 400 * 1024;
const QUALITY = 0.82;

// 依原尺寸計算縮小後的尺寸（長邊不超過 maxEdge，不放大）
export function fitWithin(width: number, height: number, maxEdge = MAX_IMAGE_EDGE) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return {width, height};
  const scale = maxEdge / longest;
  return {width: Math.round(width * scale), height: Math.round(height * scale)};
}

export function replaceExtension(fileName: string, ext: string) {
  const base = fileName.replace(/\.[^./\\]+$/, '') || 'image';
  return `${base}.${ext}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

async function loadImage(file: Blob) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * 縮小並壓縮產品照片：長邊最多 1600px，優先轉成 WebP（瀏覽器不支援時用 JPEG）
 * 已經夠小、或處理失敗時回傳原檔，由伺服器照原本的規則檢查
 */
export async function resizeProductImage(file: File): Promise<File> {
  try {
    const img = await loadImage(file);
    const target = fitWithin(img.naturalWidth, img.naturalHeight);
    const needsResize = target.width !== img.naturalWidth || target.height !== img.naturalHeight;
    if (!needsResize && file.size <= SKIP_BELOW_BYTES) return file;

    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    let blob = await canvasToBlob(canvas, 'image/webp');
    const webpSupported = blob?.type === 'image/webp';
    // JPEG 沒有透明背景，先鋪白底，避免透明 PNG 變成黑底
    if (!webpSupported) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, target.width, target.height);
    blob = await canvasToBlob(canvas, webpSupported ? 'image/webp' : 'image/jpeg');
    if (!blob || blob.size >= file.size) return file;

    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    return new File([blob], replaceExtension(file.name, ext), {type: blob.type, lastModified: Date.now()});
  } catch {
    return file;
  }
}
