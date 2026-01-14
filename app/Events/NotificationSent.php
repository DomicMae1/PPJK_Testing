<?php

namespace App\Events;

use App\Models\Notification;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $notification;

    /**
     * Create a new event instance.
     */
    public function __construct(Notification $notification)
    {
        $this->notification = $notification;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        // FIXED: Use send_to (renamed from user_id) for channel routing
        // All notifications now have send_to (even role-based ones get individual records)
        if ($this->notification->send_to) {
            return [new PrivateChannel('notifications.' . $this->notification->send_to)];
        }

        // Fallback: general channel (should not happen in normal flow)
        return [new PrivateChannel('notifications.general')];
    }

    /**
     * Get the data to broadcast.
     *
     * @return array
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->notification->id_notification, // Map id_notification to 'id' for frontend
            'id_section' => $this->notification->id_section,
            'data' => $this->notification->data,  // Contains: type, title, message, url, etc.
            'created_at' => $this->notification->created_at->toISOString(),
        ];
    }

    /**
     * The event's broadcast name.
     *
     * @return string
     */
    public function broadcastAs(): string
    {
        return 'notification.sent';
    }
}
