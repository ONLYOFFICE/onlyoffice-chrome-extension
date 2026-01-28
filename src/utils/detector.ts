import { Format } from '@utils/formats';

import pdfIcon from '@icons/pdf.svg';
import wordIcon from '@icons/word.svg';
import cellIcon from '@icons/cell.svg';
import pptxIcon from '@icons/pptx.svg';
import vsdIcon from '@icons/vsd.svg';
import unknownIcon from '@icons/unknown.svg';

import formats from '@vendor/document-formats/onlyoffice-docs-formats.json';

export interface File {
    name: string;
    url: string;
    extension: string;
}

const VALID_FORMATS = (formats as Format[]).filter(f => f.actions.length > 0);
const EXTENSIONS = VALID_FORMATS.map(f => `.${f.name}`);

const ICONS: Record<string, string> = {};

VALID_FORMATS.forEach((format) => {
    const ext = `.${format.name}`;

    const iconMap: Record<string, string> = {
        word: wordIcon,
        cell: cellIcon,
        slide: pptxIcon,
        pdf: pdfIcon,
        diagram: vsdIcon,
    };

    ICONS[ext] = iconMap[format.type] || unknownIcon;
});

export class Detector {
    async detect(): Promise<File[]> {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
                if (!tabs[0]?.id) {
                    resolve([]);
                    return;
                }

                try {
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        func: (extensions: string[]) => {
                            const files: File[] = [];
                            const links = document.querySelectorAll('a[href]');
                            
                            links.forEach(link => {
                                const href = (link as HTMLAnchorElement).href;
                                const text = link.textContent?.trim() || '';
                                
                                for (const ext of extensions) {
                                    const lower = href.toLowerCase();
                                    if (lower.endsWith(ext) || 
                                        lower.includes(ext + '?') || 
                                        lower.includes(ext + '#')) {
                                        const name = text || href.split('/').pop()?.split('?')[0] || `Document${ext}`;
                                        files.push({
                                            name: name.length > 50 ? name.substring(0, 50) + '...' : name,
                                            url: href,
                                            extension: ext
                                        });
                                        break;
                                    }
                                }
                            });

                            return files;
                        },
                        args: [EXTENSIONS]
                    });

                    resolve(results?.[0]?.result || []);
                } catch (error) {
                    console.error('File detection error:', error);
                    resolve([]);
                }
            });
        });
    }

    getIcon(extension: string): string {
        return ICONS[extension] || unknownIcon;
    }
}
