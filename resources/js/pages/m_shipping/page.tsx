/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { MasterCustomer, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { columns } from './table/columns';
import { DataTable } from './table/data-table';

export default function MasterCustomerPage() {
    const {
        customers = [],
        flash,
        trans_general, // <--- INI PROPS TERJEMAHANNYA
    } = usePage().props as unknown as {
        customers: MasterCustomer[];
        flash: { success?: string; error?: string };
        trans_general: Record<string, string>; // Definisikan tipe datanya
    };

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: trans_general.shipment_data, // Translate: "Data Shipment"
            href: '/shipping',
        },
    ];

    const page = usePage();

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    useEffect(() => {
        const errors = (page.props as any)?.errors;
        if (errors && (errors.status === 403 || errors.code === 403)) {
            // Translate: "Anda tidak memiliki akses..."
            toast.error(trans_general.no_access);
        }
    }, [page.props, trans_general]);

    // REALTIME UPDATE LISTENER
    const user = (usePage().props.auth as any).user;
    useEffect(() => {
        if (user && (window as any).Echo) {
            const channel = (window as any).Echo.private(`notifications.${user.id_user}`);
            channel.listen('.notification.sent', (e: any) => {
                // If a new SPK is created or relevant update happens
                if (e.data?.type === 'spk_created') {
                    router.reload({ only: ['customers'] }); // Efficient reload
                    toast.info('Data SPK diperbarui', { description: 'Ada SPK baru masuk.' });
                }
            });

            return () => {
                channel.stopListening('.notification.sent');
            };
        }
    }, [user]);

    const [openDelete, setOpenDelete] = useState(false);
    const [supplierIdToDelete, setSupplierIdToDelete] = useState<number | null>(null);
    const supplierToDelete = customers?.find((s) => s.id === supplierIdToDelete);

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
            {/* Translate Head Title */}
            <Head title={trans_general.master_customer} />

            <div className="md:p-4">
                {/* Catatan: Jika header di dalam 'columns' perlu ditranslate,
                   Anda perlu mengubah cara passing columns, tapi untuk saat ini
                   kita fokus pada file ini saja.
                */}
                <DataTable columns={columns(trans_general, onDeleteClick)} data={customers} />
            </div>

            <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        {/* Translate: "Hapus Data" */}
                        <DialogTitle>{trans_general.delete_data}</DialogTitle>
                        <div className="mt-2">
                            {/* Translate Kalimat Konfirmasi */}
                            {trans_general.data} {/* "Data" */}
                            <span className="px-1 font-bold text-white">{supplierToDelete?.nama_cust ?? trans_general.not_found}</span>
                            {trans_general.delete_confirm} {/* "akan dihapus..." */}
                        </div>
                    </DialogHeader>
                    <div className="flex gap-2">
                        <Button type="button" variant="destructive" onClick={onConfirmDelete}>
                            {/* Translate Tombol Hapus */}
                            {trans_general.delete}
                        </Button>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                {/* Translate Tombol Close */}
                                {trans_general.close}
                            </Button>
                        </DialogClose>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
