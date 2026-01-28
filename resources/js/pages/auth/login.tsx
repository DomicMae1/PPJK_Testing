import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

interface LoginForm {
    email: string;
    password: string;
    remember: boolean;
}

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
    company?: {
        nama_perusahaan: string;
        path_company_logo?: string | null;
    } | null;
    // Props baru dari HandleInertiaRequests
    trans_auth: Record<string, string>;
    locale: string;
}

export default function Login({ status, canResetPassword, company, trans_auth, locale }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    const companyName = company?.nama_perusahaan || 'Testing';
    const companyLogo = company?.path_company_logo || null;

    return (
        <AuthLayout
            company_name={companyName}
            company_logo={companyLogo}
            // Mengambil teks langsung dari props Laravel
            app_name={trans_auth.app_name}
            title={trans_auth.title}
            description={trans_auth.description}
        >
            <Head title={trans_auth.login_button} />

            {/* --- TOMBOL GANTI BAHASA --- */}
            {/* Menggunakan Link href ke route laravel, bukan state react */}
            <div className="absolute top-4 right-4 flex gap-2">
                <a href="/lang/id" className={`text-xs font-bold ${locale === 'id' ? 'text-black underline' : 'text-gray-400'}`}>
                    ID
                </a>
                <span className="text-xs text-gray-300">|</span>
                <a href="/lang/en" className={`text-xs font-bold ${locale === 'en' ? 'text-black underline' : 'text-gray-400'}`}>
                    EN
                </a>
            </div>
            {/* --------------------------- */}

            <form className="flex flex-col gap-6" onSubmit={submit}>
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label className="flex" htmlFor="email">
                            {trans_auth.email_label}
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder={trans_auth.email_placeholder}
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor="password">{trans_auth.password_label}</Label>
                            {canResetPassword && (
                                <TextLink href={route('password.request')} className="ml-auto text-sm" tabIndex={5}>
                                    {trans_auth.forgot_password}
                                </TextLink>
                            )}
                        </div>
                        <Input
                            id="password"
                            type="password"
                            required
                            tabIndex={2}
                            autoComplete="current-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder={trans_auth.password_placeholder}
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="flex items-center space-x-3">
                        <Checkbox id="remember" name="remember" tabIndex={3} />
                        <Label htmlFor="remember">{trans_auth.remember_me}</Label>
                    </div>

                    <Button type="submit" className="mt-4 w-full" tabIndex={4} disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        {trans_auth.login_button}
                    </Button>
                </div>
            </form>

            {status && <div className="mb-4 text-center text-sm font-medium text-green-600">{status}</div>}
        </AuthLayout>
    );
}
