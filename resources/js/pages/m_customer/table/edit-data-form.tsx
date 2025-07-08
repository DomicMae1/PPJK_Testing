import AppLayout from '@/layouts/app-layout';
import { Auth, type BreadcrumbItem, Ledger, MasterCustomer } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import SupplierForm from './data-form';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Master Customer',
        href: '/master-customer',
    },
    {
        title: 'Edit Customer',
        href: '#',
    },
];

export default function PaymentsEdit() {
    const { props } = usePage();
    const { customer, auth, ledger } = props as unknown as { customer: MasterCustomer; auth: Auth; ledger: Ledger };

    // console.log(usePage().props);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payments" />
            <div className="p-4">
                <SupplierForm customer={customer} auth={auth} ledger={ledger} />
            </div>
        </AppLayout>
    );
}
