/* eslint-disable @typescript-eslint/no-explicit-any */
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, MasterCustomer } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import ViewCustomerForm from './data-form-view';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Master Shipping',
        href: '/shipping',
    },
    {
        title: 'View Shipping',
        href: '#',
    },
];

interface ShipmentData {
    id_spk: number;
    spkDate: string;
    type: string;
    siNumber: string;
    hsCodes: any[];
}

interface PageProps {
    customer: MasterCustomer;
    shipmentDataProp: ShipmentData; // Data dari Controller
}

export default function PaymentsEdit() {
    const { props } = usePage();
    const { customer, shipmentDataProp } = props as unknown as PageProps;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="View Customer" />
            <div className="p-4">
                {/* 2. PENTING: Teruskan (Pass) props ini ke Child Component */}
                <ViewCustomerForm customer={customer} shipmentDataProp={shipmentDataProp} />
            </div>
        </AppLayout>
    );
}
