import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Payment } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Input } from '../ui/input';

export default function FormPayments({ payment }: { payment: Payment }) {
    const formSchema = z.object({
        email: z.string().min(2).max(50),
        status: z.string().min(2).max(50),
        amount: z
            .string()
            .min(2)
            .default('')
            .refine((val) => !isNaN(Number(val)), { message: 'Invalid price' }),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: payment?.email || '',
            amount: payment?.amount?.toString() || '',
            status: payment?.status || '',
        },
    });

    useEffect(() => {
        if (payment) {
            form.reset({
                email: payment.email,
                amount: payment.amount?.toString() || '',
                status: payment.status,
            });

            setFormattedAmount(formatNumber(payment.amount?.toString() || ''));
        }
    }, [payment, form]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const values = form.getValues();
        const formattedAmount = values.amount.replace(/\./g, '');

        if (payment?.id) {
            // Jika ada ID, lakukan update
            router.put(route('payments.update', payment.id), {
                email: values.email,
                amount: formattedAmount,
                status: values.status,
            });
        } else {
            // Jika tidak ada ID, lakukan create
            router.post(route('payments.store'), {
                email: values.email,
                amount: formattedAmount,
                status: values.status,
            });
        }
    }

    const [formattedAmount, setFormattedAmount] = useState('');

    const formatNumber = (value: string) => {
        const numberValue = value.replace(/\D/g, '');
        return new Intl.NumberFormat('id-ID').format(Number(numberValue));
    };

    const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = event.target.value.replace(/\D/g, '');
        const formattedValue = formatNumber(rawValue);
        setFormattedAmount(formattedValue);
        form.setValue('amount', rawValue);
    };

    return (
        <div className="rounded-2xl border p-4">
            <h1 className="mb-12 text-3xl font-semibold">{payment ? 'Edit Payment' : 'Create Payment Item'}</h1>
            <Form {...form}>
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-3 items-start gap-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Username</FormLabel>
                                    <FormControl>
                                        <Input placeholder="shadcn" {...field} />
                                    </FormControl>
                                    <FormDescription>This is your public display name.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">Rp.</span>
                                            <Input
                                                {...field}
                                                type="text"
                                                placeholder="Enter amount"
                                                className="w-full rounded-md border py-2 pr-4 pl-10 focus:border-blue-300 focus:ring focus:outline-none"
                                                value={formattedAmount}
                                                onChange={handleAmountChange}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormDescription>This is your public display name.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a Payment Status" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="failed">Failed</SelectItem>
                                            <SelectItem value="processing">Processing</SelectItem>
                                            <SelectItem value="success">Success</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        You can manage email addresses in your{' '}
                                        <Link href="/examples/forms" className="underline">
                                            email settings
                                        </Link>
                                        .
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <Button type="submit">Submit</Button>
                </form>
            </Form>
        </div>
    );
}
