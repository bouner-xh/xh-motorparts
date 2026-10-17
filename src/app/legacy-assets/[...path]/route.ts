import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {getLegacyImagesRoot} from '@/lib/assets';
import {LEGACY_ASSET_MIME_TYPES, resolveLegacyAssetPath} from '@/lib/legacy-asset-path';

export async function GET(_request: Request, {params}: {params: Promise<{path: string[]}>}) {
  const {path: segments} = await params;
  const filePath = resolveLegacyAssetPath(getLegacyImagesRoot(), segments);

  if (!filePath) {
    return new Response('Forbidden', {status: 403});
  }

  try {
    const file = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    return new Response(file, {
      headers: {
        'Content-Type': LEGACY_ASSET_MIME_TYPES[ext],
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch {
    return new Response('Not Found', {status: 404});
  }
}
