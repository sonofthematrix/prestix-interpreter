// Auto-generated admin page template based on current patterns
// Last synced: 2026-03-01T09:29:34.595Z
// This template can be used to generate/regenerate admin page components

// @ts-nocheck - Template file: imports resolve when used in component location

'use client';

import React from 'react';
import { {{modelName}}AdminTable } from '@/components/admin/{{lowerModelName}}-admin-table';

// Force dynamic rendering - admin pages use context hooks
export const dynamic = 'force-dynamic';

// Admin layout (AdminShell) provides sidebar+header - do NOT wrap in DashboardLayout
export default function {{modelName}}AdminPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <{{modelName}}AdminTable />
    </div>
  );
}
