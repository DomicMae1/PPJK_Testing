import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, Ledger, MasterCustomer } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import SupplierForm from './data-form-view';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Master Customer',
        href: '/master-customer',
    },
    {
        title: 'View Customer',
        href: '#',
    },
];

export default function PaymentsEdit() {
    const { props } = usePage();
    const { customer, ledger } = props as unknown as { customer: MasterCustomer; ledger: Ledger };

    // console.log(usePage().props);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="View Customer" />
            <div className="p-4">
                <SupplierForm customer={customer} ledger={ledger} />
            </div>
        </AppLayout>
    );
}
