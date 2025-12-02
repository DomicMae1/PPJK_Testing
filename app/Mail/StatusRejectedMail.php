<?php

namespace App\Mail;

use App\Models\Customer;
use App\Models\CustomerAttach;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\Customers_Status;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

class StatusRejectedMail extends Mailable
{
    use Queueable, SerializesModels;

    public $status;
    public $sender;
    public $nama;

    /**
     * Create a new message instance.
     */
    public function __construct(Customers_Status $status, User $sender, Customer $nama,)
    {
        $this->nama = $nama;
        $this->status = $status;
        $this->sender = $sender;
    }

    public function build()
    {
        $email = $this->subject('Status Ditolak oleh ' . $this->sender->name)
            ->view('emails.status_rejected');

        if ($this->status->submit_3_path) {

            // Path absolut dari disk 'customers_external'
            $fullPath = Storage::disk('customers_external')->path(
                $this->status->submit_3_path
            );

            if (file_exists($fullPath)) {
                $email->attach($fullPath, [
                    'as' =>  'Document Lawyer.pdf',
                    'mime' => 'application/pdf',
                ]);
            }
        }

        $customerId = $this->status->id_Customer ?? $this->status->customer_id ?? null;

        if ($customerId) {
            $files = CustomerAttach::where('customer_id', $customerId)
                ->whereIn('type', ['npwp', 'nib', 'ktp', 'sppkp'])
                ->get();

            foreach ($files as $file) {

                $url = $file->path;

                // Ambil path mulai dari /file/view/...
                $parsed = parse_url($url, PHP_URL_PATH);

                // Buang prefix "/file/view/"
                $cleanPath = preg_replace('#^/file/view/#', '', $parsed);

                // Sekarang cleanPath = "ud-cherry/customers/xxx-npwp.pdf"
                // Ini valid untuk disk customers_external

                $realPath = Storage::disk('customers_external')->path($cleanPath);

                if (file_exists($realPath)) {
                    $email->attach($realPath, [
                        'as' => strtoupper($file->type) . '.pdf', // contoh: NPWP.pdf
                        'mime' => 'application/pdf',
                    ]);
                }
            }
        }

        return $email;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Customer ' . $this->nama->nama_personal . ' mendapatkan catatan khusus'
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.status_rejected',
        );
    }
}
