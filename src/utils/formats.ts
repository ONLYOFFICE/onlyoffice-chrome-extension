import formats from '@vendor/document-formats/onlyoffice-docs-formats.json';

export interface Format {
  name: string;
  type: string;
  actions: string[];
  convert: string[];
  mime: string[];
}

export const FORMATS = formats as Format[];
export const VALID_FORMATS = FORMATS.filter((f) => f.actions.length > 0);
export const FORMAT_EXTENSIONS = VALID_FORMATS.map((f) => `.${f.name}`);
export const FORMAT_MAP = new Map<string, Format>();
const MIME_TYPES: Record<string, string> = {};

FORMATS.forEach((format) => {
  FORMAT_MAP.set(format.name.toLowerCase(), format);
});

FORMATS.forEach((format) => {
  if (format.mime.length > 0) {
    const [firstMime] = format.mime;
    MIME_TYPES[format.name.toLowerCase()] = firstMime;
  }
});

export function hasActions(ext: string): boolean {
  if (!ext) return false;
  const normalized = ext.toLowerCase().replace(/^\./, '');
  const format = FORMAT_MAP.get(normalized);
  return !!format && format.actions.length > 0;
}

export function getMimeType(extOrFileName: string): string {
  const lower = extOrFileName.toLowerCase();
  const parts = lower.split('.');
  const ext = parts.length > 1 ? parts.pop() || '' : lower;
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export function isDocumentFile(contentType: string, url: string): boolean {
  const lowerContentType = contentType.toLowerCase();

  for (const format of VALID_FORMATS) {
    if (format.mime.some((mime) => {
      const lowerMime = mime.toLowerCase();
      return lowerContentType === lowerMime || lowerContentType.includes(lowerMime);
    })) {
      return true;
    }
  }

  const lowerUrl = url.toLowerCase();
  for (const format of VALID_FORMATS) {
    if (lowerUrl.endsWith(`.${format.name}`)) {
      return true;
    }
  }

  return false;
}
