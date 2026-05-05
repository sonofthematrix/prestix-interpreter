// Auto-generated form template based on current patterns
// Last synced: 2026-03-01T09:29:34.595Z
// This template can be used to generate/regenerate admin form components

// @ts-nocheck - Template file: imports resolve when used in component location

// Generated Form Component for {{modelName}}
// ⚠️ DATABASE-FIRST DATA POLICY ENFORCED
// All data in this component MUST come from database queries, never hardcoded

'use client';

import React, { useEffect } from 'react';
import { useCreate{{modelName}}, useUpdate{{modelName}} } from '@/generated/hooks/{{lowerModelName}}-hooks';
import { useQuery } from '@tanstack/react-query';
import { MonetaryConfigCategory, MonetaryScope, SubscriptionTier, InvoiceStatus, ScheduleType, ScheduleFrequency, AllocationType, getEnumValues, getEnumLabel } from '@/lib/enums';
import { useGeneratedFormStore } from '@/stores/generated-form-store';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { {{modelName}}, Create{{modelName}}Input, Update{{modelName}}Input } from '@/generated/types/{{lowerModelName}}-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

import { AdminImageField } from '@/components/admin/shared/AdminImageField';
import { AdminMultiImageField } from '@/components/admin/shared/AdminMultiImageField';
import { Loader2 } from 'lucide-react';

interface {{modelName}}FormProps {
  mode: 'create' | 'edit';
  data?: {{modelName}};
  onSuccess: () => void;
  onCancel: () => void;
}

// ✅ REDUX/ZUSTAND PATTERN - Default form data
const defaultFormData: any = {
  name: '',
  description: '',
  category: '',
  isSystem: false,
  values: '',
  usageCount: 0,
  lastUsedAt: '',
};

export function {{modelName}}Form({ mode, data, onSuccess, onCancel }: {{modelName}}FormProps) {
  // ✅ REDUX/ZUSTAND PATTERN - Use Generated Form Store
  const {
    initializeForm,
    updateField,
    getFormData,  
    submitForm,
    setFieldError,
    isFormDirty,
    destroyForm,
  } = useGeneratedFormStore();
  
  const createMutation = useCreate{{modelName}}();
  const updateMutation = useUpdate{{modelName}}();
  
  // Generate unique form ID
  const formId = `{{lowerModelName}}-form-${mode}-${data?.id || 'new'}`;

  // Fetch relation data from API endpoints
  // Fetch MonetaryConfig options via API
  const { data: monetaryConfigResponse, isLoading: monetaryConfigLoading, error: monetaryConfigError } = useQuery({
    queryKey: ['monetaryConfigOptions'],
    queryFn: async () => {
      const response = await fetch('/api/monetaryConfig?pageSize=100', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch MonetaryConfig options');
      const result = await response.json();
      return Array.isArray(result.data) ? result.data : result.data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  const monetaryConfigOptions = monetaryConfigResponse || [];
  // Fetch VendorInvoice options via API
  const { data: vendorInvoiceResponse, isLoading: vendorInvoiceLoading, error: vendorInvoiceError } = useQuery({
    queryKey: ['vendorInvoiceOptions'],
    queryFn: async () => {
      const response = await fetch('/api/vendorInvoice?pageSize=100', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch VendorInvoice options');
      const result = await response.json();
      return Array.isArray(result.data) ? result.data : result.data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  const vendorInvoiceOptions = vendorInvoiceResponse || [];
  // Fetch VendorProfile options via API
  const { data: vendorProfileResponse, isLoading: vendorProfileLoading, error: vendorProfileError } = useQuery({
    queryKey: ['vendorProfileOptions'],
    queryFn: async () => {
      const response = await fetch('/api/vendorProfile?pageSize=100', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch VendorProfile options');
      const result = await response.json();
      return Array.isArray(result.data) ? result.data : result.data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  const vendorProfileOptions = vendorProfileResponse || [];
  // Fetch AllocationSchedule options via API
  const { data: allocationScheduleResponse, isLoading: allocationScheduleLoading, error: allocationScheduleError } = useQuery({
    queryKey: ['allocationScheduleOptions'],
    queryFn: async () => {
      const response = await fetch('/api/allocationSchedule?pageSize=100', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch AllocationSchedule options');
      const result = await response.json();
      return Array.isArray(result.data) ? result.data : result.data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  const allocationScheduleOptions = allocationScheduleResponse || [];
  // Fetch TokenPurchase options via API
  const { data: tokenPurchaseResponse, isLoading: tokenPurchaseLoading, error: tokenPurchaseError } = useQuery({
    queryKey: ['tokenPurchaseOptions'],
    queryFn: async () => {
      const response = await fetch('/api/tokenPurchase?pageSize=100', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch TokenPurchase options');
      const result = await response.json();
      return Array.isArray(result.data) ? result.data : result.data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  const tokenPurchaseOptions = tokenPurchaseResponse || [];
  // Fetch RealEstateAsset options via API
  const { data: realEstateAssetResponse, isLoading: realEstateAssetLoading, error: realEstateAssetError } = useQuery({
    queryKey: ['realEstateAssetOptions'],
    queryFn: async () => {
      const response = await fetch('/api/realEstateAsset?pageSize=100', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch RealEstateAsset options');
      const result = await response.json();
      return Array.isArray(result.data) ? result.data : result.data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  const realEstateAssetOptions = realEstateAssetResponse || [];

  // ✅ REDUX/ZUSTAND PATTERN - Single mount-time initialization
  useEffect(() => {
    // Prepare initial data
    let initialData: any;
    
    if (data && mode === 'edit') {
      initialData = {
        name: data.name || '',
        description: data.description || '',
        category: data.category || '',
        isSystem: data.isSystem ?? false,
        values: data.values || '',
        usageCount: data.usageCount ?? 0,
        lastUsedAt: data.lastUsedAt || '',
      };
    } else {
      initialData = defaultFormData;
    }
    
    initializeForm(formId, '{{modelName}}', mode, {}, initialData);
    
    return () => {
      // ✅ Cleanup - preserve dirty forms (drafts)
      if (!isFormDirty(formId)) {
        destroyForm(formId);
      }
    };
  }, []); // ✅ Empty deps - runs once on mount

  // ✅ REDUX/ZUSTAND PATTERN - Get form data from store
  const formData = getFormData(formId) ?? defaultFormData;

  const handleChange = (field: string, value: any) => {
    updateField(formId, field, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean up form data
    const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    // Use submitForm callback pattern
    const success = await submitForm(formId, async () => {
      if (mode === 'create') {
        await createMutation.mutateAsync(cleanedData as Create{{modelName}}Input);
      } else if (mode === 'edit' && data) {
        await updateMutation.mutateAsync({
          id: data.id,
          ...cleanedData
        } as Update{{modelName}}Input);
      }
    });

    if (success) {
      toast.success(`{{modelName}} ${mode === 'create' ? 'created' : 'updated'} successfully`);
      onSuccess();
      destroyForm(formId);
    } else {
      const form = getFormData(formId);
      const errors = form?.submission?.submitErrors || [];
      if (errors.length > 0) {
        toast.error(`Validation Error: ${errors.join(', ')}`);
      } else {
        toast.error(`Failed to ${mode} {{lowerModelName}}`);
      }
    }
  };
  
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* === Basic Information === */}
      <div className="col-span-full">
        <div className="flex items-center gap-2 pt-2 pb-1">
          <span className="text-sm font-semibold text-foreground dark:text-white uppercase tracking-wide">Basic Information</span>
          <div className="flex-1 h-px bg-border dark:bg-gray-700" />
        </div>
      </div>
      <div>
              <Label htmlFor="name" className="text-foreground dark:text-white">
                Name
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name as any || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter name"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
                <Label htmlFor="description">
                  Description
                  
                </Label>
                <Textarea
                  id="description"
                  value={formData.description as string || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Enter description"
                  rows={3}
                  
                />
              </div>
      <div>
              <Label htmlFor="category" className="text-foreground dark:text-white">
                Category
                
              </Label>
              <Input
                id="category"
                type="text"
                value={formData.category as any || ''}
                onChange={(e) => handleChange('category', e.target.value)}
                placeholder="Enter category"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                
              />
            </div>
      <div>
              <Label htmlFor="name" className="text-foreground dark:text-white">
                Name
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name as any || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter name"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div className="w-full">
                <Label htmlFor="category" className="text-foreground dark:text-white mb-2 block">
                  Category
                   <span className="text-destructive dark:text-red-400">*</span>
                </Label>
                <Select
                  value={formData.category || ''}
                  onValueChange={(value) => handleChange('category', value.toUpperCase())}
                  required
                  disabled={false}
                >
                  <SelectTrigger 
                    id="category" 
                    className="w-full bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40 transition-colors duration-200"
                  >
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-900 border-border dark:border-gray-600 max-h-[300px] overflow-y-auto">
                    {getEnumValues(MonetaryConfigCategory).map((value) => (
                      <SelectItem 
                        key={value} 
                        value={value}
                        className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer"
                      >
                        {getEnumLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
      <div>
                <Label htmlFor="description">
                  Description
                  
                </Label>
                <Textarea
                  id="description"
                  value={formData.description as string || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Enter description"
                  rows={3}
                  
                />
              </div>
      <div>
              <Label htmlFor="name" className="text-foreground dark:text-white">
                Name
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name as any || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter name"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
                <Label htmlFor="description">
                  Description
                  
                </Label>
                <Textarea
                  id="description"
                  value={formData.description as string || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Enter description"
                  rows={3}
                  
                />
              </div>
      {/* === Business & Finance === */}
      <div className="col-span-full">
        <div className="flex items-center gap-2 pt-2 pb-1">
          <span className="text-sm font-semibold text-foreground dark:text-white uppercase tracking-wide">Business & Finance</span>
          <div className="flex-1 h-px bg-border dark:bg-gray-700" />
        </div>
      </div>
      <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="percentage"
                  checked={formData.percentage as boolean || false}
                  onChange={(e) => handleChange('percentage', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="percentage">Percentage</Label>
              </div>
      {/* === Status & Verification === */}
      <div className="col-span-full">
        <div className="flex items-center gap-2 pt-2 pb-1">
          <span className="text-sm font-semibold text-foreground dark:text-white uppercase tracking-wide">Status & Verification</span>
          <div className="flex-1 h-px bg-border dark:bg-gray-700" />
        </div>
      </div>
      <div className="w-full">
                <Label htmlFor="status" className="text-foreground dark:text-white mb-2 block">
                  Status
                   <span className="text-destructive dark:text-red-400">*</span>
                </Label>
                <Select
                  value={formData.status || ''}
                  onValueChange={(value) => handleChange('status', value.toUpperCase())}
                  required
                  disabled={false}
                >
                  <SelectTrigger 
                    id="status" 
                    className="w-full bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40 transition-colors duration-200"
                  >
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-900 border-border dark:border-gray-600 max-h-[300px] overflow-y-auto">
                    {getEnumValues(InvoiceStatus).map((value) => (
                      <SelectItem 
                        key={value} 
                        value={value}
                        className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer"
                      >
                        {getEnumLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
      <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive as boolean || false}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isActive">Is Active</Label>
              </div>
      <div>
              <Label htmlFor="status" className="text-foreground dark:text-white">
                Status
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="status"
                type="text"
                value={formData.status as any || ''}
                onChange={(e) => handleChange('status', e.target.value)}
                placeholder="Enter status"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      {/* === Additional Fields === */}
      <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isSystem"
                  checked={formData.isSystem as boolean || false}
                  onChange={(e) => handleChange('isSystem', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isSystem">Is System</Label>
              </div>
      <div>
              <Label htmlFor="values" className="text-foreground dark:text-white">
                Values
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="values"
                type="text"
                value={formData.values as any || ''}
                onChange={(e) => handleChange('values', e.target.value)}
                placeholder="Enter values"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
              <Label htmlFor="usageCount" className="text-foreground dark:text-white">
                Usage Count
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="usageCount"
                type="number"
                value={formData.usageCount as any || ''}
                onChange={(e) => handleChange('usageCount', Number(e.target.value))}
                placeholder="Enter usageCount"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
                <Label htmlFor="lastUsedAt" className="text-foreground dark:text-white">
                  Last Used At
                  
                </Label>
                <Input
                  id="lastUsedAt"
                  type="datetime-local"
                  value={formData.lastUsedAt ? new Date(formData.lastUsedAt).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleChange('lastUsedAt', e.target.value ? new Date(e.target.value).toISOString() : null )}
                  placeholder="Enter lastUsedAt"
                  className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                  
                />
              </div>
      <div>
              <Label htmlFor="value" className="text-foreground dark:text-white">
                Value
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="value"
                type="number"
                value={formData.value as any || ''}
                onChange={(e) => handleChange('value', Number(e.target.value))}
                placeholder="Enter value"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div className="w-full">
                <Label htmlFor="appliesTo" className="text-foreground dark:text-white mb-2 block">
                  Applies To
                   <span className="text-destructive dark:text-red-400">*</span>
                </Label>
                <Select
                  value={formData.appliesTo || ''}
                  onValueChange={(value) => handleChange('appliesTo', value.toUpperCase())}
                  required
                  disabled={false}
                >
                  <SelectTrigger 
                    id="appliesTo" 
                    className="w-full bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40 transition-colors duration-200"
                  >
                    <SelectValue placeholder="Select appliesTo" />
                  </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-900 border-border dark:border-gray-600 max-h-[300px] overflow-y-auto">
                    {getEnumValues(MonetaryScope).map((value) => (
                      <SelectItem 
                        key={value} 
                        value={value}
                        className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer"
                      >
                        {getEnumLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
      <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isConfigurable"
                  checked={formData.isConfigurable as boolean || false}
                  onChange={(e) => handleChange('isConfigurable', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isConfigurable">Is Configurable</Label>
              </div>
      <div>
              <Label htmlFor="defaultValue" className="text-foreground dark:text-white">
                Default Value
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="defaultValue"
                type="number"
                value={formData.defaultValue as any || ''}
                onChange={(e) => handleChange('defaultValue', Number(e.target.value))}
                placeholder="Enter defaultValue"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
                <Label htmlFor="effectiveFrom" className="text-foreground dark:text-white">
                  Effective From
                   <span className="text-destructive dark:text-red-400">*</span>
                </Label>
                <Input
                  id="effectiveFrom"
                  type="datetime-local"
                  value={formData.effectiveFrom ? new Date(formData.effectiveFrom).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleChange('effectiveFrom', e.target.value ? new Date(e.target.value).toISOString() : '' )}
                  placeholder="Enter effectiveFrom"
                  className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                  required
                />
              </div>
      <div>
                <Label htmlFor="effectiveTo" className="text-foreground dark:text-white">
                  Effective To
                  
                </Label>
                <Input
                  id="effectiveTo"
                  type="datetime-local"
                  value={formData.effectiveTo ? new Date(formData.effectiveTo).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleChange('effectiveTo', e.target.value ? new Date(e.target.value).toISOString() : null )}
                  placeholder="Enter effectiveTo"
                  className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                  
                />
              </div>
      <div>
              <Label htmlFor="propertyId" className="text-foreground dark:text-white">
                Property Id
                
              </Label>
              <Input
                id="propertyId"
                type="text"
                value={formData.propertyId as any || ''}
                onChange={(e) => handleChange('propertyId', e.target.value)}
                placeholder="Enter propertyId"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                
              />
            </div>
      <div>
              <Label htmlFor="vendorId" className="text-foreground dark:text-white">
                Vendor Id
                
              </Label>
              <Input
                id="vendorId"
                type="text"
                value={formData.vendorId as any || ''}
                onChange={(e) => handleChange('vendorId', e.target.value)}
                placeholder="Enter vendorId"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                
              />
            </div>
      <div className="w-full">
                <Label htmlFor="tier" className="text-foreground dark:text-white mb-2 block">
                  Tier
                  
                </Label>
                <Select
                  value={formData.tier || ''}
                  onValueChange={(value) => handleChange('tier', value.toUpperCase())}
                  
                  disabled={false}
                >
                  <SelectTrigger 
                    id="tier" 
                    className="w-full bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40 transition-colors duration-200"
                  >
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-900 border-border dark:border-gray-600 max-h-[300px] overflow-y-auto">
                    {getEnumValues(SubscriptionTier).map((value) => (
                      <SelectItem 
                        key={value} 
                        value={value}
                        className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer"
                      >
                        {getEnumLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
      <div>
              <Label htmlFor="createdBy" className="text-foreground dark:text-white">
                Created By
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="createdBy"
                type="text"
                value={formData.createdBy as any || ''}
                onChange={(e) => handleChange('createdBy', e.target.value)}
                placeholder="Enter createdBy"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
              <Label htmlFor="updatedBy" className="text-foreground dark:text-white">
                Updated By
                
              </Label>
              <Input
                id="updatedBy"
                type="text"
                value={formData.updatedBy as any || ''}
                onChange={(e) => handleChange('updatedBy', e.target.value)}
                placeholder="Enter updatedBy"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                
              />
            </div>
      <div>
              <Label htmlFor="vendorId" className="text-foreground dark:text-white">
                Vendor Id
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="vendorId"
                type="text"
                value={formData.vendorId as any || ''}
                onChange={(e) => handleChange('vendorId', e.target.value)}
                placeholder="Enter vendorId"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
              <Label htmlFor="invoiceNumber" className="text-foreground dark:text-white">
                Invoice Number
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="invoiceNumber"
                type="text"
                value={formData.invoiceNumber as any || ''}
                onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                placeholder="Enter invoiceNumber"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
                <Label htmlFor="periodStart" className="text-foreground dark:text-white">
                  Period Start
                   <span className="text-destructive dark:text-red-400">*</span>
                </Label>
                <Input
                  id="periodStart"
                  type="datetime-local"
                  value={formData.periodStart ? new Date(formData.periodStart).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleChange('periodStart', e.target.value ? new Date(e.target.value).toISOString() : '' )}
                  placeholder="Enter periodStart"
                  className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                  required
                />
              </div>
      <div>
                <Label htmlFor="periodEnd" className="text-foreground dark:text-white">
                  Period End
                   <span className="text-destructive dark:text-red-400">*</span>
                </Label>
                <Input
                  id="periodEnd"
                  type="datetime-local"
                  value={formData.periodEnd ? new Date(formData.periodEnd).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleChange('periodEnd', e.target.value ? new Date(e.target.value).toISOString() : '' )}
                  placeholder="Enter periodEnd"
                  className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                  required
                />
              </div>
      <div>
              <Label htmlFor="totalCommission" className="text-foreground dark:text-white">
                Total Commission
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="totalCommission"
                type="number"
                value={formData.totalCommission as any || ''}
                onChange={(e) => handleChange('totalCommission', Number(e.target.value))}
                placeholder="Enter totalCommission"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
              <Label htmlFor="totalOrders" className="text-foreground dark:text-white">
                Total Orders
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="totalOrders"
                type="number"
                value={formData.totalOrders as any || ''}
                onChange={(e) => handleChange('totalOrders', Number(e.target.value))}
                placeholder="Enter totalOrders"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
              <Label htmlFor="orderCommissions" className="text-foreground dark:text-white">
                Order Commissions
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="orderCommissions"
                type="text"
                value={formData.orderCommissions as any || ''}
                onChange={(e) => handleChange('orderCommissions', e.target.value)}
                placeholder="Enter orderCommissions"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
              <Label htmlFor="marketplaceFees" className="text-foreground dark:text-white">
                Marketplace Fees
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="marketplaceFees"
                type="number"
                value={formData.marketplaceFees as any || ''}
                onChange={(e) => handleChange('marketplaceFees', Number(e.target.value))}
                placeholder="Enter marketplaceFees"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
              <Label htmlFor="adjustments" className="text-foreground dark:text-white">
                Adjustments
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="adjustments"
                type="number"
                value={formData.adjustments as any || ''}
                onChange={(e) => handleChange('adjustments', Number(e.target.value))}
                placeholder="Enter adjustments"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
              <Label htmlFor="paymentMethod" className="text-foreground dark:text-white">
                Payment Method
                
              </Label>
              <Input
                id="paymentMethod"
                type="text"
                value={formData.paymentMethod as any || ''}
                onChange={(e) => handleChange('paymentMethod', e.target.value)}
                placeholder="Enter paymentMethod"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                
              />
            </div>
      <div>
              <Label htmlFor="paymentReference" className="text-foreground dark:text-white">
                Payment Reference
                
              </Label>
              <Input
                id="paymentReference"
                type="text"
                value={formData.paymentReference as any || ''}
                onChange={(e) => handleChange('paymentReference', e.target.value)}
                placeholder="Enter paymentReference"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                
              />
            </div>
      <div>
                <Label htmlFor="paidAt" className="text-foreground dark:text-white">
                  Paid At
                  
                </Label>
                <Input
                  id="paidAt"
                  type="datetime-local"
                  value={formData.paidAt ? new Date(formData.paidAt).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleChange('paidAt', e.target.value ? new Date(e.target.value).toISOString() : null )}
                  placeholder="Enter paidAt"
                  className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                  
                />
              </div>
      <div className="w-full">
                <Label htmlFor="scheduleType" className="text-foreground dark:text-white mb-2 block">
                  Schedule Type
                   <span className="text-destructive dark:text-red-400">*</span>
                </Label>
                <Select
                  value={formData.scheduleType || ''}
                  onValueChange={(value) => handleChange('scheduleType', value.toUpperCase())}
                  required
                  disabled={false}
                >
                  <SelectTrigger 
                    id="scheduleType" 
                    className="w-full bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40 transition-colors duration-200"
                  >
                    <SelectValue placeholder="Select scheduleType" />
                  </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-900 border-border dark:border-gray-600 max-h-[300px] overflow-y-auto">
                    {getEnumValues(ScheduleType).map((value) => (
                      <SelectItem 
                        key={value} 
                        value={value}
                        className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer"
                      >
                        {getEnumLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
      <div className="w-full">
                <Label htmlFor="frequency" className="text-foreground dark:text-white mb-2 block">
                  Frequency
                   <span className="text-destructive dark:text-red-400">*</span>
                </Label>
                <Select
                  value={formData.frequency || ''}
                  onValueChange={(value) => handleChange('frequency', value.toUpperCase())}
                  required
                  disabled={false}
                >
                  <SelectTrigger 
                    id="frequency" 
                    className="w-full bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40 transition-colors duration-200"
                  >
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-900 border-border dark:border-gray-600 max-h-[300px] overflow-y-auto">
                    {getEnumValues(ScheduleFrequency).map((value) => (
                      <SelectItem 
                        key={value} 
                        value={value}
                        className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer"
                      >
                        {getEnumLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
      <div>
              <Label htmlFor="dayOfMonth" className="text-foreground dark:text-white">
                Day Of Month
                
              </Label>
              <Input
                id="dayOfMonth"
                type="number"
                value={formData.dayOfMonth as any || ''}
                onChange={(e) => handleChange('dayOfMonth', Number(e.target.value))}
                placeholder="Enter dayOfMonth"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                
              />
            </div>
      <div>
              <Label htmlFor="dayOfWeek" className="text-foreground dark:text-white">
                Day Of Week
                
              </Label>
              <Input
                id="dayOfWeek"
                type="number"
                value={formData.dayOfWeek as any || ''}
                onChange={(e) => handleChange('dayOfWeek', Number(e.target.value))}
                placeholder="Enter dayOfWeek"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                
              />
            </div>
      <div>
              <Label htmlFor="timeOfDay" className="text-foreground dark:text-white">
                Time Of Day
                
              </Label>
              <Input
                id="timeOfDay"
                type="text"
                value={formData.timeOfDay as any || ''}
                onChange={(e) => handleChange('timeOfDay', e.target.value)}
                placeholder="Enter timeOfDay"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                
              />
            </div>
      <div className="w-full">
                <Label htmlFor="allocationType" className="text-foreground dark:text-white mb-2 block">
                  Allocation Type
                   <span className="text-destructive dark:text-red-400">*</span>
                </Label>
                <Select
                  value={formData.allocationType || ''}
                  onValueChange={(value) => handleChange('allocationType', value.toUpperCase())}
                  required
                  disabled={false}
                >
                  <SelectTrigger 
                    id="allocationType" 
                    className="w-full bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40 transition-colors duration-200"
                  >
                    <SelectValue placeholder="Select allocationType" />
                  </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-900 border-border dark:border-gray-600 max-h-[300px] overflow-y-auto">
                    {getEnumValues(AllocationType).map((value) => (
                      <SelectItem 
                        key={value} 
                        value={value}
                        className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer"
                      >
                        {getEnumLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
      <div className="w-full">
                <Label htmlFor="targetScope" className="text-foreground dark:text-white mb-2 block">
                  Target Scope
                   <span className="text-destructive dark:text-red-400">*</span>
                </Label>
                <Select
                  value={formData.targetScope || ''}
                  onValueChange={(value) => handleChange('targetScope', value.toUpperCase())}
                  required
                  disabled={false}
                >
                  <SelectTrigger 
                    id="targetScope" 
                    className="w-full bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40 transition-colors duration-200"
                  >
                    <SelectValue placeholder="Select targetScope" />
                  </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-900 border-border dark:border-gray-600 max-h-[300px] overflow-y-auto">
                    {getEnumValues(MonetaryScope).map((value) => (
                      <SelectItem 
                        key={value} 
                        value={value}
                        className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer"
                      >
                        {getEnumLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
      <div>
              <Label htmlFor="configOverrides" className="text-foreground dark:text-white">
                Config Overrides
                
              </Label>
              <Input
                id="configOverrides"
                type="text"
                value={formData.configOverrides as any || ''}
                onChange={(e) => handleChange('configOverrides', e.target.value)}
                placeholder="Enter configOverrides"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                
              />
            </div>
      <div>
                <Label htmlFor="lastRunAt" className="text-foreground dark:text-white">
                  Last Run At
                  
                </Label>
                <Input
                  id="lastRunAt"
                  type="datetime-local"
                  value={formData.lastRunAt ? new Date(formData.lastRunAt).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleChange('lastRunAt', e.target.value ? new Date(e.target.value).toISOString() : null )}
                  placeholder="Enter lastRunAt"
                  className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                  
                />
              </div>
      <div>
                <Label htmlFor="nextRunAt" className="text-foreground dark:text-white">
                  Next Run At
                  
                </Label>
                <Input
                  id="nextRunAt"
                  type="datetime-local"
                  value={formData.nextRunAt ? new Date(formData.nextRunAt).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleChange('nextRunAt', e.target.value ? new Date(e.target.value).toISOString() : null )}
                  placeholder="Enter nextRunAt"
                  className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                  
                />
              </div>
      <div>
              <Label htmlFor="lastRunResult" className="text-foreground dark:text-white">
                Last Run Result
                
              </Label>
              <Input
                id="lastRunResult"
                type="text"
                value={formData.lastRunResult as any || ''}
                onChange={(e) => handleChange('lastRunResult', e.target.value)}
                placeholder="Enter lastRunResult"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                
              />
            </div>
      <div>
              <Label htmlFor="buyerAddress" className="text-foreground dark:text-white">
                Buyer Address
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="buyerAddress"
                type="text"
                value={formData.buyerAddress as any || ''}
                onChange={(e) => handleChange('buyerAddress', e.target.value)}
                placeholder="Enter buyerAddress"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
              <Label htmlFor="assetId" className="text-foreground dark:text-white">
                Asset Id
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="assetId"
                type="number"
                value={formData.assetId as any || ''}
                onChange={(e) => handleChange('assetId', Number(e.target.value))}
                placeholder="Enter assetId"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
              <Label htmlFor="tokenAmount" className="text-foreground dark:text-white">
                Token Amount
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="tokenAmount"
                type="number"
                value={formData.tokenAmount as any || ''}
                onChange={(e) => handleChange('tokenAmount', Number(e.target.value))}
                placeholder="Enter tokenAmount"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
              <Label htmlFor="paymentToken" className="text-foreground dark:text-white">
                Payment Token
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="paymentToken"
                type="text"
                value={formData.paymentToken as any || ''}
                onChange={(e) => handleChange('paymentToken', e.target.value)}
                placeholder="Enter paymentToken"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
              <Label htmlFor="totalCost" className="text-foreground dark:text-white">
                Total Cost
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="totalCost"
                type="text"
                value={formData.totalCost as any || ''}
                onChange={(e) => handleChange('totalCost', e.target.value)}
                placeholder="Enter totalCost"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
              <Label htmlFor="expectedTokenCost" className="text-foreground dark:text-white">
                Expected Token Cost
                
              </Label>
              <Input
                id="expectedTokenCost"
                type="text"
                value={formData.expectedTokenCost as any || ''}
                onChange={(e) => handleChange('expectedTokenCost', e.target.value)}
                placeholder="Enter expectedTokenCost"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                
              />
            </div>
      <div>
              <Label htmlFor="expectedFee" className="text-foreground dark:text-white">
                Expected Fee
                
              </Label>
              <Input
                id="expectedFee"
                type="text"
                value={formData.expectedFee as any || ''}
                onChange={(e) => handleChange('expectedFee', e.target.value)}
                placeholder="Enter expectedFee"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                
              />
            </div>
      <div>
              <Label htmlFor="expectedTotalCost" className="text-foreground dark:text-white">
                Expected Total Cost
                
              </Label>
              <Input
                id="expectedTotalCost"
                type="text"
                value={formData.expectedTotalCost as any || ''}
                onChange={(e) => handleChange('expectedTotalCost', e.target.value)}
                placeholder="Enter expectedTotalCost"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                
              />
            </div>
      <div>
              <Label htmlFor="transactionHash" className="text-foreground dark:text-white">
                Transaction Hash
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="transactionHash"
                type="text"
                value={formData.transactionHash as any || ''}
                onChange={(e) => handleChange('transactionHash', e.target.value)}
                placeholder="Enter transactionHash"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
              <Label htmlFor="blockNumber" className="text-foreground dark:text-white">
                Block Number
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="blockNumber"
                type="number"
                value={formData.blockNumber as any || ''}
                onChange={(e) => handleChange('blockNumber', Number(e.target.value))}
                placeholder="Enter blockNumber"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
              <Label htmlFor="logIndex" className="text-foreground dark:text-white">
                Log Index
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Input
                id="logIndex"
                type="number"
                value={formData.logIndex as any || ''}
                onChange={(e) => handleChange('logIndex', Number(e.target.value))}
                placeholder="Enter logIndex"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                required
              />
            </div>
      <div>
                <Label htmlFor="timestamp" className="text-foreground dark:text-white">
                  Timestamp
                   <span className="text-destructive dark:text-red-400">*</span>
                </Label>
                <Input
                  id="timestamp"
                  type="datetime-local"
                  value={formData.timestamp ? new Date(formData.timestamp).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleChange('timestamp', e.target.value ? new Date(e.target.value).toISOString() : '' )}
                  placeholder="Enter timestamp"
                  className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                  required
                />
              </div>
      <div>
              <Label htmlFor="realEstateAssetId" className="text-foreground dark:text-white">
                Real Estate Asset Id
                
              </Label>
              <Input
                id="realEstateAssetId"
                type="text"
                value={formData.realEstateAssetId as any || ''}
                onChange={(e) => handleChange('realEstateAssetId', e.target.value)}
                placeholder="Enter realEstateAssetId"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                
              />
            </div>
    </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Relations */}
        <div className="w-full">
              <Label htmlFor="modelId" className="text-foreground dark:text-white mb-2 block">
                Model
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Select
                value={formData.modelId as string || ''}
                onValueChange={(value) => handleChange('modelId', value)}
                required
                disabled={monetaryConfigLoading}
              >
                <SelectTrigger 
                  id="modelId" 
                  className="w-full bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SelectValue placeholder={monetaryConfigLoading ? 'Loading...' : 'Select model'} />
                </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-900 border-border dark:border-gray-600 max-h-[300px] overflow-y-auto">
                  {monetaryConfigLoading ? (
                    <div className="p-4 text-center text-muted-foreground dark:text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                      Loading options...
                    </div>
                  ) : monetaryConfigError ? (
                    <div className="p-4 text-center text-destructive dark:text-red-400 text-sm">
                      Failed to load options
                    </div>
                  ) : (
                    <>
                      
                      {monetaryConfigOptions && monetaryConfigOptions.length > 0 ? (
                        monetaryConfigOptions.map((item: any) => (
                          <SelectItem 
                            key={item.id} 
                            value={item.id}
                            className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer"
                          >
                            {item.name || item.title || item.email || item.id}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-muted-foreground dark:text-gray-400 text-sm">
                          No options available
                        </div>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
        <div className="w-full">
              <Label htmlFor="modelId" className="text-foreground dark:text-white mb-2 block">
                Model
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Select
                value={formData.modelId as string || ''}
                onValueChange={(value) => handleChange('modelId', value)}
                required
                disabled={vendorInvoiceLoading}
              >
                <SelectTrigger 
                  id="modelId" 
                  className="w-full bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SelectValue placeholder={vendorInvoiceLoading ? 'Loading...' : 'Select model'} />
                </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-900 border-border dark:border-gray-600 max-h-[300px] overflow-y-auto">
                  {vendorInvoiceLoading ? (
                    <div className="p-4 text-center text-muted-foreground dark:text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                      Loading options...
                    </div>
                  ) : vendorInvoiceError ? (
                    <div className="p-4 text-center text-destructive dark:text-red-400 text-sm">
                      Failed to load options
                    </div>
                  ) : (
                    <>
                      
                      {vendorInvoiceOptions && vendorInvoiceOptions.length > 0 ? (
                        vendorInvoiceOptions.map((item: any) => (
                          <SelectItem 
                            key={item.id} 
                            value={item.id}
                            className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer"
                          >
                            {item.name || item.title || item.email || item.id}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-muted-foreground dark:text-gray-400 text-sm">
                          No options available
                        </div>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
        <div className="w-full">
              <Label htmlFor="vendorId" className="text-foreground dark:text-white mb-2 block">
                Vendor
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Select
                value={formData.vendorId as string || ''}
                onValueChange={(value) => handleChange('vendorId', value)}
                required
                disabled={vendorProfileLoading}
              >
                <SelectTrigger 
                  id="vendorId" 
                  className="w-full bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SelectValue placeholder={vendorProfileLoading ? 'Loading...' : 'Select vendor'} />
                </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-900 border-border dark:border-gray-600 max-h-[300px] overflow-y-auto">
                  {vendorProfileLoading ? (
                    <div className="p-4 text-center text-muted-foreground dark:text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                      Loading options...
                    </div>
                  ) : vendorProfileError ? (
                    <div className="p-4 text-center text-destructive dark:text-red-400 text-sm">
                      Failed to load options
                    </div>
                  ) : (
                    <>
                      
                      {vendorProfileOptions && vendorProfileOptions.length > 0 ? (
                        vendorProfileOptions.map((item: any) => (
                          <SelectItem 
                            key={item.id} 
                            value={item.id}
                            className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer"
                          >
                            {item.name || item.title || item.email || item.id}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-muted-foreground dark:text-gray-400 text-sm">
                          No options available
                        </div>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
        <div className="w-full">
              <Label htmlFor="modelId" className="text-foreground dark:text-white mb-2 block">
                Model
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Select
                value={formData.modelId as string || ''}
                onValueChange={(value) => handleChange('modelId', value)}
                required
                disabled={allocationScheduleLoading}
              >
                <SelectTrigger 
                  id="modelId" 
                  className="w-full bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SelectValue placeholder={allocationScheduleLoading ? 'Loading...' : 'Select model'} />
                </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-900 border-border dark:border-gray-600 max-h-[300px] overflow-y-auto">
                  {allocationScheduleLoading ? (
                    <div className="p-4 text-center text-muted-foreground dark:text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                      Loading options...
                    </div>
                  ) : allocationScheduleError ? (
                    <div className="p-4 text-center text-destructive dark:text-red-400 text-sm">
                      Failed to load options
                    </div>
                  ) : (
                    <>
                      
                      {allocationScheduleOptions && allocationScheduleOptions.length > 0 ? (
                        allocationScheduleOptions.map((item: any) => (
                          <SelectItem 
                            key={item.id} 
                            value={item.id}
                            className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer"
                          >
                            {item.name || item.title || item.email || item.id}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-muted-foreground dark:text-gray-400 text-sm">
                          No options available
                        </div>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
        <div className="w-full">
              <Label htmlFor="modelId" className="text-foreground dark:text-white mb-2 block">
                Model
                 <span className="text-destructive dark:text-red-400">*</span>
              </Label>
              <Select
                value={formData.modelId as string || ''}
                onValueChange={(value) => handleChange('modelId', value)}
                required
                disabled={tokenPurchaseLoading}
              >
                <SelectTrigger 
                  id="modelId" 
                  className="w-full bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SelectValue placeholder={tokenPurchaseLoading ? 'Loading...' : 'Select model'} />
                </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-900 border-border dark:border-gray-600 max-h-[300px] overflow-y-auto">
                  {tokenPurchaseLoading ? (
                    <div className="p-4 text-center text-muted-foreground dark:text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                      Loading options...
                    </div>
                  ) : tokenPurchaseError ? (
                    <div className="p-4 text-center text-destructive dark:text-red-400 text-sm">
                      Failed to load options
                    </div>
                  ) : (
                    <>
                      
                      {tokenPurchaseOptions && tokenPurchaseOptions.length > 0 ? (
                        tokenPurchaseOptions.map((item: any) => (
                          <SelectItem 
                            key={item.id} 
                            value={item.id}
                            className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer"
                          >
                            {item.name || item.title || item.email || item.id}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-muted-foreground dark:text-gray-400 text-sm">
                          No options available
                        </div>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
        <div className="w-full">
              <Label htmlFor="propertyId" className="text-foreground dark:text-white mb-2 block">
                Property
                
              </Label>
              <Select
                value={formData.propertyId as string || ''}
                onValueChange={(value) => handleChange('propertyId', value)}
                
                disabled={realEstateAssetLoading}
              >
                <SelectTrigger 
                  id="propertyId" 
                  className="w-full bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SelectValue placeholder={realEstateAssetLoading ? 'Loading...' : 'Select property'} />
                </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-900 border-border dark:border-gray-600 max-h-[300px] overflow-y-auto">
                  {realEstateAssetLoading ? (
                    <div className="p-4 text-center text-muted-foreground dark:text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                      Loading options...
                    </div>
                  ) : realEstateAssetError ? (
                    <div className="p-4 text-center text-destructive dark:text-red-400 text-sm">
                      Failed to load options
                    </div>
                  ) : (
                    <>
                      <SelectItem value="" className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer">
                        <span className="text-muted-foreground dark:text-gray-400">None</span>
                      </SelectItem>
                      {realEstateAssetOptions && realEstateAssetOptions.length > 0 ? (
                        realEstateAssetOptions.map((item: any) => (
                          <SelectItem 
                            key={item.id} 
                            value={item.id}
                            className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer"
                          >
                            {item.name || item.title || item.email || item.id}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-muted-foreground dark:text-gray-400 text-sm">
                          No options available
                        </div>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
        <div className="w-full">
              <Label htmlFor="vendorId" className="text-foreground dark:text-white mb-2 block">
                Vendor
                
              </Label>
              <Select
                value={formData.vendorId as string || ''}
                onValueChange={(value) => handleChange('vendorId', value)}
                
                disabled={vendorProfileLoading}
              >
                <SelectTrigger 
                  id="vendorId" 
                  className="w-full bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SelectValue placeholder={vendorProfileLoading ? 'Loading...' : 'Select vendor'} />
                </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-900 border-border dark:border-gray-600 max-h-[300px] overflow-y-auto">
                  {vendorProfileLoading ? (
                    <div className="p-4 text-center text-muted-foreground dark:text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                      Loading options...
                    </div>
                  ) : vendorProfileError ? (
                    <div className="p-4 text-center text-destructive dark:text-red-400 text-sm">
                      Failed to load options
                    </div>
                  ) : (
                    <>
                      <SelectItem value="" className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer">
                        <span className="text-muted-foreground dark:text-gray-400">None</span>
                      </SelectItem>
                      {vendorProfileOptions && vendorProfileOptions.length > 0 ? (
                        vendorProfileOptions.map((item: any) => (
                          <SelectItem 
                            key={item.id} 
                            value={item.id}
                            className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer"
                          >
                            {item.name || item.title || item.email || item.id}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-muted-foreground dark:text-gray-400 text-sm">
                          No options available
                        </div>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
        <div className="w-full">
              <Label htmlFor="realEstateAssetId" className="text-foreground dark:text-white mb-2 block">
                Real Estate Asset
                
              </Label>
              <Select
                value={formData.realEstateAssetId as string || ''}
                onValueChange={(value) => handleChange('realEstateAssetId', value)}
                
                disabled={realEstateAssetLoading}
              >
                <SelectTrigger 
                  id="realEstateAssetId" 
                  className="w-full bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SelectValue placeholder={realEstateAssetLoading ? 'Loading...' : 'Select realEstateAsset'} />
                </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-900 border-border dark:border-gray-600 max-h-[300px] overflow-y-auto">
                  {realEstateAssetLoading ? (
                    <div className="p-4 text-center text-muted-foreground dark:text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                      Loading options...
                    </div>
                  ) : realEstateAssetError ? (
                    <div className="p-4 text-center text-destructive dark:text-red-400 text-sm">
                      Failed to load options
                    </div>
                  ) : (
                    <>
                      <SelectItem value="" className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer">
                        <span className="text-muted-foreground dark:text-gray-400">None</span>
                      </SelectItem>
                      {realEstateAssetOptions && realEstateAssetOptions.length > 0 ? (
                        realEstateAssetOptions.map((item: any) => (
                          <SelectItem 
                            key={item.id} 
                            value={item.id}
                            className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer"
                          >
                            {item.name || item.title || item.email || item.id}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-muted-foreground dark:text-gray-400 text-sm">
                          No options available
                        </div>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-border dark:border-gray-700">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Create' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
