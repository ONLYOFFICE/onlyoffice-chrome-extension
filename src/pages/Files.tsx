import { FunctionalComponent } from 'preact';
import { useRef, useState, useEffect } from 'preact/hooks';

import { Spinner } from '@components/Spinner';
import { Subtitle } from '@components/Subtitle';

import { Empty } from '@features/feedback';
import { FileList, FileItem } from '@features/files';

import { useI18n } from '@stores/i18n';
import { File as RecentFile } from '@stores/docs';

import { Detector, File as DetectedFile } from '@utils/detector';

const REMOVAL_ANIMATION_DURATION = 250;

type DisplayFile = RecentFile & { isRemoving?: boolean };

interface FilesPageProps {
    readonly detectedFiles: DetectedFile[];
    readonly recentFiles: RecentFile[];
    readonly detector: Detector;
    readonly isAuthenticated: boolean;
    readonly detectingFiles: boolean;
    readonly initialLoadComplete: boolean;
    readonly isFetching: boolean;
    readonly loadingMore: boolean;
    readonly hasMore: boolean;
    readonly processingFiles: ReadonlySet<string>;
    readonly processingRecentFiles: ReadonlySet<number>;
    readonly onDetectedFileAction: (action: 'download' | 'edit', url: string, name: string) => void;
    readonly onRecentFileAction: (action: string, fileId: number, webUrl: string) => void;
    readonly onRefresh: () => void;
}

const extractFileInfo = (title: string, extension: string): { name: string; ext: string } => {
    const ext = extension.replace('.', '');
    const lowerTitle = title.toLowerCase();
    const lowerExt = extension.toLowerCase();
    const name = lowerTitle.endsWith(lowerExt)
        ? title.substring(0, title.length - extension.length)
        : title;

    return { name, ext };
};

export const FilesPage: FunctionalComponent<FilesPageProps> = ({
    detectedFiles,
    recentFiles,
    detector,
    isAuthenticated,
    detectingFiles,
    initialLoadComplete,
    isFetching,
    loadingMore,
    hasMore,
    processingFiles,
    processingRecentFiles,
    onDetectedFileAction,
    onRecentFileAction,
    onRefresh
}) => {
    const { t, locale } = useI18n();
    const _ = locale.value;
    
    const sentinelRef = useRef<HTMLDivElement>(null);
    const removalTimersRef = useRef<Map<number, number>>(new Map());
    
    const [displayFiles, setDisplayFiles] = useState<DisplayFile[]>([]);

    const isLoading = detectingFiles || !initialLoadComplete;

    const hasDetectedFiles = detectedFiles.length > 0;
    const hasRecentFiles = recentFiles && recentFiles.length > 0;
    const hasAnyFiles = hasDetectedFiles || hasRecentFiles;

    if (isLoading) {
        return (
            <div class="file-list__loading">
                <Spinner />
            </div>
        );
    }

    if (!hasAnyFiles) {
        return (
            <Empty
                title={t('files.no_docs_yet')}
                subtitle={t('files.no_docs_subtitle')}
            />
        );
    }

    useEffect(() => {
        const nextFiles = recentFiles || [];
        setDisplayFiles((prev) => {
            const nextMap = new Map(nextFiles.map((file) => [file.id, file]));
            const used = new Set<number>();
            const merged: DisplayFile[] = [];

            for (const prevItem of prev) {
                const nextItem = nextMap.get(prevItem.id);
                if (nextItem) {
                    if (prevItem.isRemoving) {
                        const timer = removalTimersRef.current.get(prevItem.id);
                        if (timer) {
                            clearTimeout(timer);
                            removalTimersRef.current.delete(prevItem.id);
                        }
                    }

                    merged.push({ ...nextItem, isRemoving: false });
                    used.add(prevItem.id);
                } else {
                    merged.push(prevItem.isRemoving ? prevItem : { ...prevItem, isRemoving: true });
                }
            }

            for (const nextItem of nextFiles) {
                if (!used.has(nextItem.id)) {
                    merged.push({ ...nextItem, isRemoving: false });
                }
            }

            return merged;
        });
    }, [recentFiles]);

    useEffect(() => {
        for (const item of displayFiles) {
            if (!item.isRemoving || removalTimersRef.current.has(item.id)) continue;

            const timer = window.setTimeout(() => {
                removalTimersRef.current.delete(item.id);
                setDisplayFiles((prev) => prev.filter((file) => file.id !== item.id));
            }, REMOVAL_ANIMATION_DURATION);

            removalTimersRef.current.set(item.id, timer);
        }

        return () => {
            for (const timer of removalTimersRef.current.values()) {
                clearTimeout(timer);
            }
            
            removalTimersRef.current.clear();
        };
    }, [displayFiles]);

    const getIcon = (extension: string): string => detector.getIcon(extension);
    const hasDisplayFiles = displayFiles.length > 0;

    return (
        <>
            {hasDetectedFiles && (
                <div class="file-list__section file-list__section--detected">
                    <Subtitle>{t('files.files_detected')}</Subtitle>
                    <div class="file-list__container">
                        <FileList
                            files={detectedFiles}
                            isAuthenticated={isAuthenticated}
                            onRefresh={onRefresh}
                            onFileAction={onDetectedFileAction}
                            getIcon={getIcon}
                            processingFiles={processingFiles}
                        />
                    </div>
                </div>
            )}

            {isAuthenticated && (
                <div class="file-list__section file-list__section--recent">
                    <Subtitle>{t('files.recent_files')}</Subtitle>
                    {hasDisplayFiles ? (
                        <>
                            <ul class="file-list__list file-list__list--recent">
                                {displayFiles.map((file) => {
                                    const isProcessing = processingRecentFiles.has(file.id);
                                    const icon = getIcon(file.fileExst);
                                    const { name, ext } = extractFileInfo(file.title, file.fileExst);

                                    return (
                                        <FileItem
                                            key={file.id}
                                            icon={icon}
                                            name={name}
                                            extension={ext}
                                            isProcessing={isProcessing}
                                            isRemoving={Boolean(file.isRemoving)}
                                            isAuthenticated={isAuthenticated}
                                            onDelete={() => onRecentFileAction('delete', file.id, file.webUrl)}
                                            onDownload={() => onRecentFileAction('download', file.id, file.webUrl)}
                                            onEdit={() => onRecentFileAction('edit', file.id, file.webUrl)}
                                        />
                                    );
                                })}
                            </ul>
                            {hasMore && (
                                <div ref={sentinelRef} class="file-list__sentinel">
                                    {loadingMore && (
                                        <div class="file-list__loading-more">
                                            <Spinner size="small" />
                                            <span>{t('files.loading_more_files')}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <Empty
                            title={t('files.no_recent_docs')}
                            subtitle={t('files.no_recent_docs_subtitle')}
                        />
                    )}
                </div>
            )}
        </>
    );
};
