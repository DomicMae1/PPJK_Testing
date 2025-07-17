import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

export interface Role {
    id: number;
    name: string;
    permissions: Permission[];
}

export interface Permission {
    id: number;
    name: string;
}

export type Payment = {
    id: string;
    amount: number;
    status: string | 'pending' | 'failed' | 'processing' | 'success';
    email: string;
};

export type MasterCustomer = {
    id: number | null;
    kategori_usaha: string;
    nama_perusahaan: string;
    bentuk_badan_usaha: string;
    alamat_lengkap: string;
    kota: string;
    no_telp: number | null | string;
    no_fax: number | null | string;
    alamat_penagihan: string;
    email: string;
    website: string;
    top: string;
    status_perpajakan: string;
    no_npwp: string | null;
    no_npwp_16: string | null;
    nama_pj: string;
    no_ktp_pj: string;
    no_telp_pj: string;
    nama_personal: string;
    jabatan_personal: string;
    no_telp_personal: string;
    email_personal: string;
    keterangan_reject: string | null;
    user_id: number;
    approved_1_by: number | null;
    approved_2_by: number | null;
    rejected_1_by: number | null;
    rejected_2_by: number | null;
    keterangan: string | null;
    tgl_approval_1: Date | null;
    tgl_approval_2: Date | null;
    tgl_customer: Date | null;
    attachments: Attachment[];
};

export type Attachment = {
    id: number;
    customer_id: number;
    nama_file: string;
    path: string;
    type: 'npwp' | 'nib' | 'sppkp' | 'ktp' | 'note';
};

export type DropzoneFileStatus = {
  id: string;
  fileName: string;
  file: File;
  tries: number;
  status: 'success';
  result: string;
};
