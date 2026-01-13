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
        // Since all notifications now have user_id (even role-based ones),
        // we only broadcast to the user-specific channel
        if ($this->notification->user_id) {
            return [new PrivateChannel('notifications.' . $this->notification->user_id)];
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
            'id' => $this->notification->id,
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
