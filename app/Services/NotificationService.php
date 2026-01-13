<?php

namespace App\Services;

use App\Models\Notification;
use App\Events\NotificationSent;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Send notification to user(s) or role
     * 
     * @param array $data - Expected structure:
     *   - id_section (optional): Section ID
     *   - id_spk (optional): SPK ID
     *   - id_document (optional): Document ID
     *   - user_id (optional): Specific user, if not provided with role, will send to all users with role
     *   - role (optional): Role for broadcast
     *   - data (required): Array containing type, title, message, url, etc.
     * @return Notification|array|null
     */
    public static function send(array $data)
    {
        try {
            // Validate required fields (now in data array)
            if (empty($data['data']) || 
                empty($data['data']['type']) || 
                empty($data['data']['title']) || 
                empty($data['data']['message'])) {
                Log::error('NotificationService: Missing required fields in data', $data);
                return null;
            }

            // If role is specified without user_id, create notification for each user with that role
            if (!empty($data['role']) && empty($data['user_id'])) {
                return self::sendToRole($data);
            }

            // Create single notification for specific user
            $notification = Notification::create([
                'user_id' => $data['user_id'] ?? null,
                'role' => $data['role'] ?? null,
                'id_section' => $data['id_section'] ?? null,
                'id_spk' => $data['id_spk'] ?? null,
                'id_document' => $data['id_document'] ?? null,
                'data' => $data['data'], // Contains: type, title, message, url, etc.
            ]);

            // Broadcast notification via WebSocket
            Log::info('NotificationService: Broadcasting event for notification ' . $notification->id);
            broadcast(new NotificationSent($notification));

            Log::info('NotificationService: Notification sent', [
                'id' => $notification->id,
                'type' => $notification->data['type'] ?? null,
                'user_id' => $notification->user_id,
                'role' => $notification->role,
                'connection' => $notification->getConnectionName(),
            ]);

            return $notification;

        } catch (\Throwable $e) {
            Log::error('NotificationService: Failed to send notification', [
                'error' => $e->getMessage(),
                'data' => $data,
            ]);
            return null;
        }
    }

    /**
     * Send notification to all users with a specific role
     * Creates individual notification for each user to maintain independent read state
     * 
     * @param array $data
     * @return array
     */
    private static function sendToRole(array $data): array
    {
        $notifications = [];
        
        // Get current tenant
        $tenant = tenancy()->tenant;
        if (!$tenant) {
            Log::error('NotificationService: No active tenant for role notification');
            return [];
        }
        
        // Find all users with this role in the same perusahaan
        $users = \App\Models\User::on('tako-user') // Use central DB connection
            ->where('id_perusahaan', $tenant->perusahaan_id)
            ->where('role', $data['role'])
            ->get();
        
        if ($users->isEmpty()) {
            Log::warning("NotificationService: No users found with role {$data['role']} in perusahaan {$tenant->perusahaan_id}");
            return [];
        }
        
        foreach ($users as $user) {
            try {
                // Create notification for each user
                $notification = Notification::create([
                    'user_id' => $user->id_user, // Set specific user_id for independent read state
                    'role' => $data['role'], // Keep role for reference
                    'id_section' => $data['id_section'] ?? null,
                    'id_spk' => $data['id_spk'] ?? null,
                    'id_document' => $data['id_document'] ?? null,
                    'data' => $data['data'], // Contains: type, title, message, url, etc.
                ]);
                
                // Broadcast to each user
                broadcast(new NotificationSent($notification));
                
                $notifications[] = $notification;
                
            } catch (\Throwable $e) {
                Log::error('NotificationService: Failed to create notification for user', [
                    'user_id' => $user->id_user,
                    'role' => $data['role'],
                    'error' => $e->getMessage(),
                ]);
            }
        }
        
        Log::info("NotificationService: Sent {$data['data']['type']} to " . count($notifications) . " users with role {$data['role']}");
        
        return $notifications;
    }

    /**
     * Mark notification as read
     * 
     * @param int $notificationId
     * @param int $userId
     * @return bool
     */
    public static function markAsRead(int $notificationId, int $userId): bool
    {
        try {
            $notification = Notification::where('id', $notificationId)
                ->where('user_id', $userId)
                ->first();

            if (!$notification) {
                return false;
            }

            $notification->markAsRead();
            return true;

        } catch (\Throwable $e) {
            Log::error('NotificationService: Failed to mark as read', [
                'notification_id' => $notificationId,
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Mark all notifications as read for a user
     * 
     * @param int $userId
     * @return int Number of notifications marked as read
     */
    public static function markAllAsRead(int $userId): int
    {
        try {
            return Notification::forUser($userId)
                ->unread()
                ->update(['read_at' => now()]);

        } catch (\Throwable $e) {
            Log::error('NotificationService: Failed to mark all as read', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
            return 0;
        }
    }

    /**
     * Get unread count for a user
     * 
     * @param int $userId
     * @return int
     */
    public static function getUnreadCount(int $userId): int
    {
        try {
            // Simple query: all notifications have user_id now
            return Notification::unread()
                ->where('user_id', $userId)
                ->count();

        } catch (\Throwable $e) {
            Log::error('NotificationService: Failed to get unread count', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
            return 0;
        }
    }

    /**
     * Get user notifications
     * 
     * @param int $userId
     * @param int $limit
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public static function getUserNotifications(int $userId, int $limit = 10)
    {
        try {
            // Simple query: all notifications have user_id now
            return Notification::with(['spk', 'document'])
                ->where('user_id', $userId)
                ->latest()
                ->limit($limit)
                ->get();

        } catch (\Throwable $e) {
            Log::error('NotificationService: Failed to get user notifications', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
            return collect();
        }
    }
}
