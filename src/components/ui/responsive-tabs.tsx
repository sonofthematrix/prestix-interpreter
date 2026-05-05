"use client"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import * as React from "react"

export interface TabItem {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  component?: React.ComponentType<any>
}

interface ResponsiveTabsProps {
  value: string
  onValueChange: (value: string) => void
  tabs: TabItem[]
  children: React.ReactNode
  className?: string
  mobileBreakpoint?: 'sm' | 'md' | 'lg'
}

/**
 * ResponsiveTabs Component
 * 
 * Displays tabs horizontally on desktop/tablet and as a dropdown on mobile.
 * Automatically switches to dropdown view below the specified breakpoint.
 * 
 * Usage:
 * ```tsx
 * <ResponsiveTabs value={activeTab} onValueChange={setActiveTab} tabs={tabs}>
 *   {tabs.map(tab => (
 *     <TabsContent key={tab.id} value={tab.id}>
 *       <Component />
 *     </TabsContent>
 *   ))}
 * </ResponsiveTabs>
 * ```
 */
export function ResponsiveTabs({
  value,
  onValueChange,
  tabs,
  children,
  className,
  mobileBreakpoint = 'md'
}: ResponsiveTabsProps) {
  const selectedTab = tabs.find(tab => tab.id === value)
  
  // Breakpoint classes for showing/hiding tabs vs dropdown
  const breakpointClasses = {
    sm: {
      tabs: 'hidden sm:flex',
      dropdown: 'flex sm:hidden'
    },
    md: {
      tabs: 'hidden md:flex',
      dropdown: 'flex md:hidden'
    },
    lg: {
      tabs: 'hidden lg:flex',
      dropdown: 'flex lg:hidden'
    }
  }

  const bp = breakpointClasses[mobileBreakpoint]

  return (
    <Tabs value={value} onValueChange={onValueChange} className={cn("space-y-6", className)}>
      {/* Desktop/Tablet: Horizontal Tabs */}
      <div className={bp.tabs}>
        <TabsList className="inline-flex h-auto w-full bg-muted dark:bg-gray-900 p-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="data-[state=active]:bg-background dark:data-[state=active]:bg-gray-800 text-sm px-3 py-2 flex items-center gap-2 shrink-0 whitespace-nowrap"
              >
                {Icon && <Icon className="h-4 w-4 shrink-0" />}
                <span>{tab.label}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>
      </div>

      {/* Mobile: Dropdown Select */}
      <div className={bp.dropdown}>
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="w-full bg-muted dark:bg-gray-900 border-border dark:border-gray-700 h-10">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {selectedTab && selectedTab.icon && (
                <selectedTab.icon className="h-4 w-4 shrink-0" />
              )}
              <SelectValue placeholder="Select a tab" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-card dark:bg-gray-800 border-border dark:border-gray-700">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <SelectItem
                  key={tab.id}
                  value={tab.id}
                  className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    <span>{tab.label}</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Tab Content */}
      {children}
    </Tabs>
  )
}

export { TabsContent } from "@/components/ui/tabs"

