# Zustand Store System for ZenStack Application

A comprehensive state management solution using Zustand for the ZenStack AI Builder application, providing seamless responsiveness and real-time updates across all components.

## 🚀 Features

- **Core Data Stores**: User, Space, Todo, and AI model management
- **UI State Management**: Modals, toasts, navigation, themes, and preferences
- **Authentication & Authorization**: Complete auth flow with role-based permissions
- **Real-time Synchronization**: WebSocket-based live updates
- **TypeScript Support**: Full type safety and IntelliSense
- **Persistence**: Automatic state persistence with localStorage
- **Optimistic Updates**: Immediate UI feedback with rollback on errors
- **Loading States**: Comprehensive loading state management
- **Error Handling**: Centralized error management with user feedback

## 📁 Store Structure

```
src/stores/
├── types.ts                 # TypeScript type definitions
├── core-stores.ts          # Core data stores (User, Space, Todo)
├── ui-stores.ts            # UI state stores (Modal, Toast, Navigation, etc.)
├── auth-store.ts           # Authentication and authorization
├── realtime-store.ts       # Real-time synchronization
├── integrations.ts         # Component integration utilities
├── component-examples.tsx  # Usage examples
├── index.ts               # Main exports and utilities
└── README.md              # This file
```

## 🛠️ Installation

1. Install required dependencies:

```bash
pnpm add zustand immer
pnpm add -D @types/node
```

2. Import the store provider in your app:

```tsx
import { StoreProvider } from '@/stores';

function App() {
  return (
    <StoreProvider>
      <YourApp />
    </StoreProvider>
  );
}
```

## 📖 Usage Examples

### Basic Store Usage

```tsx
import { useUserStore, useSpaceStore, useAuth } from '@/stores';

function MyComponent() {
  const { user, isAuthenticated } = useAuth();
  const { spaces, currentSpace } = useSpaceStore();
  const { setCurrentSpace } = useSpaceStore();

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <h1>Welcome, {user?.name}!</h1>
          <div>
            {spaces.map(space => (
              <button key={space.id} onClick={() => setCurrentSpace(space)}>
                {space.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>Please log in</div>
      )}
    </div>
  );
}
```

### Using Integration Hooks

```tsx
import { useUserProfileIntegration, useSpaceIntegration } from '@/stores/integrations';

function UserProfile() {
  const { user, updateProfile, isLoading } = useUserProfileIntegration();
  const { spaces, switchSpace } = useSpaceIntegration();

  const handleUpdateProfile = async (data) => {
    await updateProfile(data);
    // Toast notification will be shown automatically
  };

  return (
    <div>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div>
          <h1>{user?.name}</h1>
          <button onClick={() => handleUpdateProfile({ name: 'New Name' })}>
            Update Profile
          </button>
        </div>
      )}
    </div>
  );
}
```

### Real-time Updates

```tsx
import { useUserRealtime, useSpaceRealtime } from '@/stores';

function RealtimeComponent() {
  const { subscribeToUsers, unsubscribeFromUsers } = useUserRealtime();
  const { subscribeToSpaces, unsubscribeFromSpaces } = useSpaceRealtime();

  React.useEffect(() => {
    // Subscribe to real-time updates
    subscribeToUsers();
    subscribeToSpaces();

    return () => {
      // Cleanup subscriptions
      unsubscribeFromUsers();
      unsubscribeFromSpaces();
    };
  }, []);

  return <div>Real-time updates enabled</div>;
}
```

### Authentication

```tsx
import { useAuth, usePermissions } from '@/stores';

function AuthComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();
  const { hasPermission, canManageSpace } = usePermissions();

  const handleLogin = async () => {
    const success = await login('user@example.com', 'password');
    if (success) {
      console.log('Login successful');
    }
  };

  const canEdit = hasPermission('user', 'update', { userId: user?.id });

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.name}!</p>
          {canEdit && <button>Edit Profile</button>}
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

### UI State Management

```tsx
import { useModalStore, useToastStore, useThemeStore } from '@/stores';

function UIComponent() {
  const { openModal, closeModal } = useModalStore();
  const { showSuccess, showError } = useToastStore();
  const { theme, toggleMode } = useThemeStore();

  const handleAction = () => {
    openModal('confirm', 'confirm', {
      title: 'Confirm Action',
      message: 'Are you sure?',
      onConfirm: () => {
        showSuccess('Action completed!');
        closeModal('confirm');
      }
    });
  };

  return (
    <div>
      <button onClick={handleAction}>Show Modal</button>
      <button onClick={toggleMode}>
        Switch to {theme.mode === 'dark' ? 'light' : 'dark'} mode
      </button>
    </div>
  );
}
```

## 🔧 Store Configuration

### Environment Variables

```bash
# WebSocket URL for real-time updates
NEXT_PUBLIC_WS_URL=ws://localhost:3000/api/realtime

# API base URL
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Enable store monitoring in development
NODE_ENV=development
```

### Store Initialization

```tsx
import { initializeStores } from '@/stores';

// Initialize stores on app startup
useEffect(() => {
  initializeStores();
}, []);
```

## 🎯 Core Stores

### User Store
- **State**: Current user, user list, user data
- **Actions**: CRUD operations, search, real-time updates
- **Persistence**: User data persisted in localStorage

### Space Store
- **State**: Spaces, current space, space members
- **Actions**: Join/leave spaces, switch spaces, manage permissions
- **Real-time**: Live updates for space changes

### Todo Store
- **State**: Lists, todos, relationships
- **Actions**: CRUD operations, optimistic updates
- **Real-time**: Live collaboration on todos

### Auth Store
- **State**: Authentication status, user session, permissions
- **Actions**: Login/logout, profile updates, password changes
- **Security**: JWT token management, automatic refresh

## 🎨 UI Stores

### Modal Store
- **State**: Active modals, modal data
- **Actions**: Open/close modals, modal management
- **Features**: Multiple modals, modal stacking

### Toast Store
- **State**: Toast notifications
- **Actions**: Show/hide toasts, auto-dismiss
- **Types**: Success, error, warning, info

### Navigation Store
- **State**: Current path, breadcrumbs, sidebar state
- **Actions**: Navigation, breadcrumb management
- **Persistence**: Navigation state persisted

### Theme Store
- **State**: Theme mode, colors, preferences
- **Actions**: Theme switching, customization
- **Features**: System theme detection, dark/light mode

## 🔄 Real-time Features

### WebSocket Connection
- Automatic connection management
- Reconnection with exponential backoff
- Heartbeat to maintain connection
- Event queuing for offline scenarios

### Event Handling
- Model-specific event handlers
- Global event handlers
- Event queuing and processing
- Error handling and recovery

### Subscriptions
- Dynamic subscription management
- Space-based filtering
- User-based filtering
- Automatic cleanup

## 🛡️ Security & Permissions

### Role-based Access Control
- User roles (Admin, User, etc.)
- Space-specific permissions
- Resource-level permissions
- Dynamic permission checking

### Session Management
- JWT token handling
- Automatic token refresh
- Session expiry management
- Secure logout

## 📊 Performance Optimizations

### Selective Subscriptions
- Subscribe only to needed data
- Automatic cleanup on unmount
- Efficient re-renders with Zustand selectors

### Optimistic Updates
- Immediate UI feedback
- Rollback on errors
- Conflict resolution

### Caching
- In-memory caching
- TTL-based cache invalidation
- Selective cache updates

## 🧪 Testing

### Store Testing
```tsx
import { renderHook, act } from '@testing-library/react';
import { useUserStore } from '@/stores';

test('should update user', () => {
  const { result } = renderHook(() => useUserStore());
  
  act(() => {
    result.current.setCurrentUser({ id: 1, name: 'Test User' });
  });
  
  expect(result.current.currentUser?.name).toBe('Test User');
});
```

### Integration Testing
```tsx
import { render, screen } from '@testing-library/react';
import { StoreProvider } from '@/stores';
import { MyComponent } from './MyComponent';

test('should render with store provider', () => {
  render(
    <StoreProvider>
      <MyComponent />
    </StoreProvider>
  );
  
  expect(screen.getByText('My Component')).toBeInTheDocument();
});
```

## 🚀 Deployment

### Production Configuration
```tsx
// Disable store monitoring in production
if (process.env.NODE_ENV === 'production') {
  // Disable devtools
  // Optimize bundle size
  // Enable production error handling
}
```

### Environment Setup
```bash
# Production WebSocket URL
NEXT_PUBLIC_WS_URL=wss://your-domain.com/api/realtime

# Production API URL
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

## 🔍 Debugging

### Store Monitoring
```tsx
import { enableStoreMonitoring } from '@/stores';

// Enable in development
if (process.env.NODE_ENV === 'development') {
  enableStoreMonitoring();
}
```

### DevTools
- Redux DevTools integration
- Store state inspection
- Action history
- Time travel debugging

## 📚 API Reference

### Core Stores
- `useUserStore()` - User data management
- `useSpaceStore()` - Space management
- `useTodoStore()` - Todo management
- `useAuthStore()` - Authentication

### UI Stores
- `useModalStore()` - Modal management
- `useToastStore()` - Toast notifications
- `useNavigationStore()` - Navigation state
- `useThemeStore()` - Theme management

### Integration Hooks
- `useUserProfileIntegration()` - User profile management
- `useSpaceIntegration()` - Space operations
- `useTodoIntegration()` - Todo operations
- `useModalIntegration()` - Modal operations

### Real-time Hooks
- `useRealtime()` - Connection management
- `useUserRealtime()` - User real-time updates
- `useSpaceRealtime()` - Space real-time updates
- `useTodoRealtime()` - Todo real-time updates

## 🤝 Contributing

1. Follow TypeScript best practices
2. Add proper error handling
3. Include comprehensive tests
4. Update documentation
5. Follow the existing code style

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For questions and support:
- Check the documentation
- Review the examples
- Open an issue on GitHub
- Contact the development team
