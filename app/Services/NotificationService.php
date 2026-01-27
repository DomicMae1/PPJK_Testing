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

            // If role is specified without user_id OR send_to, create notification for each user with that role
            if (!empty($data['role']) && empty($data['user_id']) && empty($data['send_to'])) {
                return self::sendToRole($data);
            }

            // Create single notification for specific user
            $notification = Notification::create([
                'send_to' => $data['send_to'] ?? $data['user_id'] ?? null, // Support both old and new
                'created_by' => $data['created_by'] ?? null,
                'role' => $data['role'] ?? null,
                'id_section' => $data['id_section'] ?? null,
                'id_spk' => $data['id_spk'] ?? null,
                'data' => $data['data'], // Contains: type, title, message, url, documents[], summary, etc.
            ]);

            // Broadcast notification via WebSocket
            Log::info('NotificationService: Broadcasting event for notification ' . $notification->id_notification);
            broadcast(new NotificationSent($notification));

            Log::info('NotificationService: Notification sent', [
                'id_notification' => $notification->id_notification,
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
                // Create notification for each user
                $notification = Notification::create([
                    'send_to' => $user->id_user,
                    'created_by' => $data['created_by'] ?? null,
                    'role' => $data['role'], // Keep role for reference
                    'id_section' => $data['id_section'] ?? null,
                    'id_spk' => $data['id_spk'] ?? null,
                    'data' => $data['data'], // Contains: type, title, message, url, documents[], summary, etc.
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
            $notification = Notification::where('id_notification', $notificationId) // FIX: Use id_notification
                ->where('send_to', $userId) // UPDATED: use send_to
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
            // Use send_to column
            return Notification::unread()
                ->where('send_to', $userId)
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
            // Use send_to column and update relationships to use recipient
            return Notification::with(['spk', 'recipient', 'creator'])
                ->where('send_to', $userId)
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

    /*
    |--------------------------------------------------------------------------
    | Document Notification Helpers
    |--------------------------------------------------------------------------
    */

    /**
     * Format notification message based on document statuses
     * 
     * @param array $documents Array of documents with status
     * @return array ['message' => string, 'summary' => array]
     */
    public static function formatDocumentMessage(array $documents): array
    {
        $total = count($documents);
        
        // Count by status
        $statuses = array_count_values(array_column($documents, 'status'));
        $verified = $statuses['verified'] ?? 0;
        $pending = $statuses['pending_verification'] ?? $statuses['pending'] ?? 0;
        $rejected = $statuses['rejected'] ?? 0;
        
        // Generate smart message based on statuses
        if ($rejected > 0) {
            $message = "{$rejected} document(s) rejected, need re-upload";
        } elseif ($pending > 0) {
            $message = "{$pending} document(s) awaiting verification";
        } elseif ($verified > 0 && $verified === $total) {
            $message = "All {$total} document(s) verified successfully";
        } else {
            $message = "{$total} document(s) uploaded";
        }
        
        return [
            'message' => $message,
            'summary' => [
                'total' => $total,
                'verified' => $verified,
                'pending' => $pending,
                'rejected' => $rejected,
            ]
        ];
    }

    /**
     * Send document notification (upload/verification/rejection)
     * Auto-formats message based on document statuses
     * 
     * @param array $params {
     *   'send_to': int - User ID who receives notification
     *   'created_by': int - User ID who triggered notification
     *   'id_section': int - Section ID
     *   'id_spk': int - SPK ID
     *   'type': string - Notification type (document_upload, document_verification, document_rejected)
     *   'title': string (optional) - Custom title
     *   'url': string (optional) - Custom URL
     *   'documents': array - Array of documents with status
     * }
     * @return Notification|null
     */
    public static function sendDocumentNotification(array $params): ?Notification
    {
        // Validate required params
        if (empty($params['send_to']) || empty($params['documents'])) {
            Log::error('NotificationService: Missing required params for document notification', $params);
            return null;
        }

        // Auto-format message based on document statuses
        $formatted = self::formatDocumentMessage($params['documents']);
        
        // Default titles by type
        $defaultTitles = [
            'document_upload' => 'Document Upload Notification',
            'document_verification' => 'Document Verification Update',
            'document_rejected' => 'Document Rejection Notice',
        ];
        
        $type = $params['type'] ?? 'document_upload';
        $title = $params['title'] ?? ($defaultTitles[$type] ?? 'Document Notification');
        
        // Build notification data
        return self::send([
            'send_to' => $params['send_to'],
            'created_by' => $params['created_by'] ?? null,
            'role' => $params['role'] ?? null,
            'id_section' => $params['id_section'] ?? null,
            'id_spk' => $params['id_spk'] ?? null,
            'data' => [
                'type' => $type,
                'title' => $title,
                'message' => $formatted['message'],
                'url' => $params['url'] ?? ($params['id_spk'] ? "/shipping/{$params['id_spk']}" . ($params['id_section'] ? "#section-{$params['id_section']}" : '') : null),
                'documents' => $params['documents'],
                'summary' => $formatted['summary'],
            ]
        ]);
    }
}
