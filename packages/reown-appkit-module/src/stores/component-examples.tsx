// ============================================================================
// ZUSTAND STORE INTEGRATION EXAMPLES
// ============================================================================

import React from 'react';
import { 
  useUserProfileIntegration,
  useSpaceIntegration,
  useModalIntegration,
  useNavigationIntegration,
  useThemeIntegration,
  useLoadingIntegration,
} from './integrations';
// Stub components - zenstack-forms module not available in this package
// TODO: Import from root src/components/zenstack-forms or implement properly
const DynamicCard: React.FC<{ children?: React.ReactNode; [key: string]: any }> = ({ children, ...props }) => <div {...props}>{children}</div>;
const UserProfileTemplate: React.FC<{ user?: any; [key: string]: any }> = ({ user, ...props }) => <div {...props}>UserProfileTemplate</div>;
const EntityTable: React.FC<{ data?: any[]; [key: string]: any }> = ({ data, ...props }) => <div {...props}>EntityTable</div>;
const GridLayout: React.FC<{ children?: React.ReactNode; [key: string]: any }> = ({ children, ...props }) => <div {...props}>{children}</div>;
const MainLayout: React.FC<{ children?: React.ReactNode; [key: string]: any }> = ({ children, ...props }) => <div {...props}>{children}</div>;
const SidebarMenu: React.FC<{ [key: string]: any }> = (props) => <div {...props}>SidebarMenu</div>;
const Header: React.FC<{ [key: string]: any }> = (props) => <div {...props}>Header</div>;
const LoadingSpinner: React.FC<{ [key: string]: any }> = (props) => <div {...props}>Loading...</div>;
const LoadingCard: React.FC<{ title?: string; [key: string]: any }> = ({ title, ...props }) => <div {...props}>{title || 'Loading...'}</div>;
const ToastContainer: React.FC<{ [key: string]: any }> = (props) => <div {...props}>ToastContainer</div>;
import { useLoadingStore, useNotificationStore } from './ui-stores';
import { useAuth, usePermissions } from './auth-store';
import { useRealtime } from './realtime-store';


// ============================================================================
// ENHANCED USER PROFILE COMPONENT
// ============================================================================

export const EnhancedUserProfile: React.FC = () => {
  const { user, updateProfile, isLoading } = useUserProfileIntegration();
  const { hasPermission } = usePermissions();
  const { openModal } = useModalIntegration();

  if (!user) {
    return <LoadingCard title="Loading user profile..." />;
  }

  const canEdit = hasPermission('user', 'update', { userId: user.id });

  return (
    <UserProfileTemplate
      user={{
        id: user.id.toString(),
        name: user.name || 'Unknown User',
        email: user.email,
        role: 'user',
        status: 'active',
        bio: 'Software developer with expertise in full-stack development',
        location: 'San Francisco, CA',
        phone: '+1 (555) 123-4567',
        joinedAt: new Date().toISOString(), // TODO: Add createdAt to UserWithRelations type
      }}
      variant="detailed"
      showActions={canEdit}
      onAction={(action, userData) => {
        switch (action) {
          case 'edit':
            openModal('edit-profile', 'edit-profile', userData);
            break;
          case 'settings':
            openModal('user-settings', 'user-settings', userData);
            break;
        }
      }}
    />
  );
};

// ============================================================================
// ENHANCED SPACE DASHBOARD
// ============================================================================

export const EnhancedSpaceDashboard: React.FC = () => {
  const { switchSpace, joinSpace, leaveSpace, canManageSpace } = useSpaceIntegration();
  const { navigateToSpace } = useNavigationIntegration();
  const { openModal } = useModalIntegration();
  const { withLoading } = useLoadingIntegration();
  const { isConnected} = useRealtime();
  const handleSpaceClick = (space: any) => {
    switchSpace(space);
    withLoading('space-click', async () => {
      await navigateToSpace(space);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Spaces</h1>
        <div className="flex items-center space-x-2">
          {isConnected && (
            <div className="flex items-center text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* <GridLayout columns={3} gap="md">
        {spaces.map((space: any) => (
          <DynamicCard
            key={space.id}
            title={space.name}
            description={`${space.members.length} members` || 'Unknown Space'}
            badges={[
              { label: space.name || 'Owner', variant: 'secondary' },
              { label: canManageSpace(space.id) ? 'Admin' : 'Member', variant: 'default' },
            ]}
            actions={[    
              { label: 'Open', action: 'open', variant: 'default' },
              { label: 'Settings', action: 'settings', variant: 'outline' },
              { label: 'Leave', action: 'leave', variant: 'destructive' },
            ]}
            onAction={(action) => {
              switch (action) {
                case 'open':
                  handleSpaceClick(space);
                  break;
                case 'settings':
                  if (canManageSpace(space.id)) {
                    openModal('space-settings', 'space-settings', space);
                  }
                  break;
                case 'leave':
                  leaveSpace(space.id);
                  break;
              }
            }}
          />
        ))}
      </GridLayout> */}
    </div>
  );
};


// ============================================================================
// ENHANCED MAIN LAYOUT WITH STORES
// ============================================================================

export const EnhancedMainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  // const { spaces, currentSpace } = useSpaceIntegration();
  const { navigation, toggleSidebar, setActiveMenuItem } = useNavigationIntegration();
  const { theme, toggleMode } = useThemeIntegration();
  const { notifications } = useNotificationStore();

  const sidebarItems = [
    // {
    //   id: 'dashboard',
    //   label: 'Dashboard',
    //   icon: <span>🏠</span>,
    //   href: '/dashboard',
    // },
    {
      id: 'spaces',
      label: 'Spaces',
      icon: <span>🏢</span>,
      // children: spaces?.map((space: any) => ({
      //   id: `space-${space.id}`,
      //   label: space.name || 'Unknown Space',
      //   href: `/spaces/${space.id}`,
      // })),
    },
    {
      id: 'users',
      label: 'Users',
      icon: <span>👥</span>,
      href: '/users',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <span>⚙️</span>,
      href: '/settings',
    },
  ];

  const headerActions = [
    { label: 'Toggle Theme', action: 'toggle-theme', icon: <span>🌙</span> },
    { label: 'Notifications', action: 'notifications', icon: <span>🔔</span> },
  ];

  const handleHeaderAction = (action: string) => {
    switch (action) {
      case 'toggle-theme':
        toggleMode();
        break;
      case 'notifications':
        // Handle notifications
        break;
      case 'logout':
        logout();
        break;
    }
  };

  return (
    <>
      <MainLayout
        sidebar={{
          items: sidebarItems,
          activeItem: navigation.activeMenuItem,
          collapsed: navigation.sidebarCollapsed,
        }}
        header={{
          title: 'ZenStack AI Builder',
          subtitle: 'Welcome back',
          user: user ? {
            name: user.name || 'User',
            email: user.email,
            role: 'admin',
            avatar: 'favicon.ico',
          } : undefined,
          notifications: notifications.map(n => ({
            id: n.id,
            title: n.title,
            message: n.message,
            time: n.timestamp.toLocaleString(),
            unread: !n.read,
          })),
          actions: headerActions,
        }}
        onSidebarToggle={toggleSidebar}
        onHeaderAction={handleHeaderAction}
      >
        {children}
      </MainLayout>

      {/* Toast Container */}
      <ToastContainer 
        toasts={notifications.map(n => ({ ...n, onClose: () => {} }))} 
        position="top-right" 
      />
    </>
  );
};

// ============================================================================
// ENHANCED ENTITY TABLE WITH REAL-TIME UPDATES
// ============================================================================

export const EnhancedEntityTable: React.FC<{
  data: any[];
  columns: any[];
  onAction?: (action: string, row: any) => void;
}> = ({ data, columns, onAction }) => {
  const { isConnected } = useRealtime();
  const { withLoading } = useLoadingIntegration();
  const isLoading = useLoadingStore(state => state.isLoading('table-action'));
  const handleAction = async (action: string, row: any) => {
    await withLoading(`table-action-${action}`, async () => {
      onAction?.(action, row);
    });
  };

  return (
    <div className="space-y-4">
      {isConnected && (
        <div className="flex items-center text-green-600 text-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          Live updates enabled
        </div>
      )}
      
      <EntityTable
        data={data}
        columns={columns}
        onAction={handleAction}
        loading={isLoading || false}
      />
    </div>
  );
};

// ============================================================================
// ENHANCED LOADING COMPONENT
// ============================================================================

// export const EnhancedLoadingComponent: React.FC<{
//   loadingKey: string;
//   children: React.ReactNode;
//   fallback?: React.ReactNode;
// }> = ({ loadingKey, children, fallback }) => {
//     const isLoading = useLoadingStore(state => state.isLoading(loadingKey));

//     if (isLoading) {
//       return fallback || <LoadingCard title="Loading..." variant="spinner" />;
//     }

//   return <div>{children}</div>;
// };

// ============================================================================
// ENHANCED MODAL COMPONENT
// ============================================================================

export const EnhancedModal: React.FC<{
  id: string;
  children: React.ReactNode;
}> = ({ id, children }) => {
  const { isModalOpen, closeModal } = useModalIntegration();
  const { withLoading } = useLoadingIntegration();

  if (!isModalOpen(id)) {
    return null;
  }

  const handleClose = async () => {
    await withLoading('modal-close', async () => {
      closeModal(id);
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Modal</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

export const StoreIntegrationExamples: React.FC = () => {
  return (
    <EnhancedMainLayout>
      <div className="space-y-8">
        <EnhancedUserProfile />
        {/* <EnhancedSpaceDashboard /> */}
        {/* <EnhancedTodoList /> */}
      </div>
    </EnhancedMainLayout>
  );
};
