<?php

namespace App\Http\Controllers;

use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    /**
     * Initialize tenant context based on logged user's perusahaan
     */
    private function initializeTenant()
    {
        $user = auth('web')->user();
        
        if ($user && $user->id_perusahaan) {
            $tenant = \App\Models\Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
            if ($tenant) {
                tenancy()->initialize($tenant);
            }
        }
    }
    
    /**
     * Get user notifications (paginated)
     */
    public function index(Request $request)
    {
        $this->initializeTenant();
        $user = auth('web')->user();
        $limit = $request->input('limit', 20);
        
        // Fetch notifications by user_id only (no role needed)
        $notifications = NotificationService::getUserNotifications(
            $user->id_user,
            $limit
        );

        return response()->json([
            'success' => true,
            'notifications' => $notifications,
        ]);
    }

    /**
     * Get unread count
     */
    public function unreadCount(Request $request)
    {
        $this->initializeTenant();
        $user = auth('web')->user();
        
        // Count unread by user_id only (no role needed)
        $count = NotificationService::getUnreadCount($user->id_user);

        return response()->json([
            'success' => true,
            'count' => $count,
        ]);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(Request $request, $id)
    {
        $this->initializeTenant();
        $user = auth('web')->user();
        
        $success = NotificationService::markAsRead($id, $user->id_user);

        if ($success) {
            return response()->json([
                'success' => true,
                'message' => 'Notification marked as read',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Failed to mark notification as read',
        ], 400);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request)
    {
        $this->initializeTenant();
        $user = auth('web')->user();
        
        $count = NotificationService::markAllAsRead($user->id_user);

        return response()->json([
            'success' => true,
            'message' => "{$count} notifications marked as read",
            'count' => $count,
        ]);
    }
}
