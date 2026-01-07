import AppLayout from '@/layouts/app-layout';
import { Auth, type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import CustomerForm from './data-form';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Master Customer',
        href: '/shipping',
    },
    {
        title: 'Create Customer',
        href: '#',
    },
];

export default function CreateSupplier() {
    const { props } = usePage();
    const { auth } = props as unknown as { auth: Auth };
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Customer" />
            <div className="p-4">
                <CustomerForm auth={auth} />
            </div>
        </AppLayout>
    );
}
