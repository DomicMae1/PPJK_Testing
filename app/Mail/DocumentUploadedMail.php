<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\Spk;
use App\Models\User;

class DocumentUploadedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $spk;
    public $sectionName;
    public $uploader;
    public $recipient;

    /**
     * Create a new message instance.
     */
    public function __construct(Spk $spk, $sectionName, User $uploader, User $recipient)
    {
        $this->spk = $spk;
        $this->sectionName = $sectionName;
        $this->uploader = $uploader;
        $this->recipient = $recipient;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Notifikasi Dokumen Diupload - SPK ' . $this->spk->spk_code,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.document_uploaded',
            with: [
                'spk' => $this->spk,
                'sectionName' => $this->sectionName,
                'uploader' => $this->uploader,
                'recipient' => $this->recipient,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
