import { Breadcrumbs } from '@/components/breadcrumbs';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { usePage } from '@inertiajs/react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { props } = usePage();
    const currentLocale = props.locale as string;
    return (
        <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex w-full items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
                <div className="flex items-center gap-4">
                    {/* --- LANGUAGE SWITCHER --- */}
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <a
                            href="/lang/id"
                            className={`transition-colors hover:text-black ${
                                currentLocale === 'id' ? 'font-bold text-black underline' : 'text-gray-400'
                            }`}
                        >
                            ID
                        </a>
                        <span className="text-gray-300">|</span>
                        <a
                            href="/lang/en"
                            className={`transition-colors hover:text-black ${
                                currentLocale === 'en' ? 'font-bold text-black underline' : 'text-gray-400'
                            }`}
                        >
                            EN
                        </a>
                    </div>

                    <NotificationBell />
                </div>
            </div>
        </header>
    );
}
