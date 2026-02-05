import { isDocumentFile } from '@utils/formats';

export function parseRedirectUrl(originalUrl: string, html: string): string | null {
  try {
    const replaceMatch = html.match(/\.replace\(['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\)/);
    if (replaceMatch) {
      const searchPattern = replaceMatch[1];
      const replacement = replaceMatch[2];

      const transformedUrl = originalUrl.replace(searchPattern, replacement);
      return transformedUrl;
    }

    const directUrlMatch = html.match(/window\.location\.(?:replace|href)\s*=\s*['"]([^'"]+)['"]/);
    if (directUrlMatch) {
      let redirectUrl = directUrlMatch[1];
      if (!redirectUrl.startsWith('http')) {
        try {
          const baseUrl = new URL(originalUrl);
          redirectUrl = new URL(redirectUrl, baseUrl.origin).href;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Error resolving relative URL:', e);
        }
      }

      return redirectUrl;
    }

    const metaRefreshPattern = /<meta[^>]*http-equiv=['"]refresh['"][^>]*content=['"][^;]*;\s*url=([^'"]+)['"]/i;
    const metaRefreshMatch = html.match(metaRefreshPattern);
    if (metaRefreshMatch) {
      let redirectUrl = metaRefreshMatch[1];
      if (!redirectUrl.startsWith('http')) {
        try {
          const baseUrl = new URL(originalUrl);
          redirectUrl = new URL(redirectUrl, baseUrl.origin).href;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Error resolving relative URL:', e);
        }
      }

      return redirectUrl;
    }

    return null;
  } catch {
    return null;
  }
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return btoa(binary);
}

export async function downloadFile(url: string, maxRedirects = 5, depth = 0): Promise<any> {
  if (depth >= maxRedirects) {
    return { success: false, error: 'Too many redirects' };
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { success: false, error: `Download failed: ${response.status}` };
    }

    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('text/html')) {
      const html = await response.text();

      const transformedUrl = parseRedirectUrl(url, html);
      if (transformedUrl && transformedUrl !== url) {
        return await downloadFile(transformedUrl, maxRedirects, depth + 1);
      }

      const blob = new Blob([html], { type: contentType });
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = toBase64(arrayBuffer);

      return {
        success: true,
        data: base64,
        type: blob.type || 'text/html',
        size: blob.size,
      };
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = toBase64(arrayBuffer);

    return {
      success: true,
      data: base64,
      type: blob.type || 'application/octet-stream',
      size: blob.size,
    };
  } catch (error) {
    let errorMessage = 'Failed to download file. Please try again.';
    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorMessage = 'Unable to connect to the file server. Please check your internet connection and try again.';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return { success: false, error: errorMessage };
  }
}
