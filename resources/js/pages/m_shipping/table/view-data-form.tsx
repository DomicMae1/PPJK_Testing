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

interface DocumentTrans {
    id: number;
    upload_by: string;
    nama_file: string;
    url_path_file?: string;
    logs: string;
    link_url_video_file?: string;
    attribute: boolean;
}

interface MasterDocument {
    id_dokumen: number;
    nama_file: string;
    description_file?: string;
    link_path_example_file?: string;
    link_path_template_file?: string;
    link_url_video_file?: string;
    attribute: boolean;
}

interface MasterSection {
    id_section: number;
    section_name: string;
    section_order: number;
    master_documents: MasterDocument[];
}

interface SectionTrans {
    id: number;
    section_name: string;
    section_order: number;
    documents_trans: DocumentTrans[];
    deadline: string;
    sla: string;
}

interface PageProps {
    customer: MasterCustomer;
    shipmentDataProp: ShipmentData;
    masterSecProp: MasterSection[];
    sectionsTransProp: SectionTrans[];
    masterDocProp: MasterDocument[];
    docsTransProp: DocumentTrans[];
    auth: {
        user: {
            role?: string;
            [key: string]: any;
        };
    };
}

export default function PaymentsEdit() {
    const { props } = usePage();
    const { customer, shipmentDataProp, masterSecProp, sectionsTransProp, masterDocProp, docsTransProp, auth } = props as unknown as PageProps;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="View Customer" />
            <div className="p-4">
                <ViewCustomerForm
                    customer={customer}
                    shipmentDataProp={shipmentDataProp}
                    masterSecProp={masterSecProp}
                    sectionsTransProp={sectionsTransProp}
                    masterDocProp={masterDocProp}
                    docsTransProp={docsTransProp}
                    userRole={auth?.user?.role}
                />
            </div>
        </AppLayout>
    );
}
