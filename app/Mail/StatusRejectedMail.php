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
            $path = storage_path('app/public/' . $this->status->submit_3_path);

            if (file_exists($path)) {
                $email->attach($path, [
                    'as' => $this->status->submit_3_nama_file ?? 'document.pdf',
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
                $filePathUrl = $file->path;

                $parsedPath = parse_url($filePathUrl, PHP_URL_PATH);
                $relativePath = str_replace('/storage/', '', $parsedPath);
                $localPath = storage_path('app/public/' . $relativePath);

                if (file_exists($localPath)) {
                    $filename = ($file->type ?? 'lampiran') . '_' . ($file->nama_file ?? 'file.pdf');

                    $email->attach($localPath, [
                        'as' => $filename ?: 'file_customer.pdf', 
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
