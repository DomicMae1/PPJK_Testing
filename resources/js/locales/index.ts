export type Language = 'id' | 'en';

export const translations = {
    id: {
        pilihKolom: 'Pilih Kolom',
        ownership: 'Ownership',
        disubmitOleh: 'Disubmit Oleh',
        namaCustomer: 'Nama Customer',
        keteranganStatus: 'Keterangan Status',
        statusReview: 'Status Review',

        pilihStatus: 'Pilih Status',
        diinput: 'Diinput',
        disubmit: 'Disubmit',
        diverifikasi: 'Diverifikasi',
        diketahui: 'Diketahui',
        direview: 'Direview',

        pilihReviewStatus: 'Pilih Review Status',
        approved: 'Aman',
        rejected: 'Bermasalah',

        typingKeyword: 'Ketik kata kunci...',
        reset: 'Reset',

        filterStatus: 'Filter status',
        semua: 'Semua',
        sudah: 'Sudah Mengetahui',
        belum: 'Belum Mengetahui',

        bahasa: 'Bahasa',
        indonesia: 'Indonesia',
        english: 'Inggris',
    },
    en: {
        pilihKolom: 'Select Column',
        ownership: 'Ownership',
        disubmitOleh: 'Submitted By',
        namaCustomer: 'Customer Name',
        keteranganStatus: 'Status Description',
        statusReview: 'Review Status',

        pilihStatus: 'Select Status',
        diinput: 'Inputted',
        disubmit: 'Submitted',
        diverifikasi: 'Verified',
        diketahui: 'Acknowledged',
        direview: 'Reviewed',

        pilihReviewStatus: 'Select Review Status',
        approved: 'Safe',
        rejected: 'Problematic',

        typingKeyword: 'Type keyword...',
        reset: 'Reset',

        filterStatus: 'Status Filter',
        semua: 'All',
        sudah: 'Already Acknowledged',
        belum: 'Not Yet Acknowledged',

        bahasa: 'Language',
        indonesia: 'Indonesian',
        english: 'English',
    },
} as const;

export type TranslationKey = keyof typeof translations.id;
