import { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePage } from '@inertiajs/react';

interface DataTablePaginationProps<TData> {
    table: Table<TData>;
}

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
    const { trans_auth } = usePage().props as unknown as { trans_auth: Record<string, string> };
    return (
        <div className="w-full border-t px-2 py-4">
            {/* === MOBILE VERSION (Compact) === */}
            <div className="flex flex-col items-center gap-3 md:hidden">
                {/* Page Indicator */}
                <div className="text-sm font-medium">
                    {(trans_auth.pagination_page_of || 'Page :page of :total')
                        .replace(':page', String(table.getState().pagination.pageIndex + 1))
                        .replace(':total', String(table.getPageCount()))}
                </div>

                {/* Prev / Next Buttons */}
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9 w-9 p-0" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                        <ChevronLeft size={18} />
                    </Button>

                    <Button variant="outline" className="h-9 w-9 p-0" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                        <ChevronRight size={18} />
                    </Button>
                </div>
            </div>

            {/* === DESKTOP VERSION === */}
            <div className="hidden items-center justify-between md:flex">
                <div className="text-muted-foreground flex-1 text-sm">
                    {/* Translate: :selected dari :total baris dipilih */}
                    {(trans_auth.pagination_selected_rows || '')
                        .replace(':selected', String(table.getFilteredSelectedRowModel().rows.length))
                        .replace(':total', String(table.getFilteredRowModel().rows.length))}
                </div>
                <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">{trans_auth.pagination_rows_per_page}</p>
                        <Select
                            value={`${table.getState().pagination.pageSize}`}
                            onValueChange={(value) => {
                                table.setPageSize(Number(value));
                            }}
                        >
                            <SelectTrigger className="h-8 w-17.5">
                                <SelectValue placeholder={table.getState().pagination.pageSize} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 30, 40, 50].map((pageSize) => (
                                    <SelectItem key={pageSize} value={`${pageSize}`}>
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex w-[150px] items-center justify-center text-sm font-medium">
                        {/* Translate: Halaman X dari Y */}
                        {(trans_auth.pagination_page_of || '')
                            .replace(':page', String(table.getState().pagination.pageIndex + 1))
                            .replace(':total', String(table.getPageCount()))}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">{trans_auth.pagination_first}</span>
                            <ChevronsLeft />
                        </Button>
                        <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                            <span className="sr-only">{trans_auth.pagination_prev}</span>
                            <ChevronLeft />
                        </Button>
                        <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                            <span className="sr-only">{trans_auth.pagination_next}</span>
                            <ChevronRight />
                        </Button>
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">{trans_auth.pagination_last}</span>
                            <ChevronsRight />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
