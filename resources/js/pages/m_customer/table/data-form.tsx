import { Dropzone, DropZoneArea, DropzoneFileListItem, DropzoneRemoveFile, DropzoneTrigger, useDropzone } from '@/components/dropzone';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Auth, MasterCustomer } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { CloudUploadIcon, Trash2Icon } from 'lucide-react';
import { FormEventHandler, useState } from 'react';
import { NumericFormat } from 'react-number-format';

export default function CustomerForm({ auth, customer, onSuccess }: { auth: Auth; customer?: MasterCustomer; onSuccess?: () => void }) {
    const { data, setData, post, put, processing, errors } = useForm<MasterCustomer>({
        id: customer?.id || null,
        kategori_usaha: customer?.kategori_usaha || '',
        nama_perusahaan: customer?.nama_perusahaan || '',
        bentuk_badan_usaha: customer?.bentuk_badan_usaha || '',
        alamat_lengkap: customer?.alamat_lengkap || '',
        kota: customer?.kota || '',
        no_telp: customer?.no_telp ?? null,
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
        status_approval: customer?.status_approval || 'pending',
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
    const [errors_kategori, setErrors] = useState<{ kategori_usaha?: string; lain_kategori?: string }>({});

    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // State untuk masing-masing dropzone
    const dropzoneNpwp = useDropzone({
        onDropFile: async (file: File) => {
            await new Promise((resolve) => setTimeout(resolve, 500));
            return {
                status: 'success',
                result: URL.createObjectURL(file),
            };
        },
        validation: {
            accept: {
                'image/*': ['.png', '.jpg', '.jpeg'],
            },
            maxSize: 10 * 1024 * 1024,
            maxFiles: 1,
        },
    });

    const dropzoneSppkp = useDropzone({
        onDropFile: async (file: File) => {
            await new Promise((resolve) => setTimeout(resolve, 500));
            return {
                status: 'success',
                result: URL.createObjectURL(file),
            };
        },
        validation: {
            accept: {
                'image/*': ['.png', '.jpg', '.jpeg'],
            },
            maxSize: 10 * 1024 * 1024,
            maxFiles: 1,
        },
    });

    const dropzoneKtp = useDropzone({
        onDropFile: async (file: File) => {
            await new Promise((resolve) => setTimeout(resolve, 500));
            return {
                status: 'success',
                result: URL.createObjectURL(file),
            };
        },
        validation: {
            accept: {
                'image/*': ['.png', '.jpg', '.jpeg'],
            },
            maxSize: 10 * 1024 * 1024,
            maxFiles: 1,
        },
    });

    // const [open, setOpen] = useState(false);

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        const newErrors: typeof errors_kategori = {};

        if (!data.kategori_usaha) {
            newErrors.kategori_usaha = 'Kategori usaha wajib dipilih.';
        }

        if (data.kategori_usaha === 'lain2' && !lainKategori.trim()) {
            newErrors.lain_kategori = 'Kategori lainnya wajib diisi.';
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            // Lanjutkan submit data
            // post('/route', data);
            console.log('Valid! Submitting...', data);
        }

        if (customer?.id) {
            put(route('customer.update', customer.id), {
                onSuccess: () => {
                    onSuccess?.();
                },
                onError: (errors) => {
                    console.log('Update error:', errors);
                },
            });
        } else {
            post(route('customer.store'), {
                onSuccess: () => {
                    onSuccess?.();
                },
                onError: (errors) => {
                    console.log('Create error:', errors);
                },
            });
        }
    };

    return (
        <div className="rounded-2xl border p-4">
            <h1 className="mb-4 text-3xl font-semibold">{customer ? 'Edit Data Customer' : 'Buat Data Customer'}</h1>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-3 grid grid-cols-3 gap-4">
                        <div className="w-full">
                            <Label htmlFor="kategori_usaha">
                                Kategori Usaha <span className="text-red-500">*</span>
                            </Label>
                            <Select
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
                                required
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
                            <Input
                                required
                                id="bentuk_badan_usaha"
                                value={data.bentuk_badan_usaha}
                                onChange={(e) => setData('bentuk_badan_usaha', e.target.value)}
                                placeholder="Masukkan Bentuk Badan Usaha"
                            />
                            <InputError message={errors.bentuk_badan_usaha} />
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
                                Nomor Telp <span className="text-red-500">*</span>
                            </Label>
                            <NumericFormat
                                required
                                id="no_telp"
                                value={data.no_telp}
                                onChange={(e) => setData('no_telp', e.target.value)}
                                className={cn(
                                    'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                                    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                                    'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                                )}
                                placeholder="Enter nomor telepon"
                                allowNegative={false}
                                decimalScale={0}
                            />
                            <InputError message={errors.no_telp} />
                        </div>

                        <div className="w-full">
                            <Label htmlFor="no_fax">
                                Nomor Fax <span className="text-red-500">*</span>
                            </Label>
                            <NumericFormat
                                required
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
                            <InputError message={errors.status_perpajakan} />
                        </div>
                        <div className="w-full">
                            <Label htmlFor="no_npwp">
                                Nomor NPWP <span className="text-red-500">*</span>
                            </Label>
                            <NumericFormat
                                required
                                id="no_npwp"
                                value={data.no_npwp}
                                onChange={(e) => setData('no_npwp', e.target.value)}
                                className={cn(
                                    'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                                    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                                    'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                                )}
                                placeholder="Enter nomor NPWP"
                                allowNegative={false}
                                decimalScale={0}
                            />
                            <InputError message={errors.no_npwp} />
                        </div>
                        <div className="w-full">
                            <Label htmlFor="no_npwp_16">
                                Nomor NPWP (16 Digit) <span className="text-red-500">*</span>
                            </Label>
                            <NumericFormat
                                required
                                id="no_npwp_16"
                                value={data.no_npwp_16}
                                onChange={(e) => setData('no_npwp_16', e.target.value)}
                                className={cn(
                                    'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                                    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                                    'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                                )}
                                placeholder="Enter nomor NPWP (16 digit)"
                                allowNegative={false}
                                decimalScale={0}
                            />
                            <InputError message={errors.no_npwp_16} />
                        </div>
                    </div>
                    <div className="col-span-3 mt-4">
                        <h1 className="mb-2 text-xl font-semibold">Data Direktur</h1>
                        <div className="grid w-full grid-cols-3 gap-4">
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
                                    placeholder="Masukkan Terms of Payment"
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
                                <NumericFormat
                                    required
                                    id="no_telp_pj"
                                    value={data.no_telp_pj}
                                    onChange={(e) => setData('no_telp_pj', e.target.value)}
                                    className={cn(
                                        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                                        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                                        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                                    )}
                                    placeholder="Enter No. Telp. Direktur"
                                    allowNegative={false}
                                    decimalScale={0}
                                />
                                <InputError message={errors.no_telp_pj} />
                            </div>
                        </div>
                    </div>
                    <div className="col-span-3 mt-4">
                        <h1 className="mb-2 text-xl font-semibold">Data Personal</h1>
                        <div className="grid w-full grid-cols-3 gap-4">
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
                                    placeholder="Masukkan nama personal"
                                />
                                <InputError message={errors.nama_pj} />
                            </div>
                            <div className="w-full">
                                <Label htmlFor="jabatan_pj">
                                    Jabatan <span className="text-red-500">*</span>
                                </Label>
                                <NumericFormat
                                    required
                                    id="jabatan_pj"
                                    value={data.no_ktp_pj}
                                    onChange={(e) => setData('no_ktp_pj', e.target.value)}
                                    className={cn(
                                        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                                        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                                        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                                    )}
                                    placeholder="Masukkan jabatan personal"
                                    allowNegative={false}
                                    decimalScale={0}
                                />
                                <InputError message={errors.no_ktp_pj} />
                            </div>
                            <div className="w-full">
                                <Label htmlFor="no_telp_pj">
                                    No. Telp. <span className="text-red-500">*</span>
                                </Label>
                                <NumericFormat
                                    required
                                    id="no_telp_pj"
                                    value={data.no_telp_pj}
                                    onChange={(e) => setData('no_telp_pj', e.target.value)}
                                    className={cn(
                                        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                                        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                                        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                                    )}
                                    placeholder="Masukkan no. telp personal"
                                    allowNegative={false}
                                    decimalScale={0}
                                />
                                <InputError message={errors.no_telp_pj} />
                            </div>
                            <div className="w-full">
                                <Label htmlFor="email_pj">Email</Label>
                                <NumericFormat
                                    required
                                    id="email_pj"
                                    value={data.no_ktp_pj}
                                    onChange={(e) => setData('no_ktp_pj', e.target.value)}
                                    className={cn(
                                        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                                        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                                        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                                    )}
                                    placeholder="Masukkan email personal"
                                    allowNegative={false}
                                    decimalScale={0}
                                />
                                <InputError message={errors.no_ktp_pj} />
                            </div>
                        </div>
                    </div>
                    <div className="col-span-3 mt-4">
                        <h1 className="mb-2 text-xl font-semibold">Lampiran</h1>

                        {/* 3 Dropzone Kolom */}
                        <div className="grid grid-cols-3 gap-6">
                            {/* NPWP */}
                            <div className="w-full">
                                <Label htmlFor="file_npwp" className="mb-1 block">
                                    Upload NPWP <span className="text-red-500">*</span>
                                </Label>
                                <Dropzone {...dropzoneNpwp}>
                                    <DropZoneArea>
                                        {dropzoneNpwp.fileStatuses.length > 0 ? (
                                            dropzoneNpwp.fileStatuses.map((file) => (
                                                <DropzoneFileListItem
                                                    key={file.id}
                                                    file={file}
                                                    className="bg-secondary relative w-full overflow-hidden rounded-md shadow-sm"
                                                >
                                                    {file.status === 'pending' && <div className="aspect-video animate-pulse bg-black/20" />}
                                                    {file.status === 'success' && (
                                                        <img
                                                            src={file.result}
                                                            alt={`uploaded-${file.fileName}`}
                                                            className="z-10 aspect-video w-full rounded-md object-cover"
                                                            onClick={() => {
                                                                setPreviewImage(file.result);
                                                                setIsModalOpen(true);
                                                            }}
                                                        />
                                                    )}
                                                    <div className="absolute top-2 right-2 z-20">
                                                        <DropzoneRemoveFile>
                                                            <button
                                                                onClick={() => console.log('Trash icon clicked for:', file.fileName)}
                                                                className="rounded-full bg-black/80 p-1"
                                                            >
                                                                <Trash2Icon className="size-4" />
                                                            </button>
                                                        </DropzoneRemoveFile>
                                                    </div>
                                                </DropzoneFileListItem>
                                            ))
                                        ) : (
                                            <DropzoneTrigger className="flex flex-col items-center gap-4 bg-transparent p-10 text-center text-sm">
                                                <CloudUploadIcon className="size-8" />
                                                <div>
                                                    <p className="font-semibold">Upload images</p>
                                                    <p className="text-muted-foreground text-sm">Click here or drag and drop to upload</p>
                                                </div>
                                            </DropzoneTrigger>
                                        )}
                                    </DropZoneArea>
                                </Dropzone>
                                {isModalOpen && previewImage && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                                        <div className="relative mx-4 w-full max-w-3xl rounded-lg bg-white p-4 shadow-lg">
                                            <img src={previewImage} alt="preview" className="h-auto max-h-[80vh] w-full rounded object-contain" />
                                            <div className="mt-4 flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setIsModalOpen(false);
                                                        setPreviewImage(null);
                                                    }}
                                                    className="rounded-md bg-gray-300 px-4 py-2 hover:bg-gray-400"
                                                >
                                                    Tutup
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <InputError message={errors.file_npwp} />
                            </div>

                            {/* SPPKP */}
                            <div className="w-full">
                                <Label htmlFor="file_sppkp" className="mb-1 block">
                                    Upload SPPKP <span className="text-red-500">*</span>
                                </Label>
                                <Dropzone {...dropzoneSppkp}>
                                    <DropZoneArea>
                                        {dropzoneSppkp.fileStatuses.length > 0 ? (
                                            dropzoneSppkp.fileStatuses.map((file) => (
                                                <DropzoneFileListItem
                                                    key={file.id}
                                                    file={file}
                                                    className="bg-secondary relative w-full overflow-hidden rounded-md shadow-sm"
                                                >
                                                    {file.status === 'pending' && <div className="aspect-video animate-pulse bg-black/20" />}
                                                    {file.status === 'success' && (
                                                        <img
                                                            src={file.result}
                                                            alt={`uploaded-${file.fileName}`}
                                                            className="aspect-video w-full rounded-md object-cover"
                                                            onClick={() => {
                                                                setPreviewImage(file.result);
                                                                setIsModalOpen(true);
                                                            }}
                                                        />
                                                    )}
                                                    <div className="absolute top-2 right-2">
                                                        <DropzoneRemoveFile>
                                                            <button
                                                                onClick={() => console.log('Trash icon clicked for:', file.fileName)}
                                                                className="rounded-full bg-black/80 p-1"
                                                            >
                                                                <Trash2Icon className="size-4" />
                                                            </button>
                                                        </DropzoneRemoveFile>
                                                    </div>
                                                </DropzoneFileListItem>
                                            ))
                                        ) : (
                                            <DropzoneTrigger className="flex flex-col items-center gap-4 bg-transparent p-10 text-center text-sm">
                                                <CloudUploadIcon className="size-8" />
                                                <div>
                                                    <p className="font-semibold">Upload images</p>
                                                    <p className="text-muted-foreground text-sm">Click here or drag and drop to upload</p>
                                                </div>
                                            </DropzoneTrigger>
                                        )}
                                    </DropZoneArea>
                                </Dropzone>
                                {isModalOpen && previewImage && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                                        <div className="relative mx-4 w-full max-w-3xl rounded-lg bg-white p-4 shadow-lg">
                                            <img src={previewImage} alt="preview" className="h-auto max-h-[80vh] w-full rounded object-contain" />
                                            <div className="mt-4 flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setIsModalOpen(false);
                                                        setPreviewImage(null);
                                                    }}
                                                    className="rounded-md bg-gray-300 px-4 py-2 hover:bg-gray-400"
                                                >
                                                    Tutup
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <InputError message={errors.file_sppkp} />
                            </div>

                            {/* KTP */}
                            <div className="w-full">
                                <Label htmlFor="file_ktp" className="mb-1 block">
                                    Upload KTP <span className="text-red-500">*</span>
                                </Label>
                                <Dropzone {...dropzoneKtp}>
                                    <DropZoneArea>
                                        {dropzoneKtp.fileStatuses.length > 0 ? (
                                            dropzoneKtp.fileStatuses.map((file) => (
                                                <DropzoneFileListItem
                                                    key={file.id}
                                                    file={file}
                                                    className="bg-secondary relative w-full overflow-hidden rounded-md shadow-sm"
                                                >
                                                    {file.status === 'pending' && <div className="aspect-video animate-pulse bg-black/20" />}
                                                    {file.status === 'success' && (
                                                        <img
                                                            src={file.result}
                                                            alt={`uploaded-${file.fileName}`}
                                                            className="aspect-video w-full rounded-md object-cover"
                                                            onClick={() => {
                                                                setPreviewImage(file.result);
                                                                setIsModalOpen(true);
                                                            }}
                                                        />
                                                    )}
                                                    <div className="absolute top-2 right-2">
                                                        <DropzoneRemoveFile>
                                                            <button
                                                                onClick={() => console.log('Trash icon clicked for:', file.fileName)}
                                                                className="rounded-full bg-black/80 p-1"
                                                            >
                                                                <Trash2Icon className="size-4" />
                                                            </button>
                                                        </DropzoneRemoveFile>
                                                    </div>
                                                </DropzoneFileListItem>
                                            ))
                                        ) : (
                                            <DropzoneTrigger className="flex flex-col items-center gap-4 bg-transparent p-10 text-center text-sm">
                                                <CloudUploadIcon className="size-8" />
                                                <div>
                                                    <p className="font-semibold">Upload images</p>
                                                    <p className="text-muted-foreground text-sm">Click here or drag and drop to upload</p>
                                                </div>
                                            </DropzoneTrigger>
                                        )}
                                    </DropZoneArea>
                                </Dropzone>
                                {isModalOpen && previewImage && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                                        <div className="relative mx-4 w-full max-w-3xl rounded-lg bg-white p-4 shadow-lg">
                                            <img src={previewImage} alt="preview" className="h-auto max-h-[80vh] w-full rounded object-contain" />
                                            <div className="mt-4 flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setIsModalOpen(false);
                                                        setPreviewImage(null);
                                                    }}
                                                    className="rounded-md bg-gray-300 px-4 py-2 hover:bg-gray-400"
                                                >
                                                    Tutup
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <InputError message={errors.file_ktp} />
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
                                </strong>
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
