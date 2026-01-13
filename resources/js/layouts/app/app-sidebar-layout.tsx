import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { type BreadcrumbItem } from '@/types';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { NotificationToastContainer } from '@/components/notifications/NotificationToastContainer';
import { usePage } from '@inertiajs/react';

export default function AppSidebarLayout({ children, breadcrumbs = [] }: { children: React.ReactNode; breadcrumbs?: BreadcrumbItem[] }) {
    const { props } = usePage();
    const user = (props as any).auth?.user;

    return (
        <NotificationProvider userId={user?.id_user} userRole={user?.role}>
            <AppShell variant="sidebar">
                <AppSidebar />
                <AppContent variant="sidebar">
                    <AppSidebarHeader breadcrumbs={breadcrumbs} />
                    {children}
                </AppContent>
            </AppShell>
            <NotificationToastContainer />
        </NotificationProvider>
    );
}
