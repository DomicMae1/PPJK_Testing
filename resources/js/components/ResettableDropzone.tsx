// resources/js/components/ResettableDropzone.tsx

import { cn } from '@/lib/utils';
import { CloudUploadIcon, File as FileIcon, Trash2Icon } from 'lucide-react';
import React, { useState } from 'react';
import { Accept, FileRejection, useDropzone } from 'react-dropzone';
import { Button } from './ui/button';
import { Label } from './ui/label';

interface FileStatus {
    id: string;
    status: 'success' | 'error';
    fileName: string;
    previewUrl?: string;
    errorMessage?: string;
}

interface ResettableDropzoneProps {
    onFileChange: (file: File | null) => void;
    label: string;
    isRequired?: boolean;
    existingFile?: { nama_file: string; path: string };
    validation?: { accept?: Accept; maxSize?: number };
}

export function ResettableDropzone({
    onFileChange,
    label,
    isRequired = false,
    existingFile,
    validation = { accept: { 'application/pdf': ['.pdf'] }, maxSize: 5 * 1024 * 1024 },
}: ResettableDropzoneProps) {
    const [fileStatus, setFileStatus] = useState<FileStatus | null>(null);
    const [componentKey, setComponentKey] = useState(Date.now());

    React.useEffect(() => {
        if (existingFile && existingFile.path) {
            setFileStatus({
                id: `existing-${existingFile.nama_file}`,
                status: 'success',
                fileName: existingFile.nama_file,
                previewUrl: existingFile.path,
            });
        }
    }, [existingFile]);

    const onDrop = React.useCallback(
        (acceptedFiles: File[], fileRejections: FileRejection[]) => {
            if (fileRejections.length > 0) {
                const rejection = fileRejections[0];
                setFileStatus({
                    id: String(Date.now()),
                    status: 'error',
                    fileName: rejection.file.name,
                    errorMessage: rejection.errors[0].message,
                });
                onFileChange(null);
            } else if (acceptedFiles.length > 0) {
                const file = acceptedFiles[0];
                setFileStatus({
                    id: String(Date.now()),
                    status: 'success',
                    fileName: file.name,
                    previewUrl: URL.createObjectURL(file),
                });
                onFileChange(file);
            }
        },
        [onFileChange],
    );

    const { getRootProps, getInputProps, isDragReject } = useDropzone({
        onDrop,
        maxFiles: 1,
        accept: validation.accept,
        maxSize: validation.maxSize,
    });

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFileStatus(null);
        onFileChange(null);
        setComponentKey(Date.now());
    };

    const borderColor = isDragReject ? 'border-red-500' : 'border-gray-300';

    return (
        <div className="w-full">
            <Label className="mb-1 block">
                {label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <div
                key={componentKey}
                {...getRootProps()}
                className={cn(
                    'flex h-[100px] min-h-[100px] cursor-pointer items-center justify-center rounded-md border-2 border-black p-4 text-center transition-colors md:h-[100px] md:min-h-[200px] dark:border-neutral-800',
                    borderColor,
                )}
            >
                <input {...getInputProps()} />

                {fileStatus ? (
                    <div className="relative flex h-full w-full flex-row items-center justify-center gap-3 rounded-md bg-gray-100 p-2 text-gray-700 md:flex-col md:gap-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 rounded-full bg-white p-1 shadow-md"
                            onClick={handleDelete}
                        >
                            <Trash2Icon className="size-4 text-black" />
                        </Button>
                        <FileIcon className="mb-2 h-10 w-10" />
                        <p className="hidden max-w-full truncate text-sm font-medium md:block">{fileStatus.fileName}</p>
                        {fileStatus.status === 'error' && <p className="mt-1 text-xs text-red-600">{fileStatus.errorMessage}</p>}
                        {fileStatus.status === 'success' && fileStatus.previewUrl && (
                            <a
                                href={fileStatus.previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 text-xs text-blue-600 underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Lihat File
                            </a>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-sm text-gray-500 dark:text-white">
                        <CloudUploadIcon className="h-10 w-10" />
                        <p>Klik atau drag file PDF ke sini</p>
                    </div>
                )}
            </div>
        </div>
    );
}
