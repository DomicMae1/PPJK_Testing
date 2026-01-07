import AppLayout from '@/layouts/app-layout';
import { Attachment, Auth, type BreadcrumbItem, MasterCustomer } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import CustomerForm from './data-form';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Master Customer',
        href: '/customer',
    },
    {
        title: 'Edit Customer',
        href: '#',
    },
];

export default function EditCustomer() {
    const { props } = usePage();
    const { customer, auth, attachments } = props as unknown as { customer: MasterCustomer; auth: Auth; attachments: Attachment };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Customer" />
            <div className="p-4">
                <CustomerForm customer={customer} auth={auth} attachment={attachments} />
            </div>
        </AppLayout>
    );
}
