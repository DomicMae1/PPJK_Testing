<?php

namespace App\Mail;

use App\Models\Customer;
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
    public function __construct(Customers_Status $status, User $sender, Customer $nama)
    {
        $this->nama = $nama;
        $this->status = $status;
        $this->sender = $sender;
    }

    // public function build()
    // {
    //     return $this->subject('Status Ditolak oleh ' . $this->sender->name)
    //         ->view('emails.status_rejected');
    // }

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
