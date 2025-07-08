import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { MasterCustomer, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { columns } from './table/columns';
import { DataTable } from './table/data-table';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Data Customer',
        href: '/customer',
    },
];

export default function MasterCustomerPage() {
    const { customers, flash } = usePage().props as unknown as { customers: MasterCustomer[]; flash: { success?: string; error?: string } };

    // console.log(usePage().props);

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const [openDelete, setOpenDelete] = useState(false);
    const [supplierIdToDelete, setSupplierIdToDelete] = useState<number | null>(null);
    const supplierToDelete = customers.find((s) => s.id === supplierIdToDelete);

    const onDeleteClick = (id: number) => {
        setSupplierIdToDelete(id);
        setOpenDelete(true);
    };

    const onConfirmDelete = () => {
        if (supplierIdToDelete !== null) {
            router.delete(`/master-customer/${supplierIdToDelete}`, {
                onSuccess: () => {
                    setOpenDelete(false);
                    setSupplierIdToDelete(null);
                },
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Master Customer" />
            <div className="p-4">
                <DataTable columns={columns(onDeleteClick)} data={customers} />
            </div>

            {/* Dialog untuk menghapus supplier */}
            <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Hapus Data</DialogTitle>
                        <div className="mt-2">
                            Data <span className="font-bold text-white">{supplierToDelete?.nama_cust ?? 'Tidak ditemukan'}</span> akan dihapus. Apakah
                            Anda yakin?
                        </div>
                    </DialogHeader>
                    <div className="flex gap-2">
                        <Button type="button" variant="destructive" onClick={onConfirmDelete}>
                            Hapus
                        </Button>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                Close
                            </Button>
                        </DialogClose>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
