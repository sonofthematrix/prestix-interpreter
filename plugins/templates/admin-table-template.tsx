// Auto-generated admin table template based on current patterns
// Last synced: 2026-03-01T09:29:34.595Z
// Canonical source: venueProfile (includes Logo column for logo/coverImage/gallery)
// This template can be used to generate/regenerate admin table components

// @ts-nocheck - Template file: imports resolve when used in component location

// Generated Admin Table Component for {{modelName}}
// ⚠️ DATABASE-FIRST DATA POLICY ENFORCED
// All data in this component MUST come from database queries, never hardcoded

'use client';

import React, { useState } from 'react';
import { use{{modelName}}Paginated } from '@/generated/hooks/{{lowerModelName}}-hooks';
import type { {{modelName}} } from '@/generated/types/{{lowerModelName}}-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  X,
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Building2
} from 'lucide-react';
import { CachedImage } from '@/components/common/CachedImage';
import { formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type SortDirection = 'asc' | 'desc';

export function {{modelName}}AdminTable() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Sorting handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1); // Reset to first page when sorting changes
  };

  // Build filter object
  const filter: any = {};
  if (searchQuery) {
    filter.OR = [
      { id: { contains: searchQuery, mode: 'insensitive' } },
      { userId: { contains: searchQuery, mode: 'insensitive' } },
      { businessName: { contains: searchQuery, mode: 'insensitive' } },
      { businessType: { contains: searchQuery, mode: 'insensitive' } },
      { description: { contains: searchQuery, mode: 'insensitive' } },
      { tagline: { contains: searchQuery, mode: 'insensitive' } }
    ];
  }

  const { data: response, isLoading, error } = use{{modelName}}Paginated(
    page,
    pageSize,
    filter,
    { [sortField]: sortDirection }
  );

  const items = (response as any)?.data || [];
  const total = (response as any)?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleRowClick = (itemId: string, e: React.MouseEvent) => {
    // Don't trigger if clicking on the actions button
    if ((e.target as HTMLElement).closest('[data-actions-trigger]')) {
      return;
    }
    router.push(`/admin/{{lowerModelName}}/${itemId}`);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSortField('createdAt');
    setSortDirection('desc');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground dark:text-white">{{modelName}} Management</h2>
          <p className="text-muted-foreground dark:text-gray-400">
            Manage {{lowerModelName}}s and their data
          </p>
        </div>
        <Link href="/admin/{{lowerModelName}}/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add {{modelName}}
          </Button>
        </Link>
      </div>

      {/* Stats Card */}
      <Card className="bg-card dark:bg-gray-800 border-border dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-foreground dark:text-white">Total {{modelName}}s</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground dark:text-white">{total}</div>
        </CardContent>
      </Card>

      {/* Enhanced Search and Filter Container */}
      <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded} className="mb-6">
        <div className="bg-card dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
          {/* Search Header Section */}
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10 p-6 border-b border-border dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary dark:text-primary/80" />
                <Input
                  placeholder="Search {{lowerModelName}}s..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-12 pr-4 py-3 h-12 text-base bg-background dark:bg-gray-900 border-border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary/60 transition-all duration-200 w-full"
                />
              </div>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="flex-shrink-0 h-12 px-6 bg-background dark:bg-gray-900 border-border dark:border-gray-600 transition-all duration-200"
                  title="Toggle Advanced Filters"
                >
                  <Filter className="h-5 w-5 mr-2 text-primary dark:text-primary/80" />
                  <span className="font-medium text-foreground dark:text-white">Filters</span>
                  <ChevronDown className={`h-4 w-4 ml-2 text-muted-foreground transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          {/* Collapsible Filter Options */}
          <CollapsibleContent>
            <div className="p-6 bg-muted/30 dark:bg-gray-800/50">
              <div className="space-y-6">
                {/* Filter Section Header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-1 w-8 bg-gradient-to-r from-primary to-accent rounded-full"></div>
                  <h3 className="text-sm font-semibold text-foreground dark:text-white uppercase tracking-wide">Advanced Filters</h3>
                </div>
                
                {/* Filter Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-border dark:border-gray-700">
                  <div className="text-xs text-muted-foreground dark:text-gray-400">
                    {items?.length || 0} {{lowerModelName}}s found
                  </div>
                  <div className="flex gap-2">
                    {searchQuery && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleClearFilters}
                        className="text-xs text-muted-foreground"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Table */}
      <Card className="bg-card dark:bg-gray-800 border-border dark:border-gray-700 transition-all duration-200 hover:shadow-lg dark:hover:shadow-gray-900/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-blue-400 mx-auto mb-4" />
                <p className="text-muted-foreground dark:text-gray-400">Loading {{modelName}}s...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12">
              <div className="rounded-full bg-destructive/10 dark:bg-red-900/20 p-6 mb-4">
                <AlertTriangle className="h-12 w-12 text-destructive dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-foreground dark:text-white mb-1">
                Error loading {{lowerModelName}}s
              </h3>
              <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4">{error.message}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted dark:bg-gray-900 p-6 mb-4">
                <AlertCircle className="h-12 w-12 text-muted-foreground dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-foreground dark:text-white mb-1">
                No {{lowerModelName}}s found
              </h3>
              <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4 max-w-sm">
                No {{lowerModelName}}s match your search criteria. Try adjusting your filters.
              </p>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
              
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 dark:bg-gray-900/50">
                    <TableHead className="w-14 text-foreground dark:text-white">Logo</TableHead>
                    <TableHead className="text-foreground dark:text-white">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent text-foreground dark:text-white"
                        onClick={() => handleSort('id')}
                      >
                        id
                        {sortField === 'id' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="ml-2 h-4 w-4" />
                          ) : (
                            <ArrowDown className="ml-2 h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-foreground dark:text-white">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent text-foreground dark:text-white"
                        onClick={() => handleSort('userId')}
                      >
                        userId
                        {sortField === 'userId' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="ml-2 h-4 w-4" />
                          ) : (
                            <ArrowDown className="ml-2 h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-foreground dark:text-white">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent text-foreground dark:text-white"
                        onClick={() => handleSort('businessName')}
                      >
                        businessName
                        {sortField === 'businessName' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="ml-2 h-4 w-4" />
                          ) : (
                            <ArrowDown className="ml-2 h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-foreground dark:text-white">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent text-foreground dark:text-white"
                        onClick={() => handleSort('businessType')}
                      >
                        businessType
                        {sortField === 'businessType' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="ml-2 h-4 w-4" />
                          ) : (
                            <ArrowDown className="ml-2 h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-foreground dark:text-white">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent text-foreground dark:text-white"
                        onClick={() => handleSort('description')}
                      >
                        description
                        {sortField === 'description' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="ml-2 h-4 w-4" />
                          ) : (
                            <ArrowDown className="ml-2 h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-foreground dark:text-white">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent text-foreground dark:text-white"
                        onClick={() => handleSort('tagline')}
                      >
                        tagline
                        {sortField === 'tagline' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="ml-2 h-4 w-4" />
                          ) : (
                            <ArrowDown className="ml-2 h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right text-foreground dark:text-white">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any) => (
                    <TableRow 
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50 dark:hover:bg-gray-900/50 transition-colors"
                      onClick={(e) => handleRowClick(item.id, e)}
                    >
                      <TableCell className="w-14 p-2">
                        {(() => {
                          const imageUrl = item.logo || item.coverImage || (Array.isArray(item.gallery) && item.gallery?.length > 0 ? item.gallery[0] : null);
                          return imageUrl ? (
                            <div className="relative h-10 w-10 rounded-md overflow-hidden bg-muted dark:bg-gray-700 flex-shrink-0">
                              <CachedImage
                                src={imageUrl}
                                alt={item.businessName || item.name || item.title || 'Logo'}
                                width={40}
                                height={40}
                                className="h-10 w-10 object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-muted dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-5 w-5 text-muted-foreground dark:text-gray-400" />
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-foreground dark:text-white">
                        {item.id}
                      </TableCell>
                      <TableCell className="text-foreground dark:text-white">
                        {item.userId || 'N/A'}
                      </TableCell>
                      <TableCell className="text-foreground dark:text-white">
                        {item.businessName || 'N/A'}
                      </TableCell>
                      <TableCell className="text-foreground dark:text-white">
                        {item.businessType || 'N/A'}
                      </TableCell>
                      <TableCell className="text-foreground dark:text-white">
                        {item.description || 'N/A'}
                      </TableCell>
                      <TableCell className="text-foreground dark:text-white">
                        {item.tagline || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-actions-trigger
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <Link href={`/admin/{{lowerModelName}}/${item.id}`}>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            </Link>
                            <Link href={`/admin/{{lowerModelName}}/${item.id}/edit`}>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit {{modelName}}
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuSeparator />
                            <Link href={`/admin/{{lowerModelName}}/${item.id}/delete`}>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete {{modelName}}
                              </DropdownMenuItem>
                            </Link>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} items
                  </p>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Rows per page" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 / page</SelectItem>
                      <SelectItem value="20">20 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                      <SelectItem value="100">100 / page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">{page}</span>
                    <span className="text-sm text-muted-foreground">of</span>
                    <span className="text-sm font-medium">{totalPages}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
