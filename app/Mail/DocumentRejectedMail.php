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

class DocumentRejectedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $spk;
    public $sectionName;
    public $rejector;
    public $recipient;
    public $reason;
    public $documentName;

    /**
     * Create a new message instance.
     */
    public function __construct(Spk $spk, $sectionName, User $rejector, User $recipient, $reason, $documentName)
    {
        $this->spk = $spk;
        $this->sectionName = $sectionName;
        $this->rejector = $rejector;
        $this->recipient = $recipient;
        $this->reason = $reason;
        $this->documentName = $documentName;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Dokumen Ditolak - SPK ' . $this->spk->spk_code,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.document_rejected',
            with: [
                'spk' => $this->spk,
                'sectionName' => $this->sectionName,
                'rejector' => $this->rejector,
                'recipient' => $this->recipient,
                'reason' => $this->reason,
                'documentName' => $this->documentName,
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
