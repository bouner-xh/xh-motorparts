import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {getLegacyImagesRoot} from '@/lib/assets';

const mimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp'
};

export async function GET(_request: Request, {params}: {params: Promise<{path: string[]}>}) {
  const {path: segments} = await params;
  const safePath = path.normalize(segments.join('/')).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(getLegacyImagesRoot(), safePath);

  if (!filePath.startsWith(getLegacyImagesRoot())) {
    return new Response('Forbidden', {status: 403});
  }

  try {
    const file = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    return new Response(file, {
      headers: {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch {
    return new Response('Not Found', {status: 404});
  }
}
