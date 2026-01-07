import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Building2, Shield, SquareUserRound, Users } from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Shipment',
        url: '/shipping',
        icon: SquareUserRound,
    },
    {
        title: 'Manage Users',
        url: '/users',
        icon: Users,
        adminOnly: true,
    },
    {
        title: 'Manage Role',
        url: '/role-manager',
        icon: Shield,
        adminOnly: true,
    },
    {
        title: 'Manage Company',
        url: '/perusahaan',
        icon: Building2,
        adminOnly: true,
    },
];

// const footerNavItems: NavItem[] = [
//     {
//         title: 'Repository',
//         url: 'https://github.com/laravel/react-starter-kit',
//         icon: Folder,
//     },
//     {
//         title: 'Documentation',
//         url: 'https://laravel.com/docs/starter-kits',
//         icon: BookOpen,
//     },
// ];

export function AppSidebar() {
    const { auth } = usePage<PageProps>().props;

    const isAdmin = auth?.user?.roles?.some((role: { name: string }) => role.name === 'admin');

    const userPermissions = auth?.user?.permissions || [];

    const hasPermission = (requiredPermissions: string[] = []) => {
        return requiredPermissions.length === 0 || requiredPermissions.some((perm) => userPermissions.includes(perm));
    };

    const filteredNavItems = mainNavItems
        .map((item) => {
            // Filter jika item hanya untuk admin
            if (item.adminOnly && !isAdmin) return null;

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
