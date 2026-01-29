<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Authentication Language Lines
    |--------------------------------------------------------------------------
    |
    | The following language lines are used during authentication for various
    | messages that we need to display to the user. You are free to modify
    | these language lines according to your application's requirements.
    |
    */

    'failed'   => 'Identitas tersebut tidak cocok dengan data kami.',
    'password' => 'Kata sandi yang dimasukkan salah.',
    'throttle' => 'Terlalu banyak upaya masuk. Silakan coba lagi dalam :seconds detik.',
    
    // --- LOGIN PAGE ---
    'title' => 'Masuk ke akun Anda',
    'description' => 'Masukkan email dan kata sandi di bawah ini untuk masuk',
    'email_label' => 'Alamat Email',
    'email_placeholder' => 'email@contoh.com',
    'password_label' => 'Kata Sandi',
    'password_placeholder' => 'Kata Sandi',
    'remember_me' => 'Ingat saya',
    'forgot_password' => 'Lupa kata sandi?',
    'login_button' => 'Masuk',
    'app_name' => 'PPJK Tracking',

    // --- MANAGE USERS PAGE (General) ---
    'page_title_manage' => 'Kelola Pengguna',
    'filter_placeholder' => 'Filter pengguna...',
    'add_button' => 'Tambah Pengguna',
    'no_results' => 'Tidak ada hasil.',

    // --- MANAGE USERS (Create Dialog) ---
    'title_create' => 'Tambah Pengguna',
    'desc_create' => 'Isi detail untuk membuat pengguna baru.',
    
    // Form Labels & Placeholders (Create & Edit)
    'label_name' => 'Nama',
    'placeholder_name' => 'Masukkan nama',
    'label_email' => 'Email',
    'placeholder_email' => 'Masukkan email',
    'label_password' => 'Kata Sandi', // Reused from login if needed, or distinct
    'placeholder_password' => 'Masukkan kata sandi',
    'label_password_confirm' => 'Konfirmasi Kata Sandi',
    'placeholder_password_confirm' => 'Ulangi kata sandi',
    
    'label_company' => 'Perusahaan',
    'placeholder_company' => 'Pilih perusahaan',
    'no_data_company' => 'Tidak ada data perusahaan',
    
    'label_user_type' => 'Tipe User',
    'placeholder_user_type' => 'Pilih tipe user',
    'type_internal' => 'Internal',
    'type_external' => 'Eksternal',
    
    'label_role_internal' => 'Role Internal',
    'placeholder_role_internal' => 'Pilih role',
    
    'label_customer' => 'Customer',
    'placeholder_customer' => 'Pilih Customer',
    'no_data_customer' => 'Tidak ada data customer',
    
    'btn_create' => 'Buat',
    'btn_cancel' => 'Batal',

    // --- MANAGE USERS (Delete Dialog) ---
    'title_delete' => 'Hapus Data',
    'text_delete_confirm' => 'Data :email akan dihapus. Apakah Anda yakin?',
    'btn_delete' => 'Hapus',
    'btn_close'  => 'Tutup',

    // Table Headers & Actions
    'header_roles'   => 'Role',
    'header_actions' => 'Aksi',
    'btn_edit'       => 'Ubah',

    // --- MANAGE USERS (Edit Dialog) ---
    'title_edit' => 'Ubah Pengguna',
    'desc_edit'  => 'Perbarui detail pengguna.',
    'text_external_info' => 'User ini adalah Eksternal (Customer). Tidak perlu memilih role.',
    'btn_save'   => 'Simpan Perubahan',

    // --- TOASTS & VALIDATIONS ---
    'toast_delete_success' => 'User berhasil dihapus!',
    'toast_delete_error'   => 'Gagal menghapus user.',
    'toast_update_success' => 'User berhasil diperbarui!',
    'toast_update_error'   => 'Gagal memperbarui user.',
    'error_create'         => 'Gagal membuat user.',

    // Validation Messages
    'validation_name_email_required' => 'Nama dan Email wajib diisi.',
    'validation_required' => 'Harap isi semua kolom teks (Nama, Email, Password).',
    'validation_password_mismatch' => 'Password dan konfirmasi password tidak cocok.',
    'validation_company_required' => 'Harap pilih Perusahaan.',
    'validation_type_required' => 'Harap pilih Tipe User (Internal / Eksternal).',
    'validation_role_internal_required' => 'Role wajib dipilih untuk user Internal.', // Used in Edit
    'validation_role_required' => 'Harap pilih Role Internal.', // Used in Create
    'validation_customer_required' => 'Harap pilih Customer untuk user Eksternal.',

    // Pagination
    'pagination_selected_rows' => ':selected dari :total baris dipilih.',
    'pagination_rows_per_page' => 'Baris per halaman',
    'pagination_page_of'       => 'Halaman :page dari :total',
    'pagination_first'         => 'Ke halaman pertama',
    'pagination_prev'          => 'Ke halaman sebelumnya',
    'pagination_next'          => 'Ke halaman selanjutnya',
    'pagination_last'          => 'Ke halaman terakhir',
];
