/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { columns } from './table/columns';
import { DataTable } from './table/data-table';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Manage Company',
        href: '/perusahaan',
    },
];

interface FormState {
    nama_perusahaan: string;
    id_User_1: string;
    id_User_2: string;
    id_User_3: string;
    Notify_1: string;
    Notify_2?: string;
}

export default function ManageCompany() {
    const props = usePage().props as Record<string, any>;
    const companies = props.companies as any[];
    const flash = props.flash as { success?: string; error?: string };

    const [form, setForm] = useState<FormState>({
        nama_perusahaan: '',
        id_User_1: '',
        id_User_2: '',
        id_User_3: '',
        Notify_1: '',
        Notify_2: '',
    });

    const [openForm, setOpenForm] = useState(false);
    const [openDelete, setOpenDelete] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
    const [companyName, setCompanyName] = useState('');
    const [companyIdToDelete, setCompanyIdToDelete] = useState<number | null>(null);

    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash]);

    const onEditClick = (company: any) => {
        setSelectedCompany(company);
        setCompanyName(company.nama_perusahaan);
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
                },
            });
        }
    };

    const onSubmit = () => {
        const data = {
            ...form,
            Notify_1: form.Notify_1 ? form.Notify_1.split(',').map((email: string) => email.trim()) : [],
            Notify_2: form.Notify_2 ? form.Notify_2.split(',').map((email: string) => email.trim()) : [],
        };

        if (selectedCompany) {
            router.put(`/perusahaan/${selectedCompany.id}`, data, {
                preserveScroll: true,
                onSuccess: () => {
                    setOpenForm(false);
                    resetForm();
                    setSelectedCompany(null);
                },
            });
        } else {
            router.post('/perusahaan', data, {
                preserveScroll: true,
                onSuccess: () => {
                    setOpenForm(false);
                    resetForm();
                },
                onError: (errors) => {
                    console.error(errors); // Lihat konsol jika validasi Laravel gagal
                },
            });
        }
    };

    const resetForm = () => {
        setForm({
            nama_perusahaan: '',
            id_User_1: '',
            id_User_2: '',
            id_User_3: '',
            Notify_1: '',
            Notify_2: '',
        });
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

            {/* Dialog Form Tambah/Edit */}
            <Dialog open={openForm} onOpenChange={setOpenForm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedCompany ? 'Edit Perusahaan' : 'Tambah Perusahaan'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="companyName">Nama Perusahaan</Label>
                            <Input
                                id="companyName"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                placeholder="Contoh: PT. Maju Sejahtera"
                            />
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-start">
                        <Button onClick={onSubmit}>{selectedCompany ? 'Update' : 'Create'}</Button>
                        <DialogClose asChild>
                            <Button variant="secondary">Batal</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
