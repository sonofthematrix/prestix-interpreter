'use client';

import { Bell } from 'lucide-react';
import { Button } from '../../components/ui/button';

export function NotificationBell() {
  return (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-4 w-4" />
      {/* Notification indicator - could be connected to real notifications later */}
      <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs flex items-center justify-center">
        3
      </span>
    </Button>
  );
}
