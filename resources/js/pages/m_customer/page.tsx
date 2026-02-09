/* eslint-disable @typescript-eslint/no-explicit-any */
// m_customer/page.tsx

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Pastikan komponen ini ada
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types'; // Asumsi base types ada di sini
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { columns } from './table/columns';
import { DataTable } from './table/data-table'; // Asumsi Anda punya komponen DataTable yang sama

// 1. Definisi Tipe Data Customer sesuai Database/Controller
export interface Customer {
    id_customer: number;
    id?: number;
    nama_perusahaan: string;
    type: string;
    email: string;
    nama: string; // Nama PIC
    no_telp?: string;
    kota?: string;
    no_npwp?: string;
    no_npwp_16?: string;
    perusahaan?: {
        id: number;
        nama_perusahaan: string;
    };
    created_at: string;
}

// Interface untuk Props yang dikirim dari Controller
interface CustomerPageProps extends PageProps {
    customers: Customer[]; // Pastikan di controller index() Anda me-return data ini
    flash: {
        success?: string;
        error?: string;
    };
}

export default function ManageCustomers() {
    // Ambil data dari Inertia Props
    const { customers } = usePage<CustomerPageProps>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Master Data',
            href: '#',
        },
        {
            title: 'Customer',
            href: '/customer',
        },
    ];

    // --- State untuk Modal Delete ---
    const [openDelete, setOpenDelete] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

    // --- State Edit (Modal & Form Data) ---
    const [openEdit, setOpenEdit] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const initialFormState = {
        nama_perusahaan: '',
        type: '',
        email: '',
        nama: '',
        no_npwp: '',
        no_npwp_16: '',
    };

    const [formData, setFormData] = useState({
        id_customer: 0, // Hanya untuk edit
        ...initialFormState,
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleCreateClick = () => {
        setFormData({ id_customer: 0, ...initialFormState }); // Reset form
        setOpenCreate(true);
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post(route('customer.store'), formData, {
            onSuccess: () => {
                setOpenCreate(false);
                setIsSubmitting(false);
                setFormData({ id_customer: 0, ...initialFormState });
                toast.success('Customer berhasil ditambahkan!');
            },
            onError: (errors) => {
                setIsSubmitting(false);
                console.error('Error creating:', errors);
                toast.error('Gagal menambahkan data. Periksa input Anda.');
            },
        });
    };

    // 1. Edit Handler: Redirect ke halaman Edit
    const onEditClick = (customer: Customer) => {
        setFormData({
            id_customer: customer.id_customer || customer.id || 0,
            nama_perusahaan: customer.nama_perusahaan || '',
            type: customer.type || 'external',
            email: customer.email || '',
            nama: customer.nama || '',
            no_npwp: customer.no_npwp || '',
            no_npwp_16: customer.no_npwp_16 || '',
        });
        setOpenEdit(true);
    };

    const handleUpdateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.put(route('customer.update', formData.id_customer), formData, {
            onSuccess: () => {
                setOpenEdit(false);
                setIsSubmitting(false);
                toast.success('Data Customer berhasil diperbarui!');
            },
            onError: (errors) => {
                setIsSubmitting(false);
                console.error('Error updating:', errors);
                toast.error('Gagal memperbarui data.');
            },
        });
    };

    // 3. DELETE Handler
    const onDeleteClick = (customer: Customer) => {
        setCustomerToDelete(customer);
        setOpenDelete(true);
    };

    const onConfirmDelete = () => {
        if (customerToDelete) {
            const id = customerToDelete.id_customer || customerToDelete.id;
            router.delete(route('customer.destroy', id), {
                onSuccess: () => {
                    setOpenDelete(false);
                    setCustomerToDelete(null);
                    toast.success('Data Customer berhasil dihapus!');
                },
                onError: () => toast.error('Gagal menghapus data.'),
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Customers" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Data Customer</h1>
                        <p className="text-muted-foreground text-sm">Kelola data pelanggan dan perusahaan rekanan.</p>
                    </div>
                </div>

                {/* Table */}
                <div className="">
                    <DataTable columns={columns(onEditClick, onDeleteClick)} data={customers || []} onCreateClick={handleCreateClick} />
                </div>
            </div>

            {/* --- MODAL CREATE CUSTOMER --- */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Tambah Customer Baru</DialogTitle>
                        <DialogDescription>Masukkan informasi detail customer baru.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
                        {/* Nama Perusahaan */}
                        <div className="space-y-1">
                            <Label htmlFor="create_nama_perusahaan">
                                Nama Perusahaan <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="create_nama_perusahaan"
                                value={formData.nama_perusahaan}
                                onChange={(e) => handleInputChange('nama_perusahaan', e.target.value)}
                                required
                                placeholder="PT. Contoh Sukses"
                            />
                        </div>

                        {/* Tipe & Email */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="create_type">
                                    Tipe Customer <span className="text-red-500">*</span>
                                </Label>
                                <Select value={formData.type} onValueChange={(val) => handleInputChange('type', val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih tipe" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="external">External</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="create_email">
                                    Email <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="create_email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    required
                                    placeholder="email@perusahaan.com"
                                />
                            </div>
                        </div>

                        {/* PIC Name */}
                        <div className="space-y-1">
                            <Label htmlFor="create_nama">
                                Nama PIC / Personal <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="create_nama"
                                value={formData.nama}
                                onChange={(e) => handleInputChange('nama', e.target.value)}
                                required
                                placeholder="Nama Lengkap Penanggung Jawab"
                            />
                        </div>

                        {/* NPWP Fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="create_no_npwp">No. NPWP (15 Digit)</Label>
                                <Input
                                    id="create_no_npwp"
                                    value={formData.no_npwp}
                                    onChange={(e) => handleInputChange('no_npwp', e.target.value)}
                                    placeholder="Opsional"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="create_no_npwp_16">No. NPWP (16 Digit)</Label>
                                <Input
                                    id="create_no_npwp_16"
                                    value={formData.no_npwp_16}
                                    onChange={(e) => handleInputChange('no_npwp_16', e.target.value)}
                                    placeholder="Opsional"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary" disabled={isSubmitting}>
                                    Batal
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* --- MODAL EDIT CUSTOMER --- */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Customer</DialogTitle>
                        <DialogDescription>Ubah informasi detail customer di bawah ini.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUpdateSubmit} className="space-y-4 py-2">
                        {/* Form field sama dengan create, tapi valuenya dari state yang sama (formData) */}
                        <div className="space-y-1">
                            <Label htmlFor="edit_nama_perusahaan">Nama Perusahaan</Label>
                            <Input
                                id="edit_nama_perusahaan"
                                value={formData.nama_perusahaan}
                                onChange={(e) => handleInputChange('nama_perusahaan', e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="edit_type">Tipe Customer</Label>
                                <Select value={formData.type} onValueChange={(val) => handleInputChange('type', val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih tipe" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="internal">Internal</SelectItem>
                                        <SelectItem value="external">External</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="edit_email">Email</Label>
                                <Input
                                    id="edit_email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="edit_nama">Nama PIC / Personal</Label>
                            <Input id="edit_nama" value={formData.nama} onChange={(e) => handleInputChange('nama', e.target.value)} required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="edit_no_npwp">No. NPWP (15 Digit)</Label>
                                <Input id="edit_no_npwp" value={formData.no_npwp} onChange={(e) => handleInputChange('no_npwp', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="edit_no_npwp_16">No. NPWP (16 Digit)</Label>
                                <Input
                                    id="edit_no_npwp_16"
                                    value={formData.no_npwp_16}
                                    onChange={(e) => handleInputChange('no_npwp_16', e.target.value)}
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary" disabled={isSubmitting}>
                                    Batal
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* --- MODAL DELETE --- */}
            <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Hapus Data Customer</DialogTitle>
                        <DialogDescription className="pt-2">
                            Apakah Anda yakin ingin menghapus data perusahaan
                            <span className="font-bold text-red-600"> {customerToDelete?.nama_perusahaan}</span>?
                            <br />
                            Tindakan ini tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:justify-start">
                        <Button type="button" variant="destructive" className="text-white" onClick={onConfirmDelete}>
                            Ya, Hapus
                        </Button>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Batal
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
