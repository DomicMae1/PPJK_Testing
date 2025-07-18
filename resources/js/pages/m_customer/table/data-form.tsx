import { Dropzone, DropZoneArea, DropzoneFileListItem, DropzoneRemoveFile, DropzoneTrigger, useDropzone } from '@/components/dropzone';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Attachment, Auth, MasterCustomer } from '@/types';
import { router, useForm } from '@inertiajs/react';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { CloudUploadIcon, File, Trash2Icon } from 'lucide-react';
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
// import { AlertCircle } from "lucide-react"
import axios from 'axios';
import { FormEventHandler, useEffect, useState } from 'react';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { NumericFormat } from 'react-number-format';

export default function CustomerForm({
    auth,
    customer,
    onSuccess,
}: {
    auth: Auth;
    customer?: MasterCustomer;
    attachment?: Attachment;
    onSuccess?: () => void;
}) {
    const { data, setData, processing, errors } = useForm<MasterCustomer>({
        id: customer?.id || null,
        kategori_usaha: customer?.kategori_usaha || '',
        nama_perusahaan: customer?.nama_perusahaan || '',
        bentuk_badan_usaha: customer?.bentuk_badan_usaha || '',
        alamat_lengkap: customer?.alamat_lengkap || '',
        kota: customer?.kota || '',
        no_telp: customer?.no_telp || '',
        no_fax: customer?.no_fax ?? null,
        alamat_penagihan: customer?.alamat_penagihan || '',
        email: customer?.email || '',
        website: customer?.website || '',
        top: customer?.top || '',
        status_perpajakan: customer?.status_perpajakan || '',
        no_npwp: customer?.no_npwp || '',
        no_npwp_16: customer?.no_npwp_16 || '',
        nama_pj: customer?.nama_pj || '',
        no_ktp_pj: customer?.no_ktp_pj || '',
        no_telp_pj: customer?.no_telp_pj || '',
        nama_personal: customer?.nama_personal || '',
        jabatan_personal: customer?.jabatan_personal || '',
        no_telp_personal: customer?.no_telp_personal || '',
        email_personal: customer?.email_personal || '',
        keterangan_reject: customer?.keterangan_reject || '',
        user_id: customer?.user_id || auth.user.id,
        approved_1_by: customer?.approved_1_by ?? null,
        approved_2_by: customer?.approved_2_by ?? null,
        rejected_1_by: customer?.rejected_1_by ?? null,
        rejected_2_by: customer?.rejected_2_by ?? null,
        keterangan: customer?.keterangan || '',
        tgl_approval_1: customer?.tgl_approval_1 || null,
        tgl_approval_2: customer?.tgl_approval_2 || null,
        tgl_customer: customer?.tgl_customer || null,
        attachments: customer?.attachments || [],
    });

    const [lainKategori, setLainKategori] = useState(customer?.kategori_usaha === 'lain2' ? '' : '');

    const [errors_kategori, setErrors] = useState<{
        kategori_usaha?: string;
        lain_kategori?: string;
        bentuk_badan_usaha?: string;
        status_perpajakan?: string;
        attachments?: string;
    }>({});

    const [npwpFile, setNpwpFile] = useState<File | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [npwpFileStatuses, setNpwpFileStatuses] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [nibFileStatuses, setNibFileStatuses] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [sppkpFileStatuses, setSppkpFileStatuses] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [ktpFileStatuses, setKtpFileStatuses] = useState<any[]>([]);
    const [nibFile, setNibFile] = useState<File | null>(null);
    const [sppkpFile, setSppkpFile] = useState<File | null>(null);
    const [ktpFile, setKtpFile] = useState<File | null>(null);
    // const [isModalOpen, setIsModalOpen] = useState(false);

    function formatNpwp16(input: string): string {
        const raw = input.replace(/\D/g, ''); // Hanya angka
        const parts = [raw.slice(0, 4), raw.slice(4, 8), raw.slice(8, 12), raw.slice(12, 16)].filter(Boolean);
        return parts.join(' ');
    }

    function formatNpwp(input: string) {
        const raw = input.replace(/\D/g, ''); // Hanya angka
        const parts = [raw.slice(0, 2), raw.slice(2, 5), raw.slice(5, 8), raw.slice(8, 9), raw.slice(9, 12), raw.slice(12, 15)].filter(Boolean);
        return parts
            .map((part, i) => {
                if (i === 3) return '-' + part;
                if (i !== 0) return '.' + part;
                return part;
            })
            .join('');
    }

    useEffect(() => {
        const existingNpwp = customer?.attachments?.find((a) => a.type === 'npwp');
        const existingNib = customer?.attachments?.find((a) => a.type === 'nib');
        const existingSppkp = customer?.attachments?.find((a) => a.type === 'sppkp');
        const existingKtp = customer?.attachments?.find((a) => a.type === 'ktp');

        if (existingNpwp) {
            setNpwpFileStatuses([
                {
                    id: 'existing-npwp',
                    status: 'success',
                    fileName: existingNpwp.nama_file,
                    result: existingNpwp.path,
                },
            ]);
        }
        if (existingNib) {
            setNibFileStatuses([
                {
                    id: 'existing-nib',
                    status: 'success',
                    fileName: existingNib.nama_file,
                    result: existingNib.path,
                },
            ]);
        }
        if (existingSppkp) {
            setSppkpFileStatuses([
                {
                    id: 'existing-sppkp',
                    status: 'success',
                    fileName: existingSppkp.nama_file,
                    result: existingSppkp.path,
                },
            ]);
        }
        if (existingKtp) {
            setKtpFileStatuses([
                {
                    id: 'existing-ktp',
                    status: 'success',
                    fileName: existingKtp.nama_file,
                    result: existingKtp.path,
                },
            ]);
        }
    }, [customer]);

    // State untuk masing-masing dropzone
    const dropzoneNpwp = useDropzone({
        onDropFile: async (file: File) => {
            setNpwpFile(file);

            const fileStatus = {
                id: String(Date.now()),
                status: 'success',
                fileName: file.name,
                result: URL.createObjectURL(file),
            } as const;

            setNpwpFileStatuses([fileStatus]); // Timpa data lama dengan file baru
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

    const dropzoneNib = useDropzone({
        onDropFile: async (file: File) => {
            setNibFile(file); // ❗️Simpan ke state, belum upload
            const fileStatus = {
                id: String(Date.now()),
                status: 'success',
                fileName: file.name,
                result: URL.createObjectURL(file),
            } as const;

            setNibFileStatuses([fileStatus]); // Timpa data lama dengan file baru
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

    const dropzoneSppkp = useDropzone({
        onDropFile: async (file: File) => {
            setSppkpFile(file); // ❗️Simpan ke state, belum upload

            const fileStatus = {
                id: String(Date.now()),
                status: 'success',
                fileName: file.name,
                result: URL.createObjectURL(file),
            } as const;

            setSppkpFileStatuses([fileStatus]); // Timpa data lama dengan file baru
            return fileStatus;
        },
        validation: {
            accept: {
                'application/pdf': ['.pdf'], // ✅ hanya PDF
            },
            maxSize: 5 * 1024 * 1024, // ✅ max 5MB
            maxFiles: 1,
        },
    });

    const dropzoneKtp = useDropzone({
        onDropFile: async (file: File) => {
            setKtpFile(file); // ❗️Simpan ke state, belum upload
            const fileStatus = {
                id: String(Date.now()),
                status: 'success',
                fileName: file.name,
                result: URL.createObjectURL(file),
            } as const;

            setKtpFileStatuses([fileStatus]); // Timpa data lama dengan file baru
            return fileStatus;
        },
        validation: {
            accept: {
                'application/pdf': ['.pdf'], // ✅ hanya PDF
            },
            maxSize: 5 * 1024 * 1024, // ✅ max 5MB
            maxFiles: 1,
        },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extractAttachmentFromStatus = (statuses: any[], type: string) => {
        if (statuses.length > 0) {
            const file = statuses[0]; // maxFiles: 1
            return {
                id: 0,
                customer_id: customer?.id ?? 0,
                nama_file: file.fileName,
                path: file.result,
                type,
            };
        }
        return null;
    };

    const handleSubmit: FormEventHandler = async (e) => {
        e.preventDefault();

        const newErrors: typeof errors_kategori = {};

        if (!data.kategori_usaha) {
            newErrors.kategori_usaha = 'Kategori usaha wajib dipilih.';
        }

        if (!data.bentuk_badan_usaha) {
            newErrors.bentuk_badan_usaha = 'Bentuk badan usaha wajib dipilih';
        }

        if (!data.status_perpajakan) {
            newErrors.status_perpajakan = 'Status perpajakan wajib dipilih';
        }

        if (data.kategori_usaha === 'lain2' && !lainKategori.trim()) {
            newErrors.lain_kategori = 'Kategori lainnya wajib diisi.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return; // ⛔ STOP proses di sini!
        }

        // 🔒 Cek wajib upload file PDF
        if (!npwpFileStatuses || npwpFileStatuses.length === 0) {
            const message = 'Dokumen NPWP wajib diunggah.';
            setErrors((prev) => ({ ...prev, attachments: message }));
            alert(message); // ⬅️ alert ditambahkan
            return;
        }
        if (!nibFileStatuses || nibFileStatuses.length === 0) {
            const message = 'Dokumen NIB wajib diunggah.';
            setErrors((prev) => ({ ...prev, attachments: message }));
            alert(message);
            return;
        }
        if (!ktpFileStatuses || ktpFileStatuses.length === 0) {
            const message = 'Dokumen KTP wajib diunggah.';
            setErrors((prev) => ({ ...prev, attachments: message }));
            alert(message);
            return;
        }

        setErrors(newErrors);

        try {
            const uploadedAttachments = [];

            // ✅ Upload NPWP
            if (!npwpFileStatuses) {
                if (npwpFile) {
                    const formDataNpwp = new FormData();
                    formDataNpwp.append('file', npwpFile);
                    const resNpwp = await axios.post('/customer/upload-temp', formDataNpwp);
                    uploadedAttachments.push({
                        id: 0,
                        customer_id: customer?.id ?? 0,
                        nama_file: resNpwp.data.nama_file,
                        path: resNpwp.data.path,
                        type: 'npwp',
                    });
                }
            }

            // ✅ Upload NIB
            if (!nibFileStatuses) {
                if (nibFile) {
                    const formDataNib = new FormData();
                    formDataNib.append('file', nibFile);
                    const resNib = await axios.post('/customer/upload-temp', formDataNib);
                    uploadedAttachments.push({
                        id: 0,
                        customer_id: customer?.id ?? 0,
                        nama_file: resNib.data.nama_file,
                        path: resNib.data.path,
                        type: 'nib',
                    });
                }
            }

            // ✅ Upload SPPKP (opsional)
            if (!sppkpFileStatuses) {
                if (sppkpFile) {
                    const formDataSppkp = new FormData();
                    formDataSppkp.append('file', sppkpFile);
                    const resSppkp = await axios.post('/customer/upload-temp', formDataSppkp);
                    uploadedAttachments.push({
                        id: 0,
                        customer_id: customer?.id ?? 0,
                        nama_file: resSppkp.data.nama_file,
                        path: resSppkp.data.path,
                        type: 'sppkp',
                    });
                }
            }

            // ✅ Upload KTP
            if (!ktpFileStatuses) {
                if (ktpFile) {
                    const formDataKtp = new FormData();
                    formDataKtp.append('file', ktpFile);
                    const resKtp = await axios.post('/customer/upload-temp', formDataKtp);
                    uploadedAttachments.push({
                        id: 0,
                        customer_id: customer?.id ?? 0,
                        nama_file: resKtp.data.nama_file,
                        path: resKtp.data.path,
                        type: 'ktp',
                    });
                }
            }

            // ✅ Merge existing + uploaded
            const allAttachmentObjects = [
                extractAttachmentFromStatus(npwpFileStatuses, 'npwp'),
                extractAttachmentFromStatus(nibFileStatuses, 'nib'),
                extractAttachmentFromStatus(sppkpFileStatuses, 'sppkp'),
                extractAttachmentFromStatus(ktpFileStatuses, 'ktp'),
            ].filter(Boolean); // remove null

            const updatedAttachments = allAttachmentObjects;

            const finalPayload = {
                ...data,
                attachments: updatedAttachments,
            };
            if (customer?.id) {
                // 🔁 UPDATE
                router.put(route('customer.update', customer.id), finalPayload, {
                    onSuccess: () => {
                        console.log('✅ Berhasil update data!');
                        onSuccess?.();
                    },
                    onError: (errors: unknown) => {
                        console.log('Update error:', errors);
                    },
                });
            } else {
                // 🆕 CREATE
                router.post(route('customer.store'), finalPayload, {
                    onSuccess: () => {
                        console.log('✅ Berhasil simpan data!');
                        onSuccess?.();
                    },
                    onError: (errors: unknown) => {
                        console.log('Create error:', errors);
                    },
                });
            }
        } catch (err) {
            console.error('Upload gagal:', err);
            alert('Gagal upload file. Silakan coba lagi.');
        }
    };

    return (
        <div className="rounded-2xl border p-4">
            <h1 className="mb-4 text-3xl font-semibold">{customer ? 'Edit Data Customer' : 'Buat Data Customer'}</h1>
            <form onSubmit={handleSubmit}>
                <div className="col-span-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="col-span-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Kategori Usaha */}
                        <div className="w-full">
                            <Label htmlFor="kategori_usaha">
                                Kategori Usaha <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                required
                                value={data.kategori_usaha}
                                onValueChange={(value) => {
                                    setData('kategori_usaha', value);
                                    setErrors((prev) => ({
                                        ...prev,
                                        kategori_usaha: undefined,
                                        lain_kategori: value !== 'lain2' ? undefined : prev.lain_kategori,
                                    }));
                                    if (value !== 'lain2') {
                                        setLainKategori('');
                                    }
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Pilih Kategori Usaha" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="kontraktor">Kontraktor</SelectItem>
                                    <SelectItem value="toko">Toko</SelectItem>
                                    <SelectItem value="industri">Industri</SelectItem>
                                    <SelectItem value="dealer">Dealer</SelectItem>
                                    <SelectItem value="lain2">Lain-Lain</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors_kategori.kategori_usaha && <InputError message={errors_kategori.kategori_usaha} />}

                            {/* Input tambahan muncul hanya jika pilih "lain-lain" */}
                            {data.kategori_usaha === 'lain2' && (
                                <div className="mt-2">
                                    <Label htmlFor="lain_kategori">Kategori Usaha Lainnya</Label>
                                    <input
                                        type="text"
                                        id="lain_kategori"
                                        required
                                        value={lainKategori}
                                        onChange={(e) => {
                                            setLainKategori(e.target.value);
                                            setErrors((prev) => ({ ...prev, lain_kategori: undefined }));
                                        }}
                                        className="focus:border-primary mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:ring"
                                        placeholder="Isi kategori usaha lainnya"
                                    />
                                    {errors_kategori.kategori_usaha && <InputError message={errors_kategori.kategori_usaha} />}
                                </div>
                            )}
                        </div>
                        <div className="w-full">
                            <Label htmlFor="nama_perusahaan">
                                Nama Perusahaan <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                required
                                id="nama_perusahaan"
                                value={data.nama_perusahaan}
                                onChange={(e) => setData('nama_perusahaan', e.target.value)}
                                placeholder="Masukkan nama perusahaan"
                            />
                            <InputError message={errors.nama_perusahaan} />
                        </div>
                        <div className="w-full">
                            <Label htmlFor="bentuk_badan_usaha">
                                Bentuk Badan Usaha <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={data.bentuk_badan_usaha}
                                onValueChange={(value) => {
                                    setData('bentuk_badan_usaha', value); // kosongkan nilai utama, karena nanti user akan isi manual

                                    setErrors((prev) => ({
                                        ...prev,
                                        bentuk_badan_usaha: undefined,
                                    }));
                                }}
                                required
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Pilih Bentuk Badan Usaha" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pma">Penanaman Modal Asing (PMA)</SelectItem>
                                    <SelectItem value="pmdn">Penanaman Modal Dalam Negeri (PMDN)</SelectItem>
                                    <SelectItem value="pt">Perseroan Terbatas (PT)</SelectItem>
                                    <SelectItem value="cv">Commanditaire Vennootschap (CV)</SelectItem>
                                    <SelectItem value="ud">Usaha Dagang (UD)</SelectItem>
                                    <SelectItem value="po">Perusahaan Perorangan (PO)</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors_kategori && <InputError message={errors_kategori.bentuk_badan_usaha} />}
                        </div>
                        <div className="w-full">
                            <Label htmlFor="alamat_lengkap">
                                Alamat Lengkap <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                required
                                id="alamat_lengkap"
                                value={data.alamat_lengkap}
                                onChange={(e) => setData('alamat_lengkap', e.target.value)}
                                placeholder="Masukkan Alamat Lengkap"
                            />
                            <InputError message={errors.alamat_lengkap} />
                        </div>
                        <div className="w-full">
                            <Label htmlFor="kota">
                                Kota <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                required
                                id="kota"
                                value={data.kota}
                                onChange={(e) => setData('kota', e.target.value)}
                                placeholder="Masukkan Kota"
                            />
                            <InputError message={errors.kota} />
                        </div>
                        <div className="w-full">
                            <Label htmlFor="no_telp">
                                Nomor Telp Perusahaan <span className="text-red-500">*</span>
                            </Label>
                            <PhoneInput
                                required
                                defaultCountry="id"
                                value={data.no_telp?.toString() || ''}
                                onChange={(phone) => setData('no_telp', phone)}
                                inputClassName={cn(
                                    'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                                    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                                    'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                                )}
                                placeholder="Enter No. Perusahaan"
                            />
                            <InputError message={errors.no_telp} />
                        </div>

                        <div className="w-full">
                            <Label htmlFor="no_fax">Nomor Fax</Label>
                            <NumericFormat
                                id="no_fax"
                                value={data.no_fax}
                                onChange={(e) => setData('no_fax', e.target.value)}
                                className={cn(
                                    'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                                    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                                    'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                                )}
                                placeholder="Enter nomor fax (optional)"
                                allowNegative={false}
                                decimalScale={0}
                            />
                            <InputError message={errors.no_fax} />
                        </div>
                        <div className="w-full">
                            <Label htmlFor="alamat_penagihan">
                                Alamat Penagihan <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                required
                                id="alamat_penagihan"
                                value={data.alamat_penagihan}
                                onChange={(e) => setData('alamat_penagihan', e.target.value)}
                                placeholder="Masukkan Alamat Lengkap"
                            />
                            <InputError message={errors.alamat_penagihan} />
                        </div>
                        <div className="w-full">
                            <Label htmlFor="email">
                                Email <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                required
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="Masukkan email"
                            />
                            <InputError message={errors.email} />
                        </div>
                        <div className="w-full">
                            <Label htmlFor="website">Alamat Website</Label>
                            <Input
                                id="website"
                                value={data.website}
                                onChange={(e) => setData('website', e.target.value)}
                                placeholder="Masukkan website (optional)"
                            />
                            <InputError message={errors.website} />
                        </div>
                        <div className="w-full">
                            <Label htmlFor="top">
                                Terms of Payment <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                required
                                id="top"
                                value={data.top}
                                onChange={(e) => setData('top', e.target.value)}
                                placeholder="Masukkan Terms of Payment"
                            />
                            <InputError message={errors.top} />
                        </div>

                        <div className="w-full">
                            <Label htmlFor="status_perpajakan">
                                Status Perpajakan <span className="text-red-500">*</span>
                            </Label>
                            <Select required value={data.status_perpajakan} onValueChange={(value) => setData('status_perpajakan', value)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Pilih Status Perpajakan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pkp">PKP</SelectItem>
                                    <SelectItem value="non-pkp">NON PKP</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors_kategori && <InputError message={errors_kategori.status_perpajakan} />}
                        </div>
                        <div className="w-full">
                            <Label htmlFor="no_npwp">
                                Nomor NPWP <span className="text-red-500">*</span>
                            </Label>
                            <input
                                required
                                type="text"
                                id="no_npwp"
                                value={data.no_npwp}
                                onChange={(e) => setData('no_npwp', formatNpwp(e.target.value))}
                                placeholder="Masukkan nomor NPWP"
                                className={cn(
                                    'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                                    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                                    'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                                )}
                            />

                            <InputError message={errors.no_npwp} />
                        </div>

                        <div className="w-full">
                            <Label htmlFor="no_npwp_16">
                                Nomor NPWP (16 Digit) <span className="text-red-500">*</span>
                            </Label>
                            <input
                                required
                                type="text"
                                inputMode="numeric"
                                maxLength={19} // karena spasi: 4 + 1 + 4 + 1 + 4 + 1 + 4 = 19 total karakter
                                id="no_npwp_16"
                                value={data.no_npwp_16}
                                onChange={(e) => setData('no_npwp_16', formatNpwp16(e.target.value))}
                                placeholder="Masukkan nomor NPWP 16 digit"
                                className={cn(
                                    'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                                    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                                    'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                                )}
                            />
                            <InputError message={errors.no_npwp_16} />
                        </div>
                    </div>
                    <div className="col-span-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <h1 className="mb-2 text-xl font-semibold">Data Direktur</h1>
                        <div className="col-span-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {/* Data Direktur */}
                            <div className="w-full">
                                <Label htmlFor="nama_pj">
                                    Nama <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    required
                                    id="nama_pj"
                                    value={data.nama_pj}
                                    onChange={(e) => setData('nama_pj', e.target.value)}
                                    placeholder="Masukkan Nama"
                                />
                                <InputError message={errors.nama_pj} />
                            </div>
                            <div className="w-full">
                                <Label htmlFor="no_ktp_pj">
                                    Nik Direktur <span className="text-red-500">*</span>
                                </Label>
                                <NumericFormat
                                    required
                                    id="no_ktp_pj"
                                    value={data.no_ktp_pj}
                                    onChange={(e) => setData('no_ktp_pj', e.target.value)}
                                    className={cn(
                                        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                                        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                                        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                                    )}
                                    placeholder="Enter Nik Direktur"
                                    allowNegative={false}
                                    decimalScale={0}
                                />
                                <InputError message={errors.no_ktp_pj} />
                            </div>
                            <div className="w-full">
                                <Label htmlFor="no_telp_pj">
                                    No. Telp. Direktur <span className="text-red-500">*</span>
                                </Label>
                                <PhoneInput
                                    required
                                    defaultCountry="id"
                                    value={data.no_telp_pj?.toString() || ''}
                                    onChange={(phone) => setData('no_telp_pj', phone)}
                                    inputClassName={cn(
                                        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                                        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                                        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                                    )}
                                    placeholder="Enter No. Telp. Direktur"
                                />
                                <InputError message={errors.no_telp_pj} />
                            </div>
                        </div>
                    </div>
                    <div className="col-span-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <h1 className="mb-2 text-xl font-semibold">Data Personal</h1>
                        <div className="col-span-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {/* Data Direktur */}
                            <div className="w-full">
                                <Label htmlFor="nama_personal">
                                    Nama <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    required
                                    id="nama_personal"
                                    value={data.nama_personal}
                                    onChange={(e) => setData('nama_personal', e.target.value)}
                                    placeholder="Masukkan nama personal"
                                />
                                <InputError message={errors.nama_personal} />
                            </div>
                            <div className="w-full">
                                <Label htmlFor="jabatan_personal">
                                    Jabatan <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    required
                                    id="jabatan_personal"
                                    value={data.jabatan_personal}
                                    onChange={(e) => setData('jabatan_personal', e.target.value)}
                                    placeholder="Masukkan jabatan personal"
                                />
                                <InputError message={errors.jabatan_personal} />
                            </div>
                            <div className="w-full">
                                <Label htmlFor="no_telp_personal">
                                    No. Telp. <span className="text-red-500">*</span>
                                </Label>
                                <PhoneInput
                                    required
                                    defaultCountry="id"
                                    value={data.no_telp_personal?.toString() || ''}
                                    onChange={(phone) => setData('no_telp_personal', phone)}
                                    inputClassName={cn(
                                        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                                        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                                        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                                    )}
                                    placeholder="Masukkan no. telp personal"
                                />
                                <InputError message={errors.no_telp_personal} />
                            </div>
                            <div className="w-full">
                                <Label htmlFor="email_personal">
                                    Email <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    required
                                    id="email_personal"
                                    value={data.email_personal}
                                    onChange={(e) => setData('email_personal', e.target.value)}
                                    placeholder="Masukkan email personal"
                                />
                                <InputError message={errors.email_personal} />
                            </div>
                        </div>
                    </div>
                    <div className="col-span-3 mt-4">
                        <h1 className="mb-2 text-xl font-semibold">Lampiran</h1>

                        {/* 3 Dropzone Kolom */}
                        <div className="col-span-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {/* NPWP */}
                            <div className="w-full">
                                <Label htmlFor="file_npwp" className="mb-1 block">
                                    Upload NPWP <span className="text-red-500">*</span>
                                </Label>
                                <Dropzone {...dropzoneNpwp}>
                                    <DropZoneArea>
                                        {npwpFileStatuses.length > 0 ? (
                                            npwpFileStatuses.map((file) => (
                                                <DropzoneFileListItem
                                                    key={file.id}
                                                    file={file}
                                                    className="bg-secondary relative w-full overflow-hidden rounded-md shadow-sm"
                                                >
                                                    {file.status === 'pending' && <div className="aspect-video animate-pulse bg-black/20" />}
                                                    {file.status === 'success' && (
                                                        <div
                                                            onClick={() => {
                                                                if (file.result) {
                                                                    window.open(file.result, '_blank');
                                                                }
                                                            }}
                                                            className="z-10 flex aspect-video w-full cursor-pointer items-center justify-center rounded-md bg-gray-100 text-sm text-gray-600"
                                                        >
                                                            <File className="mr-2 size-6" />
                                                            {file.fileName}
                                                        </div>
                                                    )}

                                                    <div className="absolute top-2 right-2 z-20">
                                                        <DropzoneRemoveFile>
                                                            <span onClick={() => setNpwpFileStatuses([])} className="rounded-full bg-white p-1">
                                                                <Trash2Icon className="size-4 text-black" />
                                                            </span>
                                                        </DropzoneRemoveFile>
                                                    </div>
                                                </DropzoneFileListItem>
                                            ))
                                        ) : (
                                            <DropzoneTrigger className="flex flex-col items-center gap-4 bg-transparent p-10 text-center text-sm">
                                                <CloudUploadIcon className="size-8" />
                                                <div>
                                                    <p className="font-semibold">Upload PDF</p>
                                                    <p className="text-muted-foreground text-sm">Click or drag to upload a .pdf file</p>
                                                </div>
                                            </DropzoneTrigger>
                                        )}
                                    </DropZoneArea>
                                </Dropzone>
                                <p className="mt-1 text-xs text-red-500">* Wajib unggah NPWP dalam format PDF</p>
                                <InputError message={errors.attachments} />
                            </div>

                            {/* NIB */}
                            <div className="w-full">
                                <Label htmlFor="file_npwp" className="mb-1 block">
                                    Upload NIB <span className="text-red-500">*</span>
                                </Label>
                                <Dropzone {...dropzoneNib}>
                                    <DropZoneArea>
                                        {nibFileStatuses.length > 0 ? (
                                            nibFileStatuses.map((file) => (
                                                <DropzoneFileListItem
                                                    key={file.id}
                                                    file={file}
                                                    className="bg-secondary relative w-full overflow-hidden rounded-md shadow-sm"
                                                >
                                                    {file.status === 'pending' && <div className="aspect-video animate-pulse bg-black/20" />}
                                                    {file.status === 'success' && (
                                                        <div
                                                            onClick={() => {
                                                                if (file.result) {
                                                                    window.open(file.result, '_blank');
                                                                }
                                                            }}
                                                            className="z-10 flex aspect-video w-full cursor-pointer items-center justify-center rounded-md bg-gray-100 text-sm text-gray-600"
                                                        >
                                                            <File className="mr-2 size-6" />
                                                            {file.fileName}
                                                        </div>
                                                    )}

                                                    <div className="absolute top-2 right-2 z-20">
                                                        <DropzoneRemoveFile>
                                                            <span onClick={() => setNibFileStatuses([])} className="rounded-full bg-white p-1">
                                                                <Trash2Icon className="size-4 text-black" />
                                                            </span>
                                                        </DropzoneRemoveFile>
                                                    </div>
                                                </DropzoneFileListItem>
                                            ))
                                        ) : (
                                            <DropzoneTrigger className="flex flex-col items-center gap-4 bg-transparent p-10 text-center text-sm">
                                                <CloudUploadIcon className="size-8" />
                                                <div>
                                                    <p className="font-semibold">Upload PDF</p>
                                                    <p className="text-muted-foreground text-sm">Click or drag to upload a .pdf file</p>
                                                </div>
                                            </DropzoneTrigger>
                                        )}
                                    </DropZoneArea>
                                </Dropzone>
                                <p className="mt-1 text-xs text-red-500">* Wajib unggah NIB dalam format PDF</p>
                                <InputError message={errors.attachments} />
                            </div>

                            {/* SPTKP */}
                            <div className="w-full">
                                <Label htmlFor="file_sppkp" className="mb-1 block">
                                    Upload SPTKP
                                </Label>
                                <Dropzone {...dropzoneSppkp}>
                                    <DropZoneArea>
                                        {sppkpFileStatuses.length > 0 ? (
                                            sppkpFileStatuses.map((file) => (
                                                <DropzoneFileListItem
                                                    key={file.id}
                                                    file={file}
                                                    className="bg-secondary relative w-full overflow-hidden rounded-md shadow-sm"
                                                >
                                                    {file.status === 'pending' && <div className="aspect-video animate-pulse bg-black/20" />}
                                                    {file.status === 'success' && (
                                                        <div
                                                            onClick={() => {
                                                                if (file.result) {
                                                                    window.open(file.result, '_blank');
                                                                }
                                                            }}
                                                            className="z-10 flex aspect-video w-full cursor-pointer items-center justify-center rounded-md bg-gray-100 text-sm text-gray-600"
                                                        >
                                                            <File className="mr-2 size-6" />
                                                            {file.fileName}
                                                        </div>
                                                    )}

                                                    <div className="absolute top-2 right-2 z-20">
                                                        <DropzoneRemoveFile>
                                                            <span onClick={() => setSppkpFileStatuses([])} className="rounded-full bg-white p-1">
                                                                <Trash2Icon className="size-4 text-black" />
                                                            </span>
                                                        </DropzoneRemoveFile>
                                                    </div>
                                                </DropzoneFileListItem>
                                            ))
                                        ) : (
                                            <DropzoneTrigger className="flex flex-col items-center gap-4 bg-transparent p-10 text-center text-sm">
                                                <CloudUploadIcon className="size-8" />
                                                <div>
                                                    <p className="font-semibold">Upload PDF</p>
                                                    <p className="text-muted-foreground text-sm">Click or drag to upload a .pdf file</p>
                                                </div>
                                            </DropzoneTrigger>
                                        )}
                                    </DropZoneArea>
                                </Dropzone>
                                <InputError message={errors.attachments} />
                            </div>

                            {/* KTP */}
                            <div className="w-full">
                                <Label htmlFor="file_ktp" className="mb-1 block">
                                    Upload KTP <span className="text-red-500">*</span>
                                </Label>
                                <Dropzone {...dropzoneKtp}>
                                    <DropZoneArea>
                                        {ktpFileStatuses.length > 0 ? (
                                            ktpFileStatuses.map((file) => (
                                                <DropzoneFileListItem
                                                    key={file.id}
                                                    file={file}
                                                    className="bg-secondary relative w-full overflow-hidden rounded-md shadow-sm"
                                                >
                                                    {file.status === 'pending' && <div className="aspect-video animate-pulse bg-black/20" />}
                                                    {file.status === 'success' && (
                                                        <div
                                                            onClick={() => {
                                                                if (file.result) {
                                                                    window.open(file.result, '_blank');
                                                                }
                                                            }}
                                                            className="z-10 flex aspect-video w-full cursor-pointer items-center justify-center rounded-md bg-gray-100 text-sm text-gray-600"
                                                        >
                                                            <File className="mr-2 size-6" />
                                                            {file.fileName}
                                                        </div>
                                                    )}

                                                    <div className="absolute top-2 right-2 z-20">
                                                        <DropzoneRemoveFile>
                                                            <span onClick={() => setKtpFileStatuses([])} className="rounded-full bg-white p-1">
                                                                <Trash2Icon className="size-4 text-black" />
                                                            </span>
                                                        </DropzoneRemoveFile>
                                                    </div>
                                                </DropzoneFileListItem>
                                            ))
                                        ) : (
                                            <DropzoneTrigger className="flex flex-col items-center gap-4 bg-transparent p-10 text-center text-sm">
                                                <CloudUploadIcon className="size-8" />
                                                <div>
                                                    <p className="font-semibold">Upload PDF</p>
                                                    <p className="text-muted-foreground text-sm">Click or drag to upload a .pdf file</p>
                                                </div>
                                            </DropzoneTrigger>
                                        )}
                                    </DropZoneArea>
                                </Dropzone>
                                <p className="mt-1 text-xs text-red-500">* Wajib unggah KTP dalam format PDF</p>
                                <InputError message={errors.attachments} />
                            </div>
                        </div>
                    </div>

                    <div className="col-span-3">
                        <div className="w-full">
                            {/* Keterangan Tanggal dan Nama */}
                            <p className="text-muted-foreground mt-2 text-sm">
                                Diisi tanggal{' '}
                                <strong>
                                    {new Date().toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </strong>{' '}
                                <strong> oleh {data.nama_personal || ''}</strong>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mt-4 flex gap-2">
                    <Button type="submit" disabled={processing}>
                        {customer ? 'Save' : 'Create'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => router.visit('/customer')}>
                        Cancel
                    </Button>
                </div>
            </form>
        </div>
    );
}
