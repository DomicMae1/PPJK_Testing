import React, { useState, useEffect } from 'react';
import { NotificationToast } from './NotificationToast';
import { useNotifications } from '@/contexts/NotificationContext';

export const NotificationToastContainer: React.FC = () => {
    const { notifications: contextNotifications } = useNotifications();
    const [toasts, setToasts] = useState<any[]>([]);

    // Listen to new notifications from context
    useEffect(() => {
        if (contextNotifications.length > 0) {
            const latestNotification = contextNotifications[0];

            // Check if this notification is already shown as toast
            const alreadyShown = toasts.some(t => t.id === latestNotification.id);

            if (!alreadyShown) {
                setToasts(prev => [...prev, latestNotification]);

                // Auto-remove toast after 10 seconds
                setTimeout(() => {
                    setToasts(prev => prev.filter(t => t.id !== latestNotification.id));
                }, 10000);
            }
        }
    }, [contextNotifications]);

    const handleClose = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <div className="fixed right-0 top-0 z-50 flex flex-col gap-2 p-4 pointer-events-none">
            {toasts.map((toast, index) => (
                <div
                    key={toast.id}
                    className="pointer-events-auto"
                    style={{
                        transform: `translateY(${index * 100}px)`
                    }}
                >
                    <NotificationToast
                        id={toast.id}
                        data={toast.data}
                        onClose={() => handleClose(toast.id)}
                    />
                </div>
            ))}
        </div>
    );
};
