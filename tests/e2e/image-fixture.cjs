// 測試用的大張照片：在瀏覽器用 canvas 畫出 4000×3000 的漸層加雜訊圖，存成高畫質 JPEG（約數 MB，類似手機照片）
const fs = require('node:fs');

async function writeLargePhoto(page, filePath, { width = 4000, height = 3000 } = {}) {
  const base64 = await page.evaluate(
    ({ width, height }) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, width, height);
      g.addColorStop(0, '#334155');
      g.addColorStop(0.5, '#b91c1c');
      g.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      const img = ctx.getImageData(0, 0, width, height);
      // 加上輕微雜訊，模擬相片的細節（純色圖片壓縮後太小，無法代表真實照片）
      let seed = 1;
      for (let i = 0; i < img.data.length; i += 4) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const n = (seed % 41) - 20;
        img.data[i] += n;
        img.data[i + 1] += n;
        img.data[i + 2] += n;
      }
      ctx.putImageData(img, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.97).split(',')[1];
    },
    { width, height }
  );
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  return fs.statSync(filePath).size;
}

module.exports = { writeLargePhoto };
