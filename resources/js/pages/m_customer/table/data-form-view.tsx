/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dropzone, DropZoneArea, DropzoneFileListItem, DropzoneRemoveFile, DropzoneTrigger, useDropzone } from '@/components/dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Attachment, MasterCustomer } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { CloudUploadIcon, File, SquareCheck, SquareX, Trash2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ViewCustomerForm({ customer }: { customer: MasterCustomer }) {
    const [keterangan, setKeterangan] = useState('');
    // const [attach, setAttach] = useState<File | null>(null);
    const [attachFile, setAttachFile] = useState<File | null>(null);
    const [attachFileUser, setAttachFileUser] = useState<File | null>(null);
    const [attachFileStatuses, setAttachFileStatuses] = useState<any[]>([]);
    const [statusData, setStatusData] = useState<any | null>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);
    const [managerExists, setManagerExists] = useState<boolean>(false);
    const [managerChecked, setManagerChecked] = useState<boolean>(false);

    const { props } = usePage<{
        attachments: Attachment[];
        auth: {
            user: {
                id: number;
                name: string;
                email: string;
                roles: { name: string }[];
            };
        };
    }>();

    const [attachmentError, setAttachmentError] = useState<string | null>(null);

    const { attachments } = props;
    console.log('hasil data', props);

    const creatorId = customer?.id_user;
    const currentUserId = props.auth.user?.id;
    const creatorRole = customer?.creator_role || 'user';
    const isCreator = creatorId === currentUserId;

    const rawRole = props.auth.user.roles?.[0]?.name as string;
    const allowedRolesLawyer = ['lawyer'];
    const userRole = typeof rawRole === 'string' ? rawRole.toLowerCase() : '';
    const allowedRoles = ['manager', 'direktur', 'lawyer'];
    const showExtraFields = allowedRoles.includes(userRole);

    useEffect(() => {
        if (customer?.id) {
            axios
                .get(`/customer-status-check?customer_id=${customer.id}`)
                .then((res) => {
                    setStatusData(res.data);
                })
                .catch((err) => {
                    console.error('Gagal mengambil data status:', err);
                })
                .finally(() => {
                    setIsLoadingStatus(false);
                });
        }
    }, [customer?.id]);

    useEffect(() => {
        const fetchManagerStatus = async () => {
            try {
                const res = await axios.get(`/perusahaan/${customer.id_perusahaan}/has-manager`);
                setManagerExists(res.data.manager_exists);
            } catch (err) {
                console.error('Gagal cek manager:', err);
            } finally {
                setManagerChecked(true); // tunggu selesai dulu
            }
        };

        if (customer.id_perusahaan && statusData?.submit_1_timestamps) {
            fetchManagerStatus();
        }
    }, [customer.id_perusahaan, statusData?.submit_1_timestamps]);

    const showUserSubmit = isCreator && userRole === 'user' && !statusData?.submit_1_timestamps;

    const showAnotherUserSubmit = isCreator && (userRole === 'manager' || userRole === 'direktur') && !statusData?.submit_1_timestamps;

    const showManagerApprove = userRole === 'manager' && !!statusData?.submit_1_timestamps && !statusData?.status_1_timestamps;

    const showDirekturApprove =
        userRole === 'direktur' &&
        ((!!statusData?.status_1_timestamps && !statusData?.status_2_timestamps) || // flow biasa
            (managerChecked && !managerExists && !!statusData?.submit_1_timestamps && !statusData?.status_2_timestamps)); // fallback tanpa manager

    const showLawyerApprove =
        userRole === 'lawyer' &&
        (!!statusData?.status_1_timestamps || !!statusData?.submit_1_timestamps) && // bisa lewat manager atau langsung setelah user
        !statusData?.status_3_timestamps;

    const showSubmitForDirektur =
        managerChecked &&
        !managerExists &&
        userRole === 'direktur' &&
        !!statusData?.submit_1_timestamps &&
        !statusData?.status_2_timestamps &&
        !statusData?.status_3_timestamps; // hindari jika sudah selesai di lawyer

    console.log('User role:', userRole);
    console.log('berhasil', showExtraFields);

    const dropzoneAttach = useDropzone({
        onDropFile: async (file: File) => {
            setAttachFile(file);

            const fileStatus = {
                id: String(Date.now()),
                status: 'success',
                fileName: file.name,
                result: URL.createObjectURL(file),
            } as const;

            setAttachFileStatuses([fileStatus]); // Ganti jika user upload baru
            return fileStatus;
        },
        validation: {
            accept: {
                'application/pdf': ['.pdf'],
            },
            maxSize: 5 * 1024 * 1024,
            maxFiles: 1,
        },
    });

    const dropzoneAttachUser = useDropzone({
        onDropFile: async (file: File) => {
            setAttachFileUser(file);
            const fileStatus = {
                id: String(Date.now()),
                status: 'success',
                fileName: file.name,
                result: URL.createObjectURL(file),
            } as const;

            setAttachFileStatuses([fileStatus]); // ganti status untuk user
            return fileStatus;
        },
        validation: {
            accept: {
                'application/pdf': ['.pdf'],
            },
            maxSize: 5 * 1024 * 1024,
            maxFiles: 1,
        },
    });

    const handleSubmit = async (decision: 'approved' | 'rejected' | null = null) => {
        if (!customer.id) {
            alert('❌ Customer ID tidak ditemukan.');
            return;
        }
        const uploadedAttachments = [];

        if (userRole === 'lawyer' && decision === 'rejected') {
            if (!keterangan.trim()) {
                const message = '❌ Keterangan wajib diisi jika status Bermasalah.';
                setAttachmentError(message);
                alert(message);
                return;
            }

            if (!attachFile) {
                const message = '❌ File PDF wajib diunggah jika status Bermasalah.';
                setAttachmentError(message);
                alert(message);
                return;
            }
        } else {
            setAttachmentError(null); // Reset error jika tidak ada masalah
        }

        // 1️⃣ Upload file ke /customer/upload-temp
        if (showExtraFields && attachFile) {
            try {
                const formDataAttach = new FormData();
                formDataAttach.append('file', attachFile);

                const resAttach = await axios.post('/customer/upload-temp', formDataAttach, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                uploadedAttachments.push({
                    id: 0,
                    customer_id: customer?.id ?? 0,
                    nama_file: resAttach.data.nama_file,
                    path: resAttach.data.path,
                    type: 'note',
                });
            } catch (error) {
                console.error('Upload gagal:', error);
                alert('❌ Upload file gagal.');
                return;
            }
        }

        const formData = new FormData();
        const now = new Date().toISOString();

        formData.append('customer_id', customer.id.toString());
        formData.append('status_1_by', String(props.auth.user.id));
        if (customer?.id_perusahaan) {
            formData.append('id_perusahaan', customer.id_perusahaan.toString());
        }

        if (userRole === 'user' && attachFileUser) {
            formData.append('attach', attachFileUser);
        }

        if (showExtraFields) {
            formData.append('keterangan', keterangan);
            if (attachFile) {
                formData.append('attach', attachFile);
            }
        }

        // Penambahan alur status otomatis berdasarkan creator
        if (creatorId === currentUserId && userRole === 'manager') {
            formData.append('submit_1_timestamps', now);
            formData.append('status_1_by', String(currentUserId));
            formData.append('status_1_timestamps', now);
        } else if (creatorId === currentUserId && userRole === 'direktur') {
            formData.append('submit_1_timestamps', now);
            formData.append('status_2_by', String(currentUserId));
            formData.append('status_2_timestamps', now);
        } else if (userRole === 'user') {
            formData.append('submit_1_timestamps', now);
        } else if (userRole === 'manager') {
            formData.append('status_1_by', String(currentUserId));
            formData.append('status_1_timestamps', now);
        } else if (userRole === 'direktur') {
            formData.append('status_2_by', String(currentUserId));
            formData.append('status_2_timestamps', now);
        }

        if (userRole === 'lawyer' && decision) {
            formData.append('status_3', decision); // 👈 hanya untuk lawyer
        }

        router.post('/submit-customer-status', formData, {
            preserveScroll: true,
            preserveState: true,
            forceFormData: true,
            onSuccess: () => {
                alert('✅ Data berhasil disubmit!');
                setAttachFile(null);
                setAttachFileStatuses([]);
                router.visit(`/customer/${props.customer.id}`, { replace: true, preserveState: false });
            },
            onError: (errors) => {
                const firstError = errors[Object.keys(errors)[0]];
                alert(`❌ Gagal submit: ${firstError}`);
            },
        });
    };

    return (
        <div className="rounded-2xl border-0 p-4">
            <h1 className="mb-4 text-3xl font-semibold">View Customer</h1>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="col-span-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <Label htmlFor="kategori_usaha">Kategori Usaha</Label>
                        <Input
                            id="kategori_usaha"
                            value={customer.kategori_usaha}
                            disabled
                            className="w-full border-black dark:bg-white dark:text-black"
                        />
                    </div>
                    <div>
                        <Label htmlFor="bentuk_badan_usaha">Bentuk Badan Usaha</Label>
                        <Input
                            id="bentuk_badan_usaha"
                            value={customer.bentuk_badan_usaha}
                            disabled
                            className="w-full border-black dark:bg-white dark:text-black"
                        />
                    </div>
                    <div>
                        <Label htmlFor="kota">Kota</Label>
                        <Input id="kota" value={customer.kota} disabled className="w-full border-black dark:bg-white dark:text-black" />
                    </div>
                </div>

                <div className="col-span-3">
                    <Label htmlFor="alamat_lengkap">Alamat Lengkap</Label>
                    <Textarea
                        id="alamat_lengkap"
                        value={customer.alamat_lengkap}
                        className="h-16 w-full border-black dark:bg-white dark:text-black"
                        disabled
                    />
                </div>

                <div className="col-span-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <Label htmlFor="no_telp">No Telp</Label>
                        <Input id="no_telp" value={customer.no_telp || '-'} disabled className="w-full border-black dark:bg-white dark:text-black" />
                    </div>
                    <div>
                        <Label htmlFor="no_fax">No Fax</Label>
                        <Input id="no_fax" value={customer.no_fax || '-'} disabled className="w-full border-black dark:bg-white dark:text-black" />
                    </div>
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={customer.email} disabled className="w-full border-black dark:bg-white dark:text-black" />
                    </div>
                </div>
                <div className="col-span-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <Label htmlFor="website">Website</Label>
                        <Input id="website" value={customer.website || '-'} disabled className="w-full border-black dark:bg-white dark:text-black" />
                    </div>
                    <div>
                        <Label htmlFor="top">TOP</Label>
                        <Input id="top" value={customer.top || '-'} disabled className="w-full border-black dark:bg-white dark:text-black" />
                    </div>
                    <div>
                        <Label htmlFor="status_perpajakan">Status Perpajakan</Label>
                        <Input
                            id="status_perpajakan"
                            value={customer.status_perpajakan || '-'}
                            disabled
                            className="w-full border-black dark:bg-white dark:text-black"
                        />
                    </div>
                </div>
                <div className="col-span-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <Label htmlFor="no_npwp">Nomor NPWP</Label>
                        <Input id="no_npwp" value={customer.no_npwp || '-'} disabled className="w-full border-black dark:bg-white dark:text-black" />
                    </div>
                    <div>
                        <Label htmlFor="no_npwp_16">NPWP 16 Digit</Label>
                        <Input
                            id="no_npwp_16"
                            value={customer.no_npwp_16 || '-'}
                            disabled
                            className="w-full border-black dark:bg-white dark:text-black"
                        />
                    </div>
                </div>

                <div className="col-span-3">
                    <Label htmlFor="alamat_penagihan">Alamat Penagihan</Label>
                    <Textarea
                        id="alamat_penagihan"
                        value={customer.alamat_penagihan}
                        className="h-16 w-full border-black dark:bg-white dark:text-black"
                        disabled
                    />
                </div>

                <div className="col-span-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <Label htmlFor="nama_pj">Nama Penanggung Jawab</Label>
                        <Input id="nama_pj" value={customer.nama_pj || '-'} disabled className="w-full border-black dark:bg-white dark:text-black" />
                    </div>
                    <div>
                        <Label htmlFor="no_ktp_pj">No KTP PJ</Label>
                        <Input
                            id="no_ktp_pj"
                            value={customer.no_ktp_pj || '-'}
                            disabled
                            className="w-full border-black dark:bg-white dark:text-black"
                        />
                    </div>
                    <div>
                        <Label htmlFor="no_telp_pj">No Telp PJ</Label>
                        <Input
                            id="no_telp_pj"
                            value={customer.no_telp_pj || '-'}
                            disabled
                            className="w-full border-black dark:bg-white dark:text-black"
                        />
                    </div>
                </div>

                <div className="col-span-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <Label htmlFor="nama_personal">Nama Personal</Label>
                        <Input
                            id="nama_personal"
                            value={customer.nama_personal || '-'}
                            disabled
                            className="w-full border-black dark:bg-white dark:text-black"
                        />
                    </div>
                    <div>
                        <Label htmlFor="jabatan_personal">Jabatan Personal</Label>
                        <Input
                            id="jabatan_personal"
                            value={customer.jabatan_personal || '-'}
                            disabled
                            className="w-full border-black dark:bg-white dark:text-black"
                        />
                    </div>
                    <div>
                        <Label htmlFor="no_telp_personal">No Telp Personal</Label>
                        <Input
                            id="no_telp_personal"
                            value={customer.no_telp_personal || '-'}
                            disabled
                            className="w-full border-black dark:bg-white dark:text-black"
                        />
                    </div>
                </div>
                <div className="col-span-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <Label htmlFor="email_personal">Email Personal</Label>
                        <Input
                            id="email_personal"
                            value={customer.email_personal || '-'}
                            disabled
                            className="w-full border-black dark:bg-white dark:text-black"
                        />
                    </div>
                </div>
            </div>

            {/* TAMPILKAN ATTACHMENTS */}
            {attachments?.length > 0 && (
                <div className="mt-6">
                    <h2 className="mb-2 text-xl font-bold">Lampiran Dokumen</h2>
                    <div
                        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-${attachments.length >= 3 ? 3 : attachments.length} lg:grid-cols-${attachments.length >= 4 ? 4 : attachments.length} `}
                    >
                        {attachments.map((file) => (
                            <div key={file.id} className="w-full rounded-md border border-gray-500 p-2 dark:bg-neutral-400 dark:text-black">
                                <div className="mb-1 font-medium capitalize">{file.type.toUpperCase()}</div>
                                <a href={file.path} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">
                                    Lihat Dokumen
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showUserSubmit && (
                <>
                    {userRole === 'user' && (
                        <div className="mt-6 w-full md:w-1/3">
                            <Label htmlFor="attach" className="mb-1 block">
                                Upload Lampiran Penawaran Marketing(PDF)
                            </Label>
                            <Dropzone {...dropzoneAttachUser}>
                                <DropZoneArea className="h-[180px] min-h-[180px] overflow-hidden">
                                    {attachFileStatuses.length > 0 ? (
                                        attachFileStatuses.map((file) => (
                                            <DropzoneFileListItem
                                                key={file.id}
                                                file={file}
                                                className="bg-secondary relative h-full w-full overflow-hidden rounded-md shadow-sm"
                                            >
                                                {file.status === 'success' && (
                                                    <div
                                                        onClick={() => file.result && window.open(file.result, '_blank')}
                                                        className="z-10 flex h-full w-full cursor-pointer items-center justify-center bg-gray-100 px-2 text-sm text-ellipsis whitespace-nowrap text-gray-600"
                                                    >
                                                        <File className="mr-2 size-6 shrink-0" />
                                                        {file.fileName}
                                                    </div>
                                                )}

                                                <div className="absolute top-2 right-2 z-20">
                                                    <DropzoneRemoveFile>
                                                        <span
                                                            onClick={() => {
                                                                setAttachFileUser(null);
                                                                setAttachFileStatuses([]);
                                                            }}
                                                            className="bg-white p-1"
                                                        >
                                                            <Trash2Icon className="size-4 text-black" />
                                                        </span>
                                                    </DropzoneRemoveFile>
                                                    <p className="mt-1 text-xs text-red-500">* Wajib unggah file PDF maksimal 5MB</p>
                                                </div>
                                            </DropzoneFileListItem>
                                        ))
                                    ) : (
                                        <DropzoneTrigger className="flex h-full flex-col items-center justify-center gap-4 bg-transparent text-center text-sm">
                                            <CloudUploadIcon className="size-8" />
                                            <div>
                                                <p className="font-semibold">Upload PDF</p>
                                                <p className="text-muted-foreground text-sm">Click atau drag file .pdf ke sini</p>
                                            </div>
                                        </DropzoneTrigger>
                                    )}
                                </DropZoneArea>
                            </Dropzone>
                        </div>
                    )}
                </>
            )}

            {userRole !== 'user' &&
                (showAnotherUserSubmit || showManagerApprove || showDirekturApprove || showSubmitForDirektur || showLawyerApprove) && (
                    <div className="mt-6">
                        <h2 className="text-xl font-bold">Masukkan Data Review</h2>
                        <div className="mt-4 flex flex-col gap-4 md:flex-row">
                            {/* Keterangan */}
                            <div className="w-full md:w-1/2">
                                <Label htmlFor="attach" className="mb-1 block">
                                    Masukkan Keterangan
                                </Label>
                                <textarea
                                    className="h-[180px] w-full rounded-sm border border-gray-500 p-2"
                                    placeholder="Masukkan keterangan"
                                    value={keterangan}
                                    onChange={(e) => setKeterangan(e.target.value)}
                                />
                            </div>

                            {/* Dropzone */}
                            <div className="w-full md:w-1/2">
                                <Label htmlFor="attach" className="mb-1 block">
                                    Upload Lampiran (PDF)
                                </Label>
                                <Dropzone {...dropzoneAttach}>
                                    <DropZoneArea className="h-[180px] min-h-[180px] overflow-hidden border-gray-500">
                                        {attachFileStatuses.length > 0 ? (
                                            attachFileStatuses.map((file) => (
                                                <DropzoneFileListItem
                                                    key={file.id}
                                                    file={file}
                                                    className="bg-secondary relative h-full w-full overflow-hidden rounded-md shadow-sm"
                                                >
                                                    {file.status === 'success' && (
                                                        <div
                                                            onClick={() => file.result && window.open(file.result, '_blank')}
                                                            className="z-10 flex h-full w-full cursor-pointer items-center justify-center overflow-hidden rounded-md bg-gray-100 px-2 text-sm text-ellipsis whitespace-nowrap text-gray-600"
                                                        >
                                                            <File className="mr-2 size-5 shrink-0" />
                                                            {file.fileName}
                                                        </div>
                                                    )}
                                                    <div className="absolute top-2 right-2 z-20">
                                                        <DropzoneRemoveFile>
                                                            <span
                                                                onClick={() => {
                                                                    setAttachFile(null);
                                                                    setAttachFileStatuses([]);
                                                                }}
                                                                className="rounded-full bg-white p-1"
                                                            >
                                                                <Trash2Icon className="size-4 text-black" />
                                                            </span>
                                                        </DropzoneRemoveFile>
                                                    </div>
                                                </DropzoneFileListItem>
                                            ))
                                        ) : (
                                            <DropzoneTrigger className="flex h-full flex-col items-center justify-center gap-4 bg-transparent text-center text-sm">
                                                <CloudUploadIcon className="size-8" />
                                                <div>
                                                    <p className="font-semibold">Upload PDF</p>
                                                    <p className="text-muted-foreground text-sm">Click atau drag file .pdf ke sini</p>
                                                </div>
                                            </DropzoneTrigger>
                                        )}
                                    </DropZoneArea>
                                </Dropzone>
                                {userRole === 'lawyer' && <p className="mt-1 text-xs text-red-500">* Wajib unggah file PDF maksimal 5MB</p>}
                            </div>
                        </div>
                    </div>
                )}

            <div className="mt-6 mb-6 space-x-3">
                {(showUserSubmit || showAnotherUserSubmit) && (
                    <Button variant="default" className="dark:bg-neutral-400" onClick={() => handleSubmit()}>
                        Submit
                    </Button>
                )}

                {showManagerApprove && (
                    <Button variant="default" className="dark:bg-neutral-400" onClick={() => handleSubmit()}>
                        Approved
                    </Button>
                )}

                {(showDirekturApprove || showSubmitForDirektur) && (
                    <Button variant="default" className="dark:bg-neutral-400" onClick={() => handleSubmit()}>
                        Approved
                    </Button>
                )}

                {showLawyerApprove && (
                    <>
                        <Button variant="default" className="dark:bg-neutral-400" onClick={() => handleSubmit('approved')}>
                            Aman
                        </Button>
                        <Button variant="destructive" onClick={() => handleSubmit('rejected')} className="text-white">
                            Bermasalah
                        </Button>
                    </>
                )}

                <Link href="/customer">
                    <Button variant="secondary" className="border-1 border-black">
                        Kembali
                    </Button>
                </Link>
            </div>

            <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${managerChecked && !managerExists ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
                {/* Disubmit */}
                <div>
                    <div className="rounded-t-sm border-t border-r border-b border-l border-gray-500 p-2 dark:bg-neutral-400 dark:text-black">
                        <Label htmlFor="kategori_usaha">Disubmit</Label>
                    </div>

                    <div className="border-r border-l border-gray-500 p-2 dark:bg-neutral-400 dark:text-black">
                        {statusData?.submit_1_timestamps && (
                            <div className="text-muted-foreground mt-1 text-sm dark:text-black">
                                <p>
                                    <strong>{statusData.nama_user}</strong>
                                </p>
                                <p>
                                    tanggal{' '}
                                    <strong>
                                        {new Date(statusData.submit_1_timestamps).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}
                                    </strong>{' '}
                                    pukul{' '}
                                    <strong>
                                        {new Date(statusData.submit_1_timestamps).toLocaleTimeString('id-ID', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                            hour12: false,
                                        })}
                                    </strong>
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="rounded-b-sm border-r border-b border-l border-gray-500 p-2 dark:bg-neutral-400 dark:text-black">
                        {statusData?.submit_1_nama_file && (
                            <div className="">
                                <h4 className="text-muted-foreground text-sm font-bold dark:text-black">Attachment</h4>
                                <a
                                    href={`/storage/attachments/${statusData.submit_1_nama_file}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm text-blue-600 underline"
                                >
                                    <File className="h-4 w-4" />
                                    Lihat Lampiran Marketing
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Diverifikasi */}
                {managerChecked && managerExists && (
                    <div>
                        <div className="rounded-t-sm border-t border-r border-b border-l border-gray-500 p-2 dark:bg-neutral-400 dark:text-black">
                            <Label htmlFor="bentuk_badan_usaha">Diverifikasi</Label>
                        </div>
                        <div className="border-r border-l border-gray-500 p-2 dark:bg-neutral-400 dark:text-black">
                            {statusData?.status_1_timestamps && (
                                <div className="text-muted-foreground mt-1 text-sm dark:text-black">
                                    <p>
                                        <strong>{statusData.status_1_by_name}</strong>
                                    </p>
                                    <p>
                                        tanggal{' '}
                                        <strong>
                                            {new Date(statusData.status_1_timestamps).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                            })}
                                        </strong>{' '}
                                        pukul{' '}
                                        <strong>
                                            {new Date(statusData.status_1_timestamps).toLocaleTimeString('id-ID', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit',
                                                hour12: false,
                                            })}
                                        </strong>
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="rounded-b-sm border-r border-b border-l border-gray-500 p-2 dark:bg-neutral-400 dark:text-black">
                            {statusData?.status_1_timestamps && (
                                <>
                                    {statusData.status_1_keterangan && (
                                        <div className="text-muted-foreground mt-1 text-sm dark:text-black">
                                            <p>
                                                <strong>Keterangan</strong>
                                            </p>
                                            <p>{statusData.status_1_keterangan}</p>
                                        </div>
                                    )}
                                    {statusData.status_1_nama_file && (
                                        <div className="border-gray-500 pt-2">
                                            <h4 className="text-muted-foreground text-sm font-bold dark:text-black">Attachment</h4>
                                            <a
                                                href={`/storage/attachments/${statusData.status_1_nama_file}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-sm text-blue-600 underline"
                                            >
                                                <File className="h-4 w-4" />
                                                Lihat Lampiran
                                            </a>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Mengetahui */}
                <div>
                    <div className="rounded-t-sm border-t border-r border-b border-l border-gray-500 p-2 dark:bg-neutral-400 dark:text-black">
                        <Label htmlFor="kota">Mengetahui</Label>
                    </div>
                    <div className="border-r border-l border-gray-500 p-2 dark:bg-neutral-400">
                        {statusData?.status_2_timestamps && (
                            <div className="text-muted-foreground mt-1 text-sm dark:text-black">
                                <p>
                                    <strong> {statusData.status_2_by_name} </strong>
                                </p>
                                <p>
                                    tanggal{' '}
                                    <strong>
                                        {new Date(statusData.status_2_timestamps).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}
                                    </strong>{' '}
                                    pukul{' '}
                                    <strong>
                                        {new Date(statusData.status_2_timestamps).toLocaleTimeString('id-ID', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                            hour12: false,
                                        })}
                                    </strong>
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="rounded-b-sm border-r border-b border-l border-gray-500 p-2 dark:bg-neutral-400 dark:text-black">
                        {statusData?.status_2_timestamps && (
                            <>
                                {statusData.status_2_keterangan && (
                                    <div className="text-muted-foreground mt-1 text-sm dark:text-black">
                                        <p>
                                            <strong>Keterangan</strong>
                                        </p>
                                        <p>{statusData.status_2_keterangan}</p>
                                    </div>
                                )}
                                {statusData.status_2_nama_file && (
                                    <div className="border-gray-500 pt-2">
                                        <h4 className="text-muted-foreground text-sm font-bold dark:text-black">Attachment</h4>
                                        <a
                                            href={`/storage/attachments/${statusData.status_2_nama_file}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm text-blue-600 underline"
                                        >
                                            <File className="h-4 w-4" />
                                            Lihat Lampiran
                                        </a>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Direview */}
                <div>
                    <div className="rounded-t-sm border-t border-r border-b border-l border-gray-500 p-2 dark:bg-neutral-400 dark:text-black">
                        <Label htmlFor="kota">Direview</Label>{' '}
                    </div>
                    <div className="border-r border-l border-gray-500 p-2 dark:bg-neutral-400">
                        {statusData?.status_3_timestamps && (
                            <div className="text-muted-foreground mt-1 text-sm dark:text-black">
                                <div className="mb-2 flex items-center justify-between font-semibold">
                                    <span>
                                        <strong>{statusData.status_3_by_name}</strong>
                                    </span>
                                    <span
                                        className={`mb-1 flex items-center gap-2 pr-4 ${
                                            statusData.status_3.toLowerCase() === 'rejected'
                                                ? 'text-red-600'
                                                : statusData.status_3.toLowerCase() === 'approved'
                                                  ? 'text-green-600'
                                                  : 'text-muted-foreground'
                                        }`}
                                    >
                                        {statusData.status_3.toLowerCase() === 'rejected' && (
                                            <>
                                                <SquareX className="h-4 w-4" />
                                                <span>BERMASALAH</span>
                                            </>
                                        )}
                                        {statusData.status_3.toLowerCase() === 'approved' && (
                                            <>
                                                <SquareCheck className="h-4 w-4" />
                                                <span>AMAN</span>
                                            </>
                                        )}
                                        {statusData.status_3.toLowerCase() !== 'approved' && statusData.status_3.toLowerCase() !== 'rejected' && (
                                            <span>{statusData.status_3}</span>
                                        )}
                                    </span>
                                </div>

                                <p>
                                    tanggal{' '}
                                    <strong>
                                        {new Date(statusData.status_2_timestamps).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}
                                    </strong>{' '}
                                    pukul{' '}
                                    <strong>
                                        {new Date(statusData.status_2_timestamps).toLocaleTimeString('id-ID', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                            hour12: false,
                                        })}
                                    </strong>
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="rounded-b-sm border-r border-b border-l border-gray-500 p-2 dark:bg-neutral-400 dark:text-black">
                        {statusData?.status_3_timestamps && (
                            <>
                                {statusData.status_3_keterangan && (
                                    <div className="text-muted-foreground text-sm dark:text-black">
                                        <p>
                                            <strong>Keterangan</strong>
                                        </p>
                                        <p>{statusData.status_3_keterangan}</p>
                                    </div>
                                )}
                                {statusData.submit_3_keterangan && (
                                    <div className="mt-2">
                                        <h4 className="text-muted-foreground text-sm font-bold dark:text-black">Attachment Lawyer</h4>
                                        <a
                                            href={`/storage/attachments/${statusData.submit_3_nama_file}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm text-blue-600 underline"
                                        >
                                            <File className="h-4 w-4" />
                                            Lihat Lampiran
                                        </a>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
