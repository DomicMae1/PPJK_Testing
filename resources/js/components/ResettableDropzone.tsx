/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// resources/js/components/ResettableDropzone.tsx

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { File as FileIcon, Loader2, Trash2Icon } from 'lucide-react';
import React, { useState } from 'react';
import { Accept, FileRejection, useDropzone } from 'react-dropzone';
import { Button } from './ui/button';
import { Label } from './ui/label';

interface FileStatus {
    id: string;
    status: 'uploading' | 'processing' | 'success' | 'error';
    fileName: string;
    previewUrl?: string;
    errorMessage?: string;
    progress?: number;
}

interface UploadConfig {
    url: string;
    payload: Record<string, any>; // Data tambahan seperti npwp, id_perusahaan, type
}

interface ResettableDropzoneProps {
    onFileChange: (file: File | null, response?: any) => void;
    label: string;
    isRequired?: boolean;
    existingFile?: { nama_file: string; path: string };
    validation?: { accept?: Accept; maxSize?: number };
    uploadConfig?: UploadConfig;
}

export function ResettableDropzone({
    onFileChange,
    label,
    isRequired = false,
    existingFile,
    validation = {
        accept: { 'application/pdf': ['.pdf'] },
        maxSize: 5 * 1024 * 1024, // 5MB
    },
    uploadConfig,
    disabled = false,
}: ResettableDropzoneProps & { disabled?: boolean }) {
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

    const handleUpload = async (file: File) => {
        if (!uploadConfig) {
            // Fallback ke behavior lama jika tidak ada config upload
            setFileStatus({
                id: String(Date.now()),
                status: 'success',
                fileName: file.name,
                previewUrl: URL.createObjectURL(file),
            });
            onFileChange(file);
            return;
        }

        // Set initial uploading state
        setFileStatus({
            id: String(Date.now()),
            status: 'uploading',
            fileName: file.name,
            progress: 0,
        });

        const formData = new FormData();
        formData.append('file', file);

        // Append dynamic payload (npwp, type, order, id_perusahaan)
        Object.keys(uploadConfig.payload).forEach((key) => {
            formData.append(key, uploadConfig.payload[key]);
        });

        try {
            const res = await axios.post(uploadConfig.url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const total = progressEvent.total || file.size;
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / total);

                    setFileStatus((prev) => {
                        if (!prev) return null;

                        const isProcessing = percentCompleted === 100;
                        return {
                            ...prev,
                            status: isProcessing ? 'processing' : 'uploading',
                            progress: percentCompleted,
                        };
                    });
                },
            });

            // Handle Response Sukses dari Controller
            setFileStatus({
                id: String(Date.now()),
                status: 'success',
                fileName: res.data.nama_file || file.name,
                previewUrl: res.data.path, // Menggunakan path dari response backend
            });

            // Pass file original dan response backend ke parent
            onFileChange(file, res.data);
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.error || 'Gagal mengupload file';
            setFileStatus({
                id: String(Date.now()),
                status: 'error',
                fileName: file.name,
                errorMessage: msg,
            });
            onFileChange(null);
        }
    };

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
                handleUpload(file);
            }
        },
        [onFileChange, uploadConfig],
    );

    const { getRootProps, getInputProps, isDragReject } = useDropzone({
        onDrop,
        maxFiles: 1,
        accept: validation.accept,
        maxSize: validation.maxSize,
        disabled: disabled || fileStatus?.status === 'uploading' || fileStatus?.status === 'processing',
    });

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFileStatus(null);
        onFileChange(null);
        setComponentKey(Date.now());
    };

    const borderColor = isDragReject ? 'border-red-500' : 'border-gray-300';

    const fixedPreviewUrl =
        fileStatus?.previewUrl && fileStatus.previewUrl.startsWith('/')
            ? fileStatus.previewUrl
            : fileStatus?.previewUrl
                ? `/shipping/${fileStatus.previewUrl}`
                : null;

    return (
        <div className="w-full">
            <Label className="mb-1 block">
                {label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <div className="flex w-full flex-col items-end">
                <div
                    key={componentKey}
                    {...getRootProps()}
                    className={cn(
                        // Base Style
                        'relative flex cursor-pointer items-center justify-center rounded-lg border transition-all',
                        // Size & Spacing
                        fileStatus ? 'w-auto h-auto p-2 bg-blue-50 border-blue-200' : 'h-9 w-28 border-gray-300 bg-white hover:bg-gray-50',
                        // Dark Mode
                        'dark:border-neutral-700 dark:bg-neutral-900',
                        borderColor
                    )}
                >
                    <input {...getInputProps()} />

                    {fileStatus ? (
                        <div className="flex w-full items-center justify-between gap-2">
                            {/* File Info & View Link */}
                            <div className="flex items-center gap-2 overflow-hidden flex-1" onClick={(e) => {
                                if (fixedPreviewUrl) {
                                    e.stopPropagation();
                                    window.open(fixedPreviewUrl, '_blank');
                                }
                            }}>
                                <FileIcon className="h-4 w-4 shrink-0 text-blue-600" />
                                <div className="flex flex-col truncate text-left">
                                    <span className="truncate text-xs font-semibold text-gray-800">{fileStatus.fileName}</span>
                                    {fixedPreviewUrl && <span className="text-[10px] text-blue-600 underline">Lihat File</span>}
                                    {!fixedPreviewUrl && (fileStatus.status === 'uploading' || fileStatus.status === 'processing') && (
                                        <span className="text-[10px] text-gray-500">
                                            {fileStatus.status === 'processing' ? 'Processing...' : `Uploading ${fileStatus.progress}%`}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            {fileStatus.status !== 'uploading' && fileStatus.status !== 'processing' && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0 rounded-full text-gray-400 hover:bg-white hover:text-red-500"
                                    onClick={handleDelete}
                                >
                                    <Trash2Icon className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ) : (
                        <span className="text-xs font-medium text-gray-500">Upload here</span>
                    )}
                </div>
            </div>
        </div>
    );
}
