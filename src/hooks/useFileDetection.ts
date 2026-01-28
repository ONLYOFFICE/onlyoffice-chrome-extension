import { useState, useCallback } from 'preact/hooks';

import { Detector, File as DetectedFile } from '@utils/detector';

interface UseFileDetectionReturn {
    detecting: boolean;
    files: DetectedFile[];
    detect: () => Promise<void>;
}

export function useFileDetection(detector: Detector): UseFileDetectionReturn {
    const [detecting, setDetecting] = useState(true);
    const [files, setFiles] = useState<DetectedFile[]>([]);

    const detect = useCallback(async () => {
        try {
            setDetecting(true);
            const detected = await detector.detect();
            setFiles(detected);
            document.body.classList.toggle('has-files', detected.length > 0);
        } catch (error) {
            console.error('Error detecting files:', error);
        } finally {
            setDetecting(false);
        }
    }, [detector]);

    return {
        files,
        detecting,
        detect
    };
}
