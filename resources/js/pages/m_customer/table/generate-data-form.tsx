import AppLayout from '@/layouts/app-layout';
import { Auth, type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import CustomerFormGenerate from './data-public-form';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Master Customer',
        href: '/master-customer',
    },
    {
        title: 'Generate Form',
        href: '#',
    },
];

export default function GenerateData() {
    const { props } = usePage();
    const { auth } = props as unknown as { auth: Auth };
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Generate Form" />
            <div className="p-4">
                <CustomerFormGenerate auth={auth} />
            </div>
        </AppLayout>
    );
}
