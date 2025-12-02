/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResettableDropzone } from '@/components/ResettableDropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Attachment, MasterCustomer } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { File, Loader2, SquareCheck, SquareX } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ViewCustomerForm({ customer }: { customer: MasterCustomer }) {
    const [keterangan, setKeterangan] = useState('');
    // const [attach, setAttach] = useState<File | null>(null);
    const [attachFile, setAttachFile] = useState<File | null>(null);
    const [attachFileUser, setAttachFileUser] = useState<File | null>(null);
    const [attachFileStatuses, setAttachFileStatuses] = useState<any[]>([]);
    const [statusData, setStatusData] = useState<any | null>(null);
    const [auditorStartReview, setAuditorStartReview] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [managerExists, setManagerExists] = useState<boolean>(false);
    const [managerChecked, setManagerChecked] = useState<boolean>(false);
    const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);

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

    const creatorId = customer?.id_user;
    const currentUserId = props.auth.user?.id;
    const creatorRole = customer?.creator_role || 'user';
    const isCreator = creatorId === currentUserId;

    const rawRole = props.auth.user.roles?.[0]?.name as string;
    const allowedRolesLawyer = ['lawyer'];
    const userRole = typeof rawRole === 'string' ? rawRole.toLowerCase() : '';
    const allowedRoles = ['manager', 'direktur', 'lawyer', 'auditor'];
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
                    setIsLoading(false);
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
                setManagerChecked(true);
            }
        };

        fetchManagerStatus();
    }, [customer.id_perusahaan, statusData?.submit_1_timestamps]);

    const showUserSubmit = isCreator && userRole === 'user' && !statusData?.submit_1_timestamps;

    const showAnotherUserSubmit = isCreator && (userRole === 'manager' || userRole === 'direktur') && !statusData?.submit_1_timestamps;

    const showManagerApprove = userRole === 'manager' && !!statusData?.submit_1_timestamps && !statusData?.status_1_timestamps;

    const showDirekturApprove =
        userRole === 'direktur' &&
        ((!!statusData?.status_1_timestamps && !statusData?.status_2_timestamps) ||
            (managerChecked && !managerExists && !!statusData?.submit_1_timestamps && !statusData?.status_2_timestamps));

    const showLawyerApprove =
        userRole === 'lawyer' && (!!statusData?.status_1_timestamps || !!statusData?.submit_1_timestamps) && !statusData?.status_3_timestamps;

    const showSubmitForDirektur =
        managerChecked &&
        !managerExists &&
        userRole === 'direktur' &&
        !!statusData?.submit_1_timestamps &&
        !statusData?.status_2_timestamps &&
        !statusData?.status_3_timestamps;

    const canEdit = !statusData?.submit_1_timestamps && (isCreator || (creatorRole && userRole && creatorRole === userRole));

    const handleSubmit = async (decision: 'approved' | 'rejected' | null = null) => {
        if (!customer.id) {
            alert('❌ Customer ID tidak ditemukan.');
            return;
        }
        setIsLoading(true);
        const uploadedAttachments = [];

        if (userRole === 'lawyer' && decision === 'rejected') {
            if (!keterangan.trim()) {
                const message = '❌ Keterangan wajib diisi jika status Bermasalah.';
                setAttachmentError(message);
                alert(message);
                setIsLoading(false);
                return;
            }

            if (!attachFile) {
                const message = '❌ File PDF wajib diunggah jika status Bermasalah.';
                setAttachmentError(message);
                alert(message);
                setIsLoading(false);
                return;
            }
        } else {
            setAttachmentError(null);
        }

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
                setIsLoading(false);
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

        let isDirekturCreatorSubmit = false;
        let isManagerCreatorSubmit = false;

        if (creatorId === currentUserId && userRole === 'manager') {
            formData.append('status_1_by', String(currentUserId));

            isManagerCreatorSubmit = true;
        } else if (creatorId === currentUserId && userRole === 'direktur') {
            formData.append('status_1_by', String(currentUserId));
            formData.append('status_2_by', String(currentUserId));

            isDirekturCreatorSubmit = true;
        } else if (userRole === 'manager' && !isManagerCreatorSubmit) {
            formData.append('status_1_by', String(currentUserId));
        } else if (userRole === 'direktur' && !isDirekturCreatorSubmit) {
            formData.append('status_2_by', String(currentUserId));
        } else if (userRole === 'auditor') {
            formData.append('status_4_by', String(currentUserId));
        }

        if (userRole === 'lawyer' && decision) {
            formData.append('status_3', decision);
        }

        router.post('/submit-customer-status', formData, {
            preserveScroll: true,
            preserveState: true,
            forceFormData: true,
            onSuccess: () => {
                alert('✅ Data berhasil disubmit!');
                setAttachFile(null);
                setAttachFileStatuses([]);
                setIsLoading(false);
                router.visit(`/customer/${customer.id}`, { replace: true, preserveState: false });
            },
            onError: (errors) => {
                const firstError = errors[Object.keys(errors)[0]];
                alert(`❌ Gagal submit: ${firstError}`);
                setIsLoading(false);
            },
        });
    };

    return (
        <div className="rounded-2xl border-0 p-4">
            <h1 className="mb-4 text-3xl font-semibold">View Customer</h1>

            <div className="space-y-6">
                {/* 🔹 Informasi Usaha */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <Label htmlFor="kategori_usaha">Kategori Usaha</Label>
                        <Input
                            id="kategori_usaha"
                            value={customer.kategori_usaha}
                            disabled
                            className="w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="bentuk_badan_usaha">Nama Perusahaan</Label>
                        <Input
                            id="bentuk_badan_usaha"
                            value={customer.nama_perusahaan}
                            disabled
                            className="w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="bentuk_badan_usaha">Bentuk Badan Usaha</Label>
                        <Input
                            id="bentuk_badan_usaha"
                            value={customer.bentuk_badan_usaha}
                            disabled
                            className="w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* 🔹 Alamat Lengkap */}
                    <div>
                        <Label htmlFor="alamat_lengkap">Alamat Lengkap</Label>
                        <Textarea
                            id="alamat_lengkap"
                            value={customer.alamat_lengkap}
                            disabled
                            className="h-20 w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="kota">Kota</Label>
                        <Input
                            id="kota"
                            value={customer.kota}
                            disabled
                            className="w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="no_telp">No. Telp</Label>
                        <Input
                            id="no_telp"
                            value={customer.no_telp || '-'}
                            disabled
                            className="w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                </div>

                {/* 🔹 Kontak Perusahaan */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <Label htmlFor="no_fax">No. Fax</Label>
                        <Input
                            id="no_fax"
                            value={customer.no_fax || '-'}
                            disabled
                            className="w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="alamat_penagihan">Alamat Penagihan</Label>
                        <Textarea
                            id="alamat_penagihan"
                            value={customer.alamat_penagihan}
                            disabled
                            className="h-20 w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            value={customer.email}
                            disabled
                            className="w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                </div>

                {/* 🔹 Info Tambahan */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <Label htmlFor="website">Website</Label>
                        <Input
                            id="website"
                            value={customer.website || '-'}
                            disabled
                            className="w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="top">Terms Of Payment</Label>
                        <Input
                            id="top"
                            value={customer.top || '-'}
                            disabled
                            className="w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="status_perpajakan">Status Perpajakan</Label>
                        <Input
                            id="status_perpajakan"
                            value={customer.status_perpajakan || '-'}
                            disabled
                            className="w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                </div>

                {/* 🔹 NPWP */}
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <Label htmlFor="no_npwp">Nomor NPWP</Label>
                        <Input
                            id="no_npwp"
                            value={customer.no_npwp || '-'}
                            disabled
                            className="w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="no_npwp_16">NPWP 16 Digit</Label>
                        <Input
                            id="no_npwp_16"
                            value={customer.no_npwp_16 || '-'}
                            disabled
                            className="w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                </div>

                {/* 🔹 Penanggung Jawab */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <Label htmlFor="nama_pj">Nama Penanggung Jawab</Label>
                        <Input
                            id="nama_pj"
                            value={customer.nama_pj || '-'}
                            disabled
                            className="w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="no_ktp_pj">No. KTP PJ</Label>
                        <Input
                            id="no_ktp_pj"
                            value={customer.no_ktp_pj || '-'}
                            disabled
                            className="w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="no_telp_pj">No. Telp PJ</Label>
                        <Input
                            id="no_telp_pj"
                            value={customer.no_telp_pj || '-'}
                            disabled
                            className="w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                </div>

                {/* 🔹 Personal Contact */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <Label htmlFor="nama_personal">Nama Personal</Label>
                        <Input
                            id="nama_personal"
                            value={customer.nama_personal || '-'}
                            disabled
                            className="w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="jabatan_personal">Jabatan Personal</Label>
                        <Input
                            id="jabatan_personal"
                            value={customer.jabatan_personal || '-'}
                            disabled
                            className="w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="no_telp_personal">No. Telp Personal</Label>
                        <Input
                            id="no_telp_personal"
                            value={customer.no_telp_personal || '-'}
                            disabled
                            className="w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                </div>

                {/* 🔹 Email Personal */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <Label htmlFor="email_personal">Email Personal</Label>
                        <Input
                            id="email_personal"
                            value={customer.email_personal || '-'}
                            disabled
                            className="w-full border border-gray-300 dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {attachments?.length > 0 && (
                <div className="mt-6">
                    <h2 className="mb-2 text-xl font-bold">Lampiran Dokumen</h2>
                    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-4 md:grid-cols-${Math.min(attachments.length, 4)}`}>
                        {attachments.map((file) => {
                            const label = file.type.toUpperCase() === 'SPPKP' ? 'SPTKP' : file.type.toUpperCase();

                            return (
                                <div key={file.id} className="w-full rounded-md border border-gray-500 p-2 dark:border-neutral-700 dark:text-white">
                                    <div className="mb-1 font-medium capitalize">{label}</div>

                                    {/* LINK UNTUK MEMBUKA PDF */}
                                    <a
                                        href={file.path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-400 underline transition-colors hover:text-blue-600"
                                    >
                                        Lihat Dokumen
                                    </a>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {showUserSubmit && (
                <>
                    {userRole === 'user' && (
                        <div className="mt-6 w-full md:w-1/3">
                            <ResettableDropzone label="Upload Lampiran Penawaran Marketing (PDF)" onFileChange={setAttachFileUser} />
                        </div>
                    )}
                </>
            )}

            {userRole === 'auditor' && auditorStartReview && statusData?.submit_1_timestamps !== null && (
                <div className="mt-6">
                    <h2 className="text-xl font-bold">Masukkan Data Review</h2>
                    <div className="mt-4 flex flex-col gap-4 md:flex-row">
                        <div className="w-full md:w-1/2">
                            <Label className="mb-1 block">Masukkan Keterangan</Label>
                            <textarea
                                className="h-[200px] w-full rounded-sm border border-gray-500 p-2"
                                placeholder="Masukkan keterangan"
                                value={keterangan}
                                onChange={(e) => setKeterangan(e.target.value)}
                            />
                        </div>

                        <div className="w-full md:w-1/2">
                            <ResettableDropzone label="Upload Lampiran" onFileChange={setAttachFile} />
                            <p className="mt-1 text-xs text-red-500">* Wajib unggah file PDF maksimal 5MB</p>
                        </div>
                    </div>
                </div>
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
                                    className="h-[200px] w-full rounded-sm border border-gray-500 p-2"
                                    placeholder="Masukkan keterangan"
                                    value={keterangan}
                                    onChange={(e) => setKeterangan(e.target.value)}
                                />
                            </div>

                            {/* Dropzone */}
                            <div className="w-full md:w-1/2">
                                <ResettableDropzone label="Upload Lampiran" onFileChange={setAttachFile} />
                                <p className="mt-1 text-xs text-red-500">* Wajib unggah file PDF maksimal 5MB</p>
                            </div>
                        </div>
                    </div>
                )}

            <div className="mt-6 mb-6 flex flex-wrap gap-2 space-x-3">
                {(showUserSubmit || showAnotherUserSubmit) && (
                    <Button variant="default" className="" onClick={() => handleSubmit()} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Mengirim...
                            </>
                        ) : (
                            'Submit'
                        )}
                    </Button>
                )}

                {showManagerApprove && (
                    <Button variant="default" className="" onClick={() => handleSubmit()} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            'Approved'
                        )}
                    </Button>
                )}

                {userRole === 'auditor' && auditorStartReview && (
                    <Button variant="default" onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            'Approved'
                        )}
                    </Button>
                )}

                {(showDirekturApprove || showSubmitForDirektur) && (
                    <Button variant="default" className="" onClick={() => handleSubmit()} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            'Approved'
                        )}
                    </Button>
                )}

                {showLawyerApprove && (
                    <>
                        <Button variant="default" className="" onClick={() => handleSubmit('approved')} disabled={isLoading}>
                            {isLoading && decision === 'approved' ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                'Aman'
                            )}
                        </Button>

                        <Button variant="destructive" onClick={() => handleSubmit('rejected')} className="text-white" disabled={isLoading}>
                            {isLoading && decision === 'rejected' ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Mengirim...
                                </>
                            ) : (
                                'Bermasalah'
                            )}
                        </Button>
                    </>
                )}

                {canEdit && (
                    <Link href={`/customer/${customer.id}/edit`}>
                        <Button variant="outline" className="border border-gray-600" disabled={isLoading}>
                            Edit Customer
                        </Button>
                    </Link>
                )}

                {userRole === 'auditor' && statusData?.status_4_timestamps == null && statusData?.submit_1_timestamps !== null && (
                    <Button variant="default" onClick={() => setAuditorStartReview((prev) => !prev)} className="mb-4">
                        {auditorStartReview ? 'Tutup Catatan' : 'Buat Catatan'}
                    </Button>
                )}

                <Link href="/customer">
                    <Button variant="outline" className="border border-gray-600" disabled={isLoading}>
                        Kembali
                    </Button>
                </Link>
            </div>

            <div className={`grid grid-cols-1 gap-4 pb-8 md:grid-cols-2 ${managerChecked && !managerExists ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
                {/* Disubmit */}
                <div>
                    <div className="rounded-t-sm border-t border-r border-b border-l border-gray-500 p-2 dark:bg-neutral-200 dark:text-black">
                        <Label htmlFor="kategori_usaha">Disubmit</Label>
                    </div>

                    <div className="border-r border-l border-gray-500 p-2 dark:bg-neutral-200 dark:text-black">
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
                                        {new Date(statusData.submit_1_timestamps)
                                            .toLocaleTimeString('id-ID', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: false,
                                            })
                                            .replace('.', ':')}{' '}
                                        WIB
                                    </strong>
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="rounded-b-sm border-r border-b border-l border-gray-500 p-2 dark:bg-neutral-200 dark:text-black">
                        {userRole !== 'lawyer' && statusData?.submit_1_nama_file && (
                            <div className="">
                                <h4 className="text-muted-foreground text-sm font-bold dark:text-black">Attachment</h4>
                                <a
                                    href={`/file/view/${statusData.submit_1_path}`}
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
                        <div className="rounded-t-sm border-t border-r border-b border-l border-gray-500 p-2 dark:bg-neutral-200 dark:text-black">
                            <Label htmlFor="bentuk_badan_usaha">Diverifikasi</Label>
                        </div>
                        <div className="border-r border-l border-gray-500 p-2 dark:bg-neutral-200 dark:text-black">
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
                                            {new Date(statusData.status_1_timestamps)
                                                .toLocaleTimeString('id-ID', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false,
                                                })
                                                .replace('.', ':')}{' '}
                                            WIB
                                        </strong>
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="rounded-b-sm border-r border-b border-l border-gray-500 p-2 dark:bg-neutral-200 dark:text-black">
                            {statusData?.status_1_timestamps && (
                                <>
                                    {userRole !== 'lawyer' && statusData.status_1_keterangan && (
                                        <div className="text-muted-foreground mt-1 text-sm dark:text-black">
                                            <p>
                                                <strong>Keterangan</strong>
                                            </p>
                                            <p>{statusData.status_1_keterangan}</p>
                                        </div>
                                    )}
                                    {userRole !== 'lawyer' && statusData.status_1_nama_file && (
                                        <div className="border-gray-500 pt-2">
                                            <h4 className="text-muted-foreground text-sm font-bold dark:text-black">Attachment</h4>
                                            <a
                                                href={`/file/view/${statusData.status_1_path}`}
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
                    <div className="rounded-t-sm border-t border-r border-b border-l border-gray-500 p-2 dark:bg-neutral-200 dark:text-black">
                        <Label htmlFor="kota">Mengetahui</Label>
                    </div>
                    <div className="border-r border-l border-gray-500 p-2 dark:bg-neutral-200">
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
                                        {new Date(statusData.status_2_timestamps)
                                            .toLocaleTimeString('id-ID', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: false,
                                            })
                                            .replace('.', ':')}{' '}
                                        WIB
                                    </strong>
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="rounded-b-sm border-r border-b border-l border-gray-500 p-2 dark:bg-neutral-200 dark:text-black">
                        {statusData?.status_2_timestamps && (
                            <>
                                {userRole !== 'lawyer' && statusData.status_2_keterangan && (
                                    <div className="text-muted-foreground mt-1 text-sm dark:text-black">
                                        <p>
                                            <strong>Keterangan</strong>
                                        </p>
                                        <p>{statusData.status_2_keterangan}</p>
                                    </div>
                                )}
                                {userRole !== 'lawyer' && statusData.status_2_nama_file && (
                                    <div className="border-gray-500 pt-2">
                                        <h4 className="text-muted-foreground text-sm font-bold dark:text-black">Attachment</h4>
                                        <a
                                            href={`/file/view/${statusData.status_2_path}`}
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
                    <div className="rounded-t-sm border-t border-r border-b border-l border-gray-500 p-2 dark:bg-neutral-200 dark:text-black">
                        <Label htmlFor="kota">Direview</Label>{' '}
                    </div>
                    <div className="border-r border-l border-gray-500 p-2 dark:bg-neutral-200">
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
                                        {new Date(statusData.status_3_timestamps).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}
                                    </strong>{' '}
                                    pukul{' '}
                                    <strong>
                                        {new Date(statusData.status_3_timestamps)
                                            .toLocaleTimeString('id-ID', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: false,
                                            })
                                            .replace('.', ':')}{' '}
                                        WIB
                                    </strong>
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="rounded-b-sm border-r border-b border-l border-gray-500 p-2 dark:bg-neutral-200 dark:text-black">
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
                                {statusData.submit_3_nama_file && (
                                    <div className="mt-2">
                                        <h4 className="text-muted-foreground text-sm font-bold dark:text-black">Attachment Lawyer</h4>
                                        <a
                                            href={`/file/view/${statusData.submit_3_path}`}
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
            <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${managerChecked && !managerExists ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
                {/* Diaudit */}
                <div className="col-span-1">
                    <div className="rounded-t-sm border-t border-r border-b border-l border-gray-500 p-2 dark:bg-neutral-200 dark:text-black">
                        <Label htmlFor="kota">Diaudit</Label>{' '}
                    </div>
                    <div className="border-r border-l border-gray-500 p-2 dark:bg-neutral-200">
                        {statusData?.status_4_timestamps && (
                            <div className="text-muted-foreground mt-1 text-sm dark:text-black">
                                <div className="mb-2 flex items-center justify-between font-semibold">
                                    <span>
                                        <strong>{statusData.status_4_by_name}</strong>
                                    </span>
                                </div>

                                <p>
                                    tanggal{' '}
                                    <strong>
                                        {new Date(statusData.status_4_timestamps).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}
                                    </strong>{' '}
                                    pukul{' '}
                                    <strong>
                                        {new Date(statusData.status_4_timestamps)
                                            .toLocaleTimeString('id-ID', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: false,
                                            })
                                            .replace('.', ':')}{' '}
                                        WIB
                                    </strong>
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="rounded-b-sm border-r border-b border-l border-gray-500 p-2 dark:bg-neutral-200 dark:text-black">
                        {statusData?.status_4_timestamps && (
                            <>
                                {statusData.status_4_keterangan && (
                                    <div className="text-muted-foreground text-sm dark:text-black">
                                        <p>
                                            <strong>Keterangan</strong>
                                        </p>
                                        <p>{statusData.status_4_keterangan}</p>
                                    </div>
                                )}
                                {statusData.status_4_nama_file && (
                                    <div className="mt-2">
                                        <h4 className="text-muted-foreground text-sm font-bold dark:text-black">Attachment Lawyer</h4>
                                        <a
                                            href={`/file/view/${statusData.status_4_path}`}
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
