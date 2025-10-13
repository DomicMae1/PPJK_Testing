import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, MasterCustomer } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import ViewCustomerForm from './data-form-view';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Master Customer',
        href: '/customer',
    },
    {
        title: 'View Customer',
        href: '#',
    },
];

export default function PaymentsEdit() {
    const { props } = usePage();
    const { customer } = props as unknown as { customer: MasterCustomer };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="View Customer" />
            <div className="p-4">
                <ViewCustomerForm customer={customer} />
            </div>
        </AppLayout>
    );
}
