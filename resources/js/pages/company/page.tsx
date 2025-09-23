/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { columns } from './table/columns';
import { DataTable } from './table/data-table';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Manage Company',
        href: '/perusahaan',
    },
];

// Sesuaikan interface dengan snake_case dari backend
interface FormState {
    nama_perusahaan: string;
    id_User: string;
    id_User_1: string; // manager
    id_User_2: string; // direktur
    id_User_3: string; // lawyer
    notify_1: string;
    notify_2: string;
}

export default function ManageCompany() {
    const { props } = usePage();
    const { companies, flash } = props as {
        companies: any[];
        flash: { success?: string; error?: string };
    };

    const initialFormState: FormState = {
        nama_perusahaan: '',
        id_User: '',
        id_User_1: '',
        id_User_2: '',
        id_User_3: '',
        notify_1: '',
        notify_2: '',
    };

    const [form, setForm] = useState<FormState>(initialFormState);
    const [openForm, setOpenForm] = useState(false);
    const [openDelete, setOpenDelete] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
    const [companyIdToDelete, setCompanyIdToDelete] = useState<number | null>(null);

    console.log(usePage().props);

    const userRoles = [
        { key: 'id_User', label: 'Marketing' },
        { key: 'id_User_1', label: 'Manager' },
        { key: 'id_User_2', label: 'Direktur' },
        { key: 'id_User_3', label: 'Lawyer' },
    ];

    // Handle perubahan select
    const handleUserChange = (field: keyof FormState, value: string) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prevForm) => ({
            ...prevForm,
            [name]: value,
        }));
    };

    // Fungsi untuk mereset form dan menutup dialog
    const resetFormAndClose = () => {
        setForm(initialFormState);
        setSelectedCompany(null);
        setOpenForm(false);
    };

    // --- FUNGSI INI DIPERBAIKI ---
    const onEditClick = (company: any) => {
        setSelectedCompany(company);

        // ✅ Cari role masing-masing
        const user = company.users.find((u: any) => u.pivot.role === 'user' || u.pivot.role === 'marketing');
        const manager = company.users.find((u: any) => u.pivot.role === 'manager');
        const direktur = company.users.find((u: any) => u.pivot.role === 'direktur');
        const lawyer = company.users.find((u: any) => u.pivot.role === 'lawyer');

        setForm({
            nama_perusahaan: company.nama_perusahaan || '',
            id_User: user ? String(user.id) : '',
            id_User_1: manager ? String(manager.id) : '',
            id_User_2: direktur ? String(direktur.id) : '',
            id_User_3: lawyer ? String(lawyer.id) : '',
            notify_1: company.notify_1 || '',
            notify_2: company.notify_2 || '',
        });

        setOpenForm(true);
    };

    const onDeleteClick = (id: number) => {
        setCompanyIdToDelete(id);
        setOpenDelete(true);
    };

    const onConfirmDelete = () => {
        if (companyIdToDelete) {
            router.delete(`/perusahaan/${companyIdToDelete}`, {
                preserveScroll: true, // biar nggak balik ke atas
                onSuccess: () => {
                    setOpenDelete(false);
                    setCompanyIdToDelete(null);
                    toast.success('Perusahaan berhasil dihapus');

                    // ✅ reload halaman supaya data terbaru ditarik dari server
                    router.reload({ only: ['companies'] });
                },
                onError: () => {
                    toast.error('Gagal menghapus perusahaan');
                },
            });
        }
    };

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        // Backend mengharapkan string, jadi tidak perlu di-split
        const data = {
            ...form,
            ...(selectedCompany ? { id_perusahaan: selectedCompany.id } : {}),
        };

        if (selectedCompany) {
            router.put(`/perusahaan/${selectedCompany.id}`, data, {
                preserveScroll: true,
                onSuccess: () => {
                    resetFormAndClose();
                    toast.success('Perusahaan berhasil diperbarui');

                    // ✅ reload hanya data companies
                    router.reload({ only: ['companies'] });
                },
                onError: (errors) => {
                    console.error('Update Errors:', errors);
                    toast.error('Gagal memperbarui perusahaan. Periksa konsol untuk detail.');
                },
            });
        } else {
            router.post('/perusahaan', data, {
                preserveScroll: true,
                onSuccess: () => {
                    resetFormAndClose();
                    toast.success('Perusahaan berhasil ditambahkan');

                    // ✅ reload hanya data companies
                    router.reload({ only: ['companies'] });
                },
                onError: (errors) => {
                    console.error('Create Errors:', errors);
                    toast.error('Gagal menambah perusahaan. Periksa konsol untuk detail.');
                },
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Companies" />
            <div className="p-4">
                <DataTable columns={columns(onEditClick, onDeleteClick)} data={companies} />
            </div>

            {/* Dialog Hapus */}
            <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus Perusahaan</DialogTitle>
                        <div className="mt-2">Apakah Anda yakin ingin menghapus perusahaan ini?</div>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-start">
                        <Button variant="destructive" className="text-white" onClick={onConfirmDelete}>
                            Hapus
                        </Button>
                        <DialogClose asChild>
                            <Button variant="secondary">Batal</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- DIALOG FORM INI DIPERBAIKI --- */}
            <Dialog open={openForm} onOpenChange={(isOpen) => !isOpen && resetFormAndClose()}>
                <DialogContent>
                    <form onSubmit={onSubmit}>
                        <DialogHeader>
                            <DialogTitle>{selectedCompany ? 'Edit Perusahaan' : 'Tambah Perusahaan'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="nama_perusahaan">Nama Perusahaan</Label>
                                <Input
                                    id="nama_perusahaan"
                                    name="nama_perusahaan"
                                    value={form.nama_perusahaan}
                                    onChange={handleInputChange}
                                    placeholder="Contoh: PT. Maju Sejahtera"
                                    required
                                />
                            </div>

                            {/* 🔽 Dropdown user roles */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {userRoles.map(({ key, label }) => (
                                    <div key={key}>
                                        <Label htmlFor={key}>{label}</Label>
                                        <select
                                            id={key}
                                            className="w-full rounded border px-2 py-1"
                                            value={form[key as keyof FormState]}
                                            onChange={(e) => handleUserChange(key as keyof FormState, e.target.value)}
                                        >
                                            <option value="">Pilih {label}</option>
                                            {props.users?.map((user: any) => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <Label htmlFor="notify_1">Notifikasi Email 1</Label>
                                <Input
                                    id="notify_1"
                                    name="notify_1"
                                    value={form.notify_1}
                                    onChange={handleInputChange}
                                    placeholder="email1@contoh.com, email2@contoh.com"
                                />
                            </div>
                            <div>
                                <Label htmlFor="notify_2">Notifikasi Email 2</Label>
                                <Input
                                    id="notify_2"
                                    name="notify_2"
                                    value={form.notify_2}
                                    onChange={handleInputChange}
                                    placeholder="email3@contoh.com, email4@contoh.com"
                                />
                            </div>
                        </div>
                        <DialogFooter className="sm:justify-start">
                            <Button type="submit">{selectedCompany ? 'Update' : 'Create'}</Button>
                            <DialogClose asChild>
                                <Button variant="secondary" type="button">
                                    Batal
                                </Button>
                            </DialogClose>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
