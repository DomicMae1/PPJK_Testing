import { Head, usePage } from '@inertiajs/react';

import AppearanceTabs from '@/components/appearance-tabs';
import HeadingSmall from '@/components/heading-small';
import { type BreadcrumbItem } from '@/types';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

export default function Appearance() {
    const { props } = usePage();
    const trans = props.trans_general as Record<string, string>;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: trans.appearance_settings, // Translate Breadcrumb
            href: '/settings/appearance',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            {/* Translate Head Title */}
            <Head title={trans.appearance_settings} />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title={trans.appearance_settings} description={trans.appearance_desc} />
                    <AppearanceTabs />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
