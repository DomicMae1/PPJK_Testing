<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TemplateDocumentSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            [
                'id_section' => 1, // Asumsi Section 1 (Misal: Dokumen Utama / PPJK)
                'attribute' => 1, // 1 = Mandatory/Wajib
                'nama_file' => 'Commercial Invoice',
                'url_path_file' => 'master/invoice_template_v1.pdf',
                'link_path_example_file' => 'examples/invoice_filled_sample.pdf',
                'link_path_template_file' => 'templates/invoice_editable.docx',
                'link_url_video_file' => 'https://www.youtube.com/watch?v=tutorial_invoice',
                'description_file' => 'Dokumen tagihan resmi dari eksportir kepada importir berisi detail harga dan barang.',
                'updated_by' => 1, // ID User Admin
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'id_section' => 1,
                'attribute' => 1, // 1 = Mandatory
                'nama_file' => 'Packing List',
                'url_path_file' => 'master/packing_list_v1.pdf',
                'link_path_example_file' => 'examples/packing_list_sample.pdf',
                'link_path_template_file' => 'templates/packing_list_editable.xlsx',
                'link_url_video_file' => null,
                'description_file' => 'Rincian spesifikasi barang (berat, dimensi, jumlah) dalam kemasan.',
                'updated_by' => 1,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'id_section' => 1,
                'attribute' => 1, 
                'nama_file' => 'Bill of Lading (B/L)',
                'url_path_file' => null, // Kadang tidak ada file master, cuma butuh input user
                'link_path_example_file' => 'examples/bl_sample.pdf',
                'link_path_template_file' => null,
                'link_url_video_file' => 'https://www.youtube.com/watch?v=tutorial_bl',
                'description_file' => 'Bukti tanda terima barang yang dikirimkan melalui jalur laut.',
                'updated_by' => 1,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'id_section' => 2, // Asumsi Section 2 (Misal: Perizinan Tambahan)
                'attribute' => 0, // 0 = Optional/Non-Mandatory
                'nama_file' => 'Surat Kuasa Kepabeanan',
                'url_path_file' => 'master/surat_kuasa_v2.pdf',
                'link_path_example_file' => 'examples/surat_kuasa_sample.pdf',
                'link_path_template_file' => 'templates/surat_kuasa_draft.docx',
                'link_url_video_file' => null,
                'description_file' => 'Diperlukan jika pengurusan dokumen dikuasakan ke pihak PPJK.',
                'updated_by' => 1,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'id_section' => 3, // Asumsi Section 3 (Misal: Pembayaran)
                'attribute' => 1,
                'nama_file' => 'Bukti Bayar Pajak (SSP)',
                'url_path_file' => null,
                'link_path_example_file' => 'examples/ssp_sample.jpg',
                'link_path_template_file' => null,
                'link_url_video_file' => null,
                'description_file' => 'Bukti setoran penerimaan negara (Pajak Bea Masuk/Keluar).',
                'updated_by' => 1,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ];

        // Pastikan menggunakan koneksi 'tako-user' sesuai migrasi Anda
        DB::connection('tako-user')->table('template_documents')->insert($data);
    }
}
