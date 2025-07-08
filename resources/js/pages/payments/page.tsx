import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { Payment, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { columns } from '../../components/payments/columns';
import { DataTable } from '../../components/payments/data-table';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Payments',
        href: '/dashboard/payments',
    },
];

export default function Payments() {
    const { payments } = usePage().props as unknown as { payments: Payment[] };
    const [open, setOpen] = useState(false);
    const [paymentIdToDelete, setPaymentIdToDelete] = useState<string | null>(null);

    const paymentToDelete = payments.find((p) => p.id === paymentIdToDelete);

    const onDeleteClick = (id: string) => {
        setPaymentIdToDelete(id);
        setOpen(true);
    };

    const onConfirmDelete = () => {
        if (paymentIdToDelete) {
            router.delete(`/dashboard/payments/delete/${paymentIdToDelete}`, {
                onSuccess: () => {
                    setOpen(false);
                    setPaymentIdToDelete(null);
                },
                onError: (errors) => {
                    console.error('❌ Error saat menghapus pembayaran:', errors);
                },
            });
        } else {
            console.error('❌ Tidak ada ID yang dipilih untuk dihapus!');
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payments" />
            <div className="p-4">
                <DataTable columns={columns(onDeleteClick)} data={payments} />
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Hapus Data</DialogTitle>
                        <DialogDescription>
                            Data <span className="font-bold text-white">{paymentToDelete?.email ?? 'Tidak ditemukan'}</span> akan dihapus. Apakah Anda
                            yakin?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-start">
                        <Button type="button" variant="destructive" onClick={onConfirmDelete}>
                            Hapus
                        </Button>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                Close
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
