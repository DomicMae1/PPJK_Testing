<?php

use Illuminate\Support\Facades\Broadcast;

/**
 * WebSocket Channel Authorization
 * Defines who can subscribe to private channels
 */

// Notification channel: User-specific notifications
// Each user can only subscribe to their own notification channel
Broadcast::channel('notifications.{userId}', function ($user, $userId) {
    return (int) $user->id_user === (int) $userId;
});

// Shipping channel: For realtime updates on shipping detail page
Broadcast::channel('shipping.{spkId}', function ($user, $spkId) {
    // Ideally check policy: return $user->can('view', Spk::find($spkId));
    // For now, allow logged in users who can access the page
    return true; 
});
