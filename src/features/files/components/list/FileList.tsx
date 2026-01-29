import { FunctionalComponent } from 'preact';

import { FileItem } from '@features/files/components/list/FileItem';

import { File as DetectedFile } from '@utils/detector';

import './file-list.css';

interface FileListProps {
  readonly files: DetectedFile[];
  readonly isAuthenticated: boolean;
  readonly processingFiles: ReadonlySet<string>;
  readonly getIcon: (extension: string) => string;
  readonly onRefresh: () => void;
  readonly onFileAction: (action: 'download' | 'edit', url: string, name: string) => void;
}

export const FileList: FunctionalComponent<FileListProps> = ({
  files,
  isAuthenticated,
  processingFiles,
  getIcon,
  onRefresh,
  onFileAction,
}) => {
  const ensureExtension = (name: string, extension: string): string => {
    const lowerName = name.toLowerCase();
    const lowerExt = extension.toLowerCase();

    if (!lowerName.endsWith(lowerExt)) {
      return `${name}${extension}`;
    }

    return name;
  };

  const createKey = (url: string, name: string): string => `${url}${name}`;

  if (files.length === 0) {
    return null;
  }

  return (
    <ul className="file-list__list" role="list">
      {files.map((file) => {
        const fullName = ensureExtension(file.name, file.extension);
        const name = file.name.toLowerCase().endsWith(file.extension.toLowerCase())
          ? file.name.substring(0, file.name.length - file.extension.length)
          : file.name;
        const icon = getIcon(file.extension);
        const key = createKey(file.url, fullName);
        const isProcessing = processingFiles.has(key);

        return (
          <FileItem
            key={key}
            icon={icon}
            name={name}
            extension={file.extension.replace('.', '')}
            isProcessing={isProcessing}
            isAuthenticated={isAuthenticated}
            onDownload={() => onFileAction('download', file.url, fullName)}
            onEdit={() => onFileAction('edit', file.url, fullName)}
          />
        );
      })}
    </ul>
  );
};
