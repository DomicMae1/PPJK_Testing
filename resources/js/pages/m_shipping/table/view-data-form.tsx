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

interface HsCodeItem {
    id: number;
    code: string;
    link: string | null;
    file?: File | null;
}

interface ShipmentData {
    id_spk: number;
    spkNumber: string;
    shipmentType: string;
    is_internal: boolean;
    internal_can_upload?: boolean;
    validated_by?: number;
    spkDate: string;
    type: string;
    siNumber: string;
    status: string;
    penjaluran: string | null;
    hsCodes: HsCodeItem[];
}

interface DocumentTrans {
    id: number;
    id_dokumen: number;
    id_spk: number;
    id_section: number;
    upload_by: string;
    nama_file: string;
    url_path_file?: string;
    logs: string;
    link_url_video_file?: string;
    attribute: boolean;
    created_at: string;
    master_document?: {
        id_dokumen: number;
        nama_dokumen: string;
        description_file?: string;
        link_path_example_file?: string;
        link_path_template_file?: string;
        link_url_video_file?: string;
    };
    verify?: boolean | null;
    kuota_revisi?: number;
    correction_attachment?: boolean;
    correction_description?: string;
    correction_attachment_file?: string;
    is_internal?: boolean;
    is_verification?: boolean;
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
    id_section: number;
    section_name: string;
    section_order: number;
    deadline: boolean;
    deadline_date?: string | null;
    sla?: string | null;
    documents: DocumentTrans[];
}

interface PageProps {
    customer: MasterCustomer;
    shipmentDataProp: ShipmentData;
    masterSecProp: MasterSection[];
    sectionsTransProp: SectionTrans[];
    masterDocProp: MasterDocument[];
    docsTransProp: DocumentTrans[];
    internalStaff?: any[];
    auth: {
        user: {
            role?: string;
            [key: string]: any;
        };
    };
}

export default function PaymentsEdit() {
    const { props } = usePage();
    const { customer, shipmentDataProp, masterSecProp, sectionsTransProp, masterDocProp, docsTransProp, auth, internalStaff } = props as unknown as PageProps;

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
                    userRole={auth?.user?.role}
                    internalStaff={internalStaff} // Pass to Child Component
                />
            </div>
        </AppLayout>
    );
}
