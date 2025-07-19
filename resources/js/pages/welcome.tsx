import { type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;

    // Redirect to /login when component mounts
    useEffect(() => {
        router.visit('/login');
    }, []);

    return (
        <>
            <Head title="Redirecting..." />
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting to login...</p>
            </div>
        </>
    );
}
