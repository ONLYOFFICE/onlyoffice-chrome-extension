import { Format } from '@utils/formats';

import formats from '@vendor/document-formats/onlyoffice-docs-formats.json';

const MIME_TYPES: Record<string, string> = {};
(formats as Format[]).forEach((format) => {
  if (format.mime.length > 0) {
    MIME_TYPES[format.name] = format.mime[0];
  }
});

export async function calculate(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  const [array] = [Array.from(new Uint8Array(hash))];
  return array.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export async function download(url: string, fileName: string): Promise<Blob> {
  const response = await chrome.runtime.sendMessage({
    action: 'downloadFile',
    url,
  });

  if (!response.success) {
    throw new Error(response.error || 'Download failed');
  }

  const binary = atob(response.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const type = response.type || getMimeType(fileName);
  return new Blob([bytes], { type });
}
