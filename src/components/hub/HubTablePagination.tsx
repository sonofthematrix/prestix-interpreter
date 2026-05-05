"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export interface HubTablePaginationProps {
  /** Total number of records */
  total: number;
  /** Current page (1-based) */
  page: number;
  /** Records per page */
  pageSize: number;
  /** Page size options (default: 10, 20, 50) */
  pageSizeOptions?: readonly number[];
  /** Called when page changes */
  onPageChange: (page: number) => void;
  /** Called when page size changes (resets to page 1) */
  onPageSizeChange: (pageSize: number) => void;
  /** Optional label for the entity (e.g. "bookings", "venues") */
  entityLabel?: string;
  /** Optional class for the container */
  className?: string;
}

/**
 * Pagination controls for Hub tables: page size selector (10, 20, 50),
 * "Showing X to Y of Z" text, and Previous/Next buttons.
 */
export function HubTablePagination({
  total,
  page,
  pageSize,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
  entityLabel = "records",
  className,
}: HubTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">
          Showing {start} to {end} of {total} {entityLabel}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(v: any) => onPageSizeChange(parseInt(v, 10))}
          >
            <SelectTrigger
              className="h-8 w-[70px] border-border bg-background text-foreground"
              aria-label="Rows per page"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-50 border border-border bg-background text-foreground">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
