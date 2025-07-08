import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Ledger, MasterCustomer } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

export default function SupplierForm({ ledger, customer, onSuccess }: { ledger: Ledger; customer: MasterCustomer; onSuccess?: () => void }) {
    const { data, setData } = useForm({
        nama_cust: customer?.nama_cust || '',
        alamat_npwp: customer?.alamat_npwp || '',
        alamat_penagihan: customer?.alamat_penagihan || '',
        no_npwp: customer?.no_npwp || '',
        nama_pic: customer?.nama_pic || '',
        no_telp_pic: customer?.no_telp_pic || '',
        pph_info: customer?.pph_info ? 'true' : 'false', // Tetap string
        ledger_id: customer?.ledger_id ? String(customer.ledger_id) : '',
    });

    const { errors } = usePage().props;

    const [open, setOpen] = useState(false);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (customer?.id) {
            // Update data
            router.put(route('master-customer.update', customer.id), data, {
                onSuccess: () => {
                    if (onSuccess) onSuccess(); // Panggil callback untuk menutup dialog
                },
                onError: (serverErrors) => {
                    console.log('Update error:', serverErrors); // Log error untuk debugging
                },
            });
        } else {
            // Create data
            router.post(route('master-customer.store'), data, {
                onSuccess: () => {
                    if (onSuccess) onSuccess();
                },
                onError: (serverErrors) => {
                    console.log('Create error:', serverErrors);
                },
            });
        }
    }

    return (
        <div className="rounded-2xl border p-4">
            <h1 className="mb-4 text-3xl font-semibold">{customer ? 'View Customer' : 'Create Customer'}</h1>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <Label htmlFor="no_npwp">Nomor NPWP</Label>
                        <Input
                            id="no_npwp"
                            value={data.no_npwp}
                            onChange={(e) => setData('no_npwp', e.target.value)}
                            placeholder="Enter Nomor NPWP"
                            disabled
                        />
                        {errors.no_npwp && <div className="mt-1 text-sm text-red-500">{errors.no_npwp}</div>}
                    </div>
                    <div>
                        <Label htmlFor="nama_cust">Nama Customer</Label>
                        <Input
                            id="nama_cust"
                            value={data.nama_cust}
                            onChange={(e) => setData('nama_cust', e.target.value)}
                            placeholder="Enter nama customer"
                            disabled
                        />
                        {errors.nama_cust && <div className="mt-1 text-sm text-red-500">{errors.nama_cust}</div>}
                    </div>
                    <div className="col-span-3 flex gap-4">
                        <div className="w-full">
                            <Label htmlFor="alamat_npwp">Alamat NPWP</Label>
                            <Textarea
                                id="alamat_npwp"
                                value={data.alamat_npwp}
                                onChange={(e) => setData('alamat_npwp', e.target.value)}
                                placeholder="Enter alamat NPWP"
                                className="h-32"
                                disabled
                            />
                            {errors.alamat_npwp && <div className="mt-1 text-sm text-red-500">{errors.alamat_npwp}</div>}
                        </div>
                        <div className="w-full">
                            <Label htmlFor="alamat_penagihan">Alamat Penagihan</Label>
                            <Textarea
                                id="alamat_penagihan"
                                value={data.alamat_penagihan}
                                onChange={(e) => setData('alamat_penagihan', e.target.value)}
                                placeholder="Enter alamat penagihan"
                                className="h-32"
                                disabled
                            />
                            {errors.alamat_penagihan && <div className="mt-1 text-sm text-red-500">{errors.alamat_penagihan}</div>}
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="nama_pic">Nama PIC</Label>
                        <Input
                            id="nama_pic"
                            value={data.nama_pic}
                            onChange={(e) => setData('nama_pic', e.target.value)}
                            placeholder="Enter nama PIC"
                            disabled
                        />
                        {errors.nama_pic && <div className="mt-1 text-sm text-red-500">{errors.nama_pic}</div>}
                    </div>
                    <div>
                        <Label htmlFor="no_telp_pic">No Telp PIC</Label>
                        <Input
                            id="no_telp_pic"
                            value={data.no_telp_pic}
                            onChange={(e) => setData('no_telp_pic', e.target.value)}
                            placeholder="Enter nomor telepon PIC"
                            type="number"
                            disabled
                        />
                        {errors.no_telp_pic && <div className="mt-1 text-sm text-red-500">{errors.no_telp_pic}</div>}
                    </div>
                    <div>
                        <Label htmlFor="pph_info">PPH Info</Label>
                        <Select value={data.pph_info} onValueChange={(value) => setData('pph_info', value)} disabled>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Pilih status PPH" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="true">Ditanggung</SelectItem>
                                <SelectItem value="false">Tidak Ditanggung</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.pph_info && <div className="mt-1 text-sm text-red-500">{errors.pph_info}</div>}
                    </div>

                    <div>
                        <Label htmlFor="ledger_id">Perkiraan Jurnal</Label>
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between" disabled>
                                    {data.ledger_id
                                        ? ledger.find((l) => String(l.id) === data.ledger_id)?.kode +
                                          ' – ' +
                                          ledger.find((l) => String(l.id) === data.ledger_id)?.nama
                                        : 'Pilih Perkiraan Jurnal...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>

                            <PopoverContent className="w-64 p-0 2xl:w-96">
                                <Command shouldFilter={true}>
                                    <CommandInput placeholder="Cari jurnal..." />
                                    <CommandEmpty>Tidak ditemukan</CommandEmpty>
                                    <CommandList>
                                        <ScrollArea className="h-64">
                                            <CommandGroup>
                                                {ledger.map((ledger) => (
                                                    <CommandItem
                                                        key={ledger.id}
                                                        value={`${ledger.kode} - ${ledger.nama}`}
                                                        onSelect={() => {
                                                            setData('ledger_id', String(ledger.id)); // Update ledger_id di form data
                                                            setOpen(false); // Tutup popover setelah memilih
                                                        }}
                                                    >
                                                        {ledger.kode} – {ledger.nama}
                                                        <Check
                                                            className={cn(
                                                                'ml-auto',
                                                                data.ledger_id === String(ledger.id) ? 'opacity-100' : 'opacity-0',
                                                            )}
                                                        />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </ScrollArea>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <InputError message={errors.ledger_id} />
                    </div>
                </div>
                <div className="mt-4 flex gap-2">
                    {/* <Button type="submit" disabled={processing}>
                        {customer ? 'Save' : 'Create'}
                    </Button> */}
                    <Link href="/master-customer">
                        <Button type="button" variant="secondary">
                            Kembali
                        </Button>
                    </Link>
                </div>
            </form>
        </div>
    );
}
