import { useNotifications } from '@/contexts/NotificationContext';
import axios from 'axios';
import { Bell } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface Notification {
    id: number;
    id_section?: number;
    data: {
        type: string;
        title: string;
        message: string;
        url?: string;
        [key: string]: any;
    };
    read_at: string | null;
    created_at: string;
}

export const NotificationBell: React.FC = () => {
    const { unreadCount, fetchUnreadCount, markAsRead: markAsReadContext } = useNotifications();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch notifications
    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/notifications?limit=10');
            if (response.data.success) {
                setNotifications(response.data.notifications);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Mark as read
    const markAsRead = async (id: number) => {
        // Call context method to update count and hit API
        await markAsReadContext(id);

        // Update local notifications list for dropdown UI
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            await axios.post('/notifications/read-all');
            setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
            // Context will handle count update via fetchUnreadCount
            await fetchUnreadCount();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Fetch unread count on mount
    useEffect(() => {
        fetchUnreadCount();
    }, []);

    // Fetch notifications when dropdown opens
    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    // Handle notification click: mark as read (if unread) + redirect to URL
    const handleNotificationClick = async (notification: Notification) => {
        const url = notification.data?.url;

        // If notification is unread, mark as read first
        if (!notification.read_at) {
            await markAsRead(notification.id);
        } else {
            console.log('Already read, skipping mark as read');
        }

        // Redirect to URL if available
        if (url) {
            window.location.href = url;
        } else {
            console.log('No URL available in notification data');
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon Button */}
            <button
                onClick={toggleDropdown}
                className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-12 right-0 z-50 w-80 rounded-lg border border-gray-200 bg-white shadow-lg sm:w-96 dark:border-gray-700 dark:bg-gray-800">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500">No notifications</div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`cursor-pointer border-b border-gray-100 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50 ${!notification.read_at ? 'bg-blue-50 dark:bg-blue-900/20' : ''} `}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">{notification.data.title}</h4>
                                            <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{notification.data.message}</p>
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatTime(notification.created_at)}</p>
                                        </div>
                                        {!notification.read_at && <div className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-600"></div>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
