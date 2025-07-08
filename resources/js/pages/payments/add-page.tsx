import FormPayments from '@/components/payments/data-form';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Payments',
        href: '/dashboard/payments',
    },
    {
        title: 'Add Item Payments',
        href: '/dashboard/payments/new',
    },
];

export default function PaymentsAdd() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payments" />
            <div className="p-4">
                <FormPayments />
            </div>
        </AppLayout>
    );
}
