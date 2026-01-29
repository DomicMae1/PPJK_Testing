import axios from 'axios';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface DocumentItem {
    id_dokumen: number;
    id_document_trans?: number;
    nama_file: string;
    status: 'pending_verification' | 'pending' | 'verified' | 'rejected' | 'uploaded';
    uploaded_at?: string;
    uploaded_by?: number;
    verified_at?: string;
    verified_by?: number;
    rejected_at?: string;
    rejection_reason?: string;
}

interface NotificationData {
    id: number;
    id_section?: number;
    data: {
        type: string;
        title: string;
        message: string;
        url?: string;
        documents?: DocumentItem[]; // NEW: Array of documents
        summary?: {
            total: number;
            pending: number;
            verified: number;
            rejected: number;
        };
        [key: string]: any;
    };
    created_at: string;
}

interface NotificationContextType {
    notifications: NotificationData[];
    unreadCount: number;
    addNotification: (notification: NotificationData) => void;
    removeNotification: (id: number) => void;
    markAsRead: (id: number) => void;
    markAllAsRead: () => void;
    fetchNotifications: () => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};

interface NotificationProviderProps {
    children: ReactNode;
    userId: number;
    userRole?: string;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children, userId, userRole }) => {
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch notifications from API
    const fetchNotifications = async () => {
        try {
            const response = await axios.get('/notifications?limit=10');
            if (response.data.success) {
                setNotifications(response.data.notifications);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    // Fetch unread count
    const fetchUnreadCount = async () => {
        try {
            const response = await axios.get('/notifications/unread-count');
            if (response.data.success) {
                setUnreadCount(response.data.count);
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    };

    // Add notification (from WebSocket or manual)
    const addNotification = (notification: NotificationData) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
    };

    // Remove notification
    const removeNotification = (id: number) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    // Mark as read
    const markAsRead = async (id: number) => {
        try {
            await axios.post(`/notifications/${id}/read`);
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            await axios.post('/notifications/read-all');
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    // Subscribe to WebSocket channels using global Echo
    useEffect(() => {
        if (!userId || typeof window === 'undefined' || !(window as any).Echo) {
            console.warn('Echo not available or userId missing');
            return;
        }

        try {
            const Echo = (window as any).Echo;

            // Subscribe to user-specific channel only
            // (Role-based notifications are now sent to individual user channels)
            const userChannelName = `notifications.${userId}`;
            Echo.private(userChannelName)
                .listen('.notification.sent', (data: NotificationData) => {
                    addNotification(data);
                })
                .listen('.notification.removed', (data: { id_spk: number }) => {
                    // Remove singular or multiple notifications matching this SPK
                    setNotifications((prev) => prev.filter((n) => n.data?.id_spk !== data.id_spk));
                    // Fetch fresh count to be accurate
                    fetchUnreadCount();
                });

            // Cleanup on unmount
            return () => {
                Echo.leave(userChannelName);
            };
        } catch (error) {
            console.error('Failed to subscribe to notification channels:', error);
        }
    }, [userId, userRole]);

    // Fetch initial data
    useEffect(() => {
        fetchUnreadCount();
    }, []);

    const value: NotificationContextType = {
        notifications,
        unreadCount,
        addNotification,
        removeNotification,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
        fetchUnreadCount,
    };

    return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
