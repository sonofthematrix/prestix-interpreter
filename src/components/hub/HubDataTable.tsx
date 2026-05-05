"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { cn } from "@/lib/utils";
import { ImageCarousel } from "@/components/ui/image-carousel";
import { ChevronUpIcon, ChevronDownIcon } from "lucide-react";
import { HubTablePagination, PAGE_SIZE_OPTIONS } from "@/components/hub/HubTablePagination";

export type SortDirection = 'asc' | 'desc' | null;

export interface HubDataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | Date;
}

export interface HubDataTableProps<T> {
  columns: HubDataTableColumn<T>[];
  data: T[];
  keyFn: (row: T) => string;
  /** When set, the row navigates to this URL on click (record view). */
  getRowHref?: (row: T) => string | undefined;
  /** When set, this function is called when a row is clicked (alternative to getRowHref). */
  getRowClickHandler?: (row: T) => void;
  getRowActions?: (row: T) => React.ReactNode;
  /** Optional image column configuration */
  imageColumn?: {
    /** Function to get image URL for each row */
    getImageUrl: (row: T) => string | undefined;
    /** Alt text for images */
    altText?: string;
    /** Size of the image thumbnail */
    size?: 'sm' | 'md' | 'lg';
  };
  /** Enable sorting functionality */
  enableSorting?: boolean;
  /** Default sort column key */
  defaultSortKey?: string;
  /** Default sort direction */
  defaultSortDirection?: SortDirection;
  /** Callback when sort changes */
  onSortChange?: (sortKey: string | null, sortDirection: SortDirection) => void;
  /** Enable grouping functionality */
  enableGrouping?: boolean;
  /** Group by field (used when groupKeyFn not provided) */
  groupBy?: string;
  /** Custom group key extractor for nested fields (e.g. venue.name, promoter.name) */
  groupKeyFn?: (item: T) => string;
  /** Group header renderer */
  renderGroupHeader?: (groupKey: string, items: T[], aggregations?: any) => React.ReactNode;
  /** Aggregation function for groups */
  groupAggregations?: (items: T[]) => any;
  emptyMessage?: string;
  /** Enable pagination: page size (default 10), page (1-based), and callbacks */
  pageSize?: number;
  /** Current page (1-based). Required when pageSize is set. */
  page?: number;
  /** Called when page changes */
  onPageChange?: (page: number) => void;
  /** Called when page size changes (resets to page 1) */
  onPageSizeChange?: (pageSize: number) => void;
  /** Label for pagination text (e.g. "bookings", "venues") */
  paginationEntityLabel?: string;
  className?: string;
}

/** Prestix brand: accent-tinted border and row hover with subtle glow. */
const prestixTableWrapper = "overflow-x-auto rounded-lg border border-border shadow-md ring-1 ring-black/5";
const prestixRowHover = "transition-all duration-200 hover:bg-accent/10 hover:shadow-[inset_0_0_0_1px_rgba(220,38,38,0.12)]";

export function HubDataTable<T>({
  columns,
  data,
  keyFn,
  getRowHref,
  getRowClickHandler,
  getRowActions,
  imageColumn,
  enableSorting = false,
  defaultSortKey,
  defaultSortDirection = null,
  onSortChange,
  enableGrouping = false,
  groupBy,
  groupKeyFn,
  renderGroupHeader,
  groupAggregations,
  emptyMessage = "No records.",
  pageSize: pageSizeProp,
  page = 1,
  onPageChange,
  onPageSizeChange,
  paginationEntityLabel = "records",
  className,
}: HubDataTableProps<T>) {
  const pageSize = pageSizeProp ?? 10;
  const paginationEnabled = pageSizeProp != null && onPageChange != null && onPageSizeChange != null;
  const router = useRouter();
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);

  // Handle column sorting
  const handleSort = (columnKey: string) => {
    if (!enableSorting) return;

    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    let newDirection: SortDirection = 'asc';
    if (sortKey === columnKey) {
      newDirection = sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc';
    }

    setSortKey(newDirection ? columnKey : null);
    setSortDirection(newDirection);
    onSortChange?.(newDirection ? columnKey : null, newDirection);
  };

  // Sort data based on current sort settings
  const sortedData = (() => {
    if (!sortKey || !sortDirection || !enableSorting) return data;

    const column = columns.find(col => col.key === sortKey);
    if (!column?.sortValue) return data;

    return [...data].sort((a, b) => {
      const aValue = column.sortValue!(a);
      const bValue = column.sortValue!(b);

      // Handle different value types
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // String comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  })();

  // Group data if grouping is enabled
  const groupedData = (() => {
    if (!enableGrouping || (!groupBy && !groupKeyFn)) return null;

    const groups: Record<string, T[]> = {};
    sortedData.forEach(item => {
      const groupKey = groupKeyFn
        ? groupKeyFn(item)
        : String((item as Record<string, unknown>)[groupBy!] ?? 'No Group');
      const key = groupKey || 'No Group';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    return Object.entries(groups).map(([groupKey, items]) => ({
      groupKey,
      items,
      aggregations: groupAggregations ? groupAggregations(items) : undefined
    }));
  })();

  const displayData = groupedData || sortedData;
  const hasData = groupedData ? groupedData.length > 0 : sortedData.length > 0;

  // Pagination: only when not grouped. Slice sortedData for non-grouped display.
  const usePagination = paginationEnabled && !groupedData;
  const totalRows = sortedData.length;
  const paginatedRows = usePagination
    ? sortedData.slice((page - 1) * pageSize, page * pageSize)
    : sortedData;

  if (!hasData) {
    return (
      <div className="rounded-lg border border-border bg-card px-6 py-12 text-center text-muted-foreground shadow-sm">
        {emptyMessage}
      </div>
    );
  }

  const hasActions = Boolean(getRowActions);
  const hasImageColumn = Boolean(imageColumn);

  const getImageSize = () => {
    switch (imageColumn?.size) {
      case 'sm': return 'w-12 h-12';
      case 'lg': return 'w-20 h-20';
      default: return 'w-16 h-16';
    }
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div className={cn(prestixTableWrapper)}>
        <table className="w-full min-w-[600px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {hasImageColumn && (
              <th className="w-20 px-4 py-3 font-medium text-foreground">Image</th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 font-medium text-foreground",
                  col.className,
                  enableSorting && col.sortable && "cursor-pointer hover:bg-accent/20 transition-colors select-none"
                )}
                onClick={() => handleSort(col.key)}
              >
                <div className="flex items-center gap-2">
                  <span>{col.header}</span>
                  {enableSorting && col.sortable && sortKey === col.key && sortDirection && (
                    <div className="flex flex-col">
                      <ChevronUpIcon
                        className={cn(
                          "h-3 w-3 -mb-1",
                          sortDirection === 'asc' ? "text-foreground" : "text-muted-foreground/50"
                        )}
                      />
                      <ChevronDownIcon
                        className={cn(
                          "h-3 w-3",
                          sortDirection === 'desc' ? "text-foreground" : "text-muted-foreground/50"
                        )}
                      />
                    </div>
                  )}
                  {enableSorting && col.sortable && sortKey !== col.key && (
                    <div className="flex flex-col opacity-30">
                      <ChevronUpIcon className="h-3 w-3 -mb-1" />
                      <ChevronDownIcon className="h-3 w-3" />
                    </div>
                  )}
                </div>
              </th>
            ))}
            {hasActions && (
              <th className="w-24 px-4 py-3 font-medium text-foreground">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {groupedData ? (
            // Render grouped data
            groupedData.map((group) => (
              <Fragment key={group.groupKey}>
                {/* Group Header */}
                {renderGroupHeader && (
                  <tr className="bg-muted/30 border-b-2 border-border">
                    <td colSpan={columns.length + (hasImageColumn ? 1 : 0) + (hasActions ? 1 : 0)} className="px-4 py-3">
                      {renderGroupHeader(group.groupKey, group.items, group.aggregations)}
                    </td>
                  </tr>
                )}

                {/* Group Items */}
                {group.items.map((row) => {
                  const rowHref = getRowHref?.(row);
                  const rowClickHandler = getRowClickHandler;
                  const isClickable = Boolean(rowHref) || Boolean(rowClickHandler);
                  return (
                    <tr
                      key={keyFn(row)}
                      role={isClickable ? "button" : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                      onClick={
                        isClickable
                          ? (e) => {
                              const target = e.target as HTMLElement;
                              if (target.closest("[data-row-action]")) return;
                              if (rowClickHandler) {
                                rowClickHandler(row);
                              } else if (rowHref) {
                                router.push(rowHref);
                              }
                            }
                          : undefined
                      }
                      onKeyDown={
                        isClickable
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                if (rowClickHandler) {
                                  rowClickHandler(row);
                                } else if (rowHref) {
                                  router.push(rowHref);
                                }
                              }
                            }
                          : undefined
                      }
                      className={cn(
                        "border-b border-border/70 pl-8", // Indent grouped rows
                        isClickable && "cursor-pointer " + prestixRowHover
                      )}
                    >
                      {hasImageColumn && (
                        <td className="px-4 py-3">
                          {(() => {
                            const imageUrl = imageColumn!.getImageUrl(row);
                            return imageUrl ? (
                              <div className={cn("rounded-lg overflow-hidden border border-border", getImageSize())}>
                                <ImageCarousel
                                  images={[imageUrl]}
                                  alt={imageColumn?.altText || "Entity image"}
                                  className="object-cover"
                                  aspectRatio="video"
                                  showIndicators={false}
                                  showNavigation={false}
                                  showLightboxButton={false}
                                  autoPlay={false}
                                />
                              </div>
                            ) : (
                              <div className={cn("rounded-lg border border-border bg-muted flex items-center justify-center", getImageSize())}>
                                <div className="text-muted-foreground text-xs">No image</div>
                              </div>
                            );
                          })()}
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.key} className={cn("px-4 py-3 text-foreground", col.className)}>
                          {col.render(row)}
                        </td>
                      ))}
                      {hasActions && (
                        <td className="px-4 py-3" data-row-action>
                          {getRowActions?.(row)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </Fragment>
            ))
          ) : (
            // Render regular data (paginated when enabled)
            paginatedRows.map((row) => {
              const rowHref = getRowHref?.(row);
              const rowClickHandler = getRowClickHandler;
              const isClickable = Boolean(rowHref) || Boolean(rowClickHandler);
              return (
                <tr
                  key={keyFn(row)}
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onClick={
                    isClickable
                      ? (e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest("[data-row-action]")) return;
                          if (rowClickHandler) {
                            rowClickHandler(row);
                          } else if (rowHref) {
                            router.push(rowHref);
                          }
                        }
                      : undefined
                  }
                  onKeyDown={
                    isClickable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (rowClickHandler) {
                              rowClickHandler(row);
                            } else if (rowHref) {
                              router.push(rowHref);
                            }
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    "border-b border-border/70",
                    isClickable && "cursor-pointer " + prestixRowHover
                  )}
                >
                  {hasImageColumn && (
                    <td className="px-4 py-3">
                      {(() => {
                        const imageUrl = imageColumn!.getImageUrl(row);
                        return imageUrl ? (
                          <div className={cn("rounded-lg overflow-hidden border border-border", getImageSize())}>
                            <ImageCarousel
                              images={[imageUrl]}
                              alt={imageColumn?.altText || "Entity image"}
                              className="object-cover"
                              aspectRatio="video"
                              showIndicators={false}
                              showNavigation={false}
                              showLightboxButton={false}
                              autoPlay={false}
                            />
                          </div>
                        ) : (
                          <div className={cn("rounded-lg border border-border bg-muted flex items-center justify-center", getImageSize())}>
                            <div className="text-muted-foreground text-xs">No image</div>
                          </div>
                        );
                      })()}
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3 text-foreground", col.className)}>
                      {col.render(row)}
                    </td>
                  ))}
                  {hasActions && (
                    <td className="px-4 py-3" data-row-action>
                      {getRowActions?.(row)}
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      </div>
      {usePagination && totalRows > 0 && (
        <HubTablePagination
          total={totalRows}
          page={page}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={onPageChange!}
          onPageSizeChange={onPageSizeChange!}
          entityLabel={paginationEntityLabel}
        />
      )}
    </div>
  );
}
