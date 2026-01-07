/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSidebar } from '@/components/ui/sidebar';
import { usePage } from '@inertiajs/react';
import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    const { company } = usePage<any>().props; // tambahkan <any> atau tipe yang sesuai
    const { open } = useSidebar();

    const companyName = company?.name ?? 'PPJK';
    const companyLogo = company?.logo ?? null;

    return (
        <>
            {/* CONTAINER ICON/LOGO */}
            <div className="text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:bg-white">
                {companyLogo ? (
                    <img
                        src={companyLogo}
                        alt={companyName}
                        className="h-full w-full object-contain p-1" // object-contain agar logo tidak gepeng/terpotong
                    />
                ) : (
                    <AppLogoIcon className="size-5 fill-current text-white" />
                )}
            </div>

            {/* CONTAINER TEXT (Nama Perusahaan) */}
            {open && (
                <div className="ml-2 grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{companyName}</span>
                    {/* Opsional: Tambahkan subtext jika perlu, misal: 'Dashboard' */}
                    {/* <span className="truncate text-xs text-muted-foreground">Enterprise</span> */}
                </div>
            )}
        </>
    );
}
