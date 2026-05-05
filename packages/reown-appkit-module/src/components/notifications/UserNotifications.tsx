'use client';

import { useSession } from 'next-auth/react';
import { useAppKitAccount } from '../../config';
import { useProfileNotifications } from '../../hooks/use-profile-data';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Bell, Info, CheckCircle, AlertTriangle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function UserNotifications() {
  const { isConnected } = useAppKitAccount();
  const { data: session, status: sessionStatus } = useSession();
  
  // Only fetch notifications if wallet is connected and user has a session
  const shouldFetch = isConnected && sessionStatus === 'authenticated' && !!session?.user?.id;
  
  const { data, isLoading, error } = useProfileNotifications(1, 10, {
    unreadOnly: 'false', // Show all notifications
  });

  // Don't render if wallet is not connected
  if (!isConnected) {
    return null;
  }

  // Show loading state
  if (shouldFetch && isLoading) {
    return (
      <Card className="bg-card dark:bg-gray-900/50 border border-border dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading notifications...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (shouldFetch && error) {
    return (
      <Card className="bg-card dark:bg-gray-900/50 border border-border dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load notifications. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Parse notifications from API response
  const notifications = data?.data || data || [];
  const hasNotifications = Array.isArray(notifications) && notifications.length > 0;

  // Get icon and variant based on notification type
  const getNotificationIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getNotificationVariant = (type?: string, read?: boolean) => {
    if (read) return 'default';
    switch (type?.toLowerCase()) {
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <Card className="bg-card dark:bg-gray-900/50 border border-border dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
          {hasNotifications && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({notifications.filter((n: any) => !n.read && !n.isRead).length} unread)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!shouldFetch ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please sign in to view your notifications.
            </AlertDescription>
          </Alert>
        ) : !hasNotifications ? (
          <Alert>
            <Bell className="h-4 w-4" />
            <AlertDescription>
              No notifications at this time.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification: any) => {
              const notificationId = notification.id || notification.notificationId;
              const title = notification.title || notification.subject || 'Notification';
              const message = notification.message || notification.body || notification.content || '';
              const type = notification.type || notification.notificationType || 'info';
              const read = notification.read || notification.isRead || false;
              const timestamp = notification.timestamp || notification.createdAt || notification.sentAt;
              const date = timestamp ? new Date(timestamp) : new Date();

              return (
                <Alert
                  key={notificationId}
                  variant={getNotificationVariant(type, read)}
                  className={!read ? 'border-l-4 border-l-primary' : ''}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(type)}
                    <div className="flex-1 space-y-1">
                      <AlertTitle className="text-sm font-semibold">
                        {title}
                      </AlertTitle>
                      <AlertDescription className="text-sm">
                        {message}
                      </AlertDescription>
                      {timestamp && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(date, { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    {!read && (
                      <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                    )}
                  </div>
                </Alert>
              );
            })}
            {notifications.length > 5 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                Showing 5 of {notifications.length} notifications
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

