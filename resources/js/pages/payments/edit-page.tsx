import FormPayments from '@/components/payments/data-form';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, Payment } from '@/types';
import { Head, usePage } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Payments',
        href: '/dashboard/payments',
    },
    {
        title: 'Edit Payment',
        href: '#',
    },
];

export default function PaymentsEdit() {
    const { props } = usePage();
    const { payment } = props as unknown as { payment: Payment };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payments" />
            <div className="p-4">
                <FormPayments payment={payment} />
            </div>
        </AppLayout>
    );
}
