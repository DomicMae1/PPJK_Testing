import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { BookCheck, Building2, Shield, SquareUserRound, Users } from 'lucide-react';
import AppLogo from './app-logo';

// interface ExtendedNavItem extends NavItem {
//     supervisorManagerOnly?: boolean;
// }

interface SharedProps extends PageProps {
    trans_nav: Record<string, string>;
}

export function AppSidebar() {
    const { auth, trans_nav } = usePage<SharedProps>().props;

    const mainNavItems: NavItem[] = [
        {
            title: trans_nav.shipment, // Translate
            url: '/shipping',
            icon: SquareUserRound,
        },
        {
            title: trans_nav.manage_users, // Translate
            url: '/users',
            icon: Users,
            supervisorManagerOnly: true,
        },
        {
            title: trans_nav.manage_role, // Translate
            url: '/role-manager',
            icon: Shield,
            adminOnly: true,
        },
        {
            title: trans_nav.manage_company, // Translate
            url: '/perusahaan',
            icon: Building2,
            adminOnly: true,
        },
        {
            title: trans_nav.manage_document, // Translate
            url: '/document',
            icon: BookCheck,
            supervisorManagerOnly: true,
        },
    ];

    const userRoles = auth?.user?.roles?.map((role: { name: string }) => role.name) || [];

    const isAdmin = userRoles.includes('admin');
    const isManager = userRoles.includes('manager');
    const isSupervisor = userRoles.includes('supervisor');

    const userPermissions = auth?.user?.permissions || [];

    const hasPermission = (requiredPermissions: string[] = []) => {
        return requiredPermissions.length === 0 || requiredPermissions.some((perm) => userPermissions.includes(perm));
    };

    const filteredNavItems = mainNavItems
        .map((item) => {
            if (item.adminOnly && !isAdmin) return null;

            if (item.supervisorManagerOnly) {
                if (!isAdmin && !isManager && !isSupervisor) {
                    return null;
                }
            }

            if ('subItems' in item) {
                const filteredSubItems =
                    item.subItems?.filter((subItem: NavItem & { permissions?: string[] }) => hasPermission(subItem.permissions)) || [];

                if (filteredSubItems.length > 0 || hasPermission(item.permissions)) {
                    return { ...item, subItems: filteredSubItems };
                }

                return null;
            }

            return hasPermission((item as any).permissions ?? []) ? item : null;
        })
        .filter((item): item is NavItem => item !== null);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/shipping" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={filteredNavItems} />
            </SidebarContent>

            <SidebarFooter>
                {/* <NavFooter items={footerNavItems} className="mt-auto" /> */}
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
