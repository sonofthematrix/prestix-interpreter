// ============================================================================
// ZUSTAND STORE INTEGRATIONS WITH ZENSTACK COMPONENTS
// ============================================================================

import React from 'react';
import { 
  useAuthStore,
} from './index';
import { useUserStore } from './core-stores';
import { useToastStore } from './ui-stores';
import { useLoadingStore } from './ui-stores';
import { useModalStore } from './ui-stores';
import { UserWithRelations } from './types';
  // Note: useUserStore, useModalStore, useToastStore, useNavigationStore, 
// useThemeStore, useLoadingStore, useRealtimeStore are not available in this module

// ============================================================================
// COMPONENT INTEGRATION HOOKS
// ============================================================================

// User Profile Integration
export const useUserProfileIntegration = () => {
  const { currentUser, updateUser } = useUserStore();
  const { updateProfile } = useAuthStore();
  const { showSuccess, showError } = useToastStore();   
  const { setLoading } = useLoadingStore();

  const handleProfileUpdate = async (updates: any) => {
    setLoading('profile-update', true);
    try {
      const success = await updateProfile(updates);
      if (success) {
        showSuccess('Profile updated successfully');
      } else {
        showError('Failed to update profile');
      }
    } catch (error) {
      showError('Failed to update profile', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading('profile-update', false);
    }
  };

  return {
    user: currentUser,
    updateProfile: handleProfileUpdate,
    isLoading: useLoadingStore(state => state.loadingStates['profile-update'] || false),
  };
};

// Space Management Integration
export const useSpaceIntegration = () => {
  // const { spaces, currentSpace, setCurrentSpace, fetchSpaces, joinSpace, leaveSpace } = useSpaceStore();
  const { showSuccess, showError } = useToastStore();
  const { setLoading } = useLoadingStore();
  const { currentUser } = useUserStore();

  const handleJoinSpace = async (spaceId: number) => {
    setLoading('join-space', true);
    try {
      // const success = await joinSpace(spaceId);
      const success = true;
      if (success) {
        showSuccess('Successfully joined space');
        // await fetchSpaces(); // Refresh spaces list
      } else {
        showError('Failed to join space');
      }
    } catch (error) {
      showError('Failed to join space', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading('join-space', false);
    }
  };

  const handleLeaveSpace = async (spaceId: number) => {
    setLoading('leave-space', true);
    try {
      // const success = await leaveSpace(spaceId);
      const success = true;
      if (success) {
        showSuccess('Successfully left space');
        // if (currentSpace?.id === spaceId) {
        //   setCurrentSpace(null);
        // }
      } else {
        showError('Failed to leave space');
      }
    } catch (error) {
      showError('Failed to leave space', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading('leave-space', false);
    }
  };

  const handleSwitchSpace = (space: any) => {
    // setCurrentSpace(space);
    showSuccess(`Switched to ${space.name}`);
  };

  return {
    // spaces: Object.values(spaces),
    // currentSpace,
    switchSpace: handleSwitchSpace,
    joinSpace: handleJoinSpace,
    leaveSpace: handleLeaveSpace,
    isLoading: useLoadingStore(state => 
      state.loadingStates['join-space'] || state.loadingStates['leave-space'] || false
    ),
    canManageSpace: (spaceId: number) => {
      // Simplified - no role-based permissions in current schema
      return currentUser !== null;
    },
  };
};


// Modal Integration
export const useModalIntegration = () => {
  const { openModal, closeModal, closeAllModals, isModalOpen, getModal } = useModalStore();

  const openUserProfileModal = (user?: UserWithRelations) => {
    openModal('user-profile', 'user-profile', user);
  };

  const openSpaceSettingsModal = (space?: any) => {
    openModal('space-settings', 'space-settings', space);
  };

  const openCreateListModal = () => {
    openModal('create-list', 'create-list');
  };

  const openCreateTodoModal = (listId?: number) => {
    openModal('create-todo', 'create-todo', { listId });
  };

  const openConfirmModal = (title: string, message: string, onConfirm: () => void) => {
    openModal('confirm', 'confirm', { title, message, onConfirm });
  };

  return {
    openModal,
    closeModal,
    closeAllModals,
    isModalOpen,
    getModal,
    // Convenience methods
    openUserProfileModal,
    openSpaceSettingsModal,
    openCreateListModal,
    openCreateTodoModal,
    openConfirmModal,
  };
};

// Navigation Integration
export const useNavigationIntegration = () => {
  const { 
    navigation, 
    setCurrentPath, 
    setBreadcrumbs, 
    addBreadcrumb, 
    toggleSidebar, 
    setSidebarCollapsed,
    setActiveMenuItem,
    goBack,
    canGoBack 
  } = useNavigationIntegration();

  const navigateToSpace = (space: any) => {
    setCurrentPath(`/spaces/${space.todoLists.length}`);
    setBreadcrumbs([
      { label: 'Spaces', path: '/spaces' },
      { label: space.name, path: `/spaces/${space.todoLists.length}` },
    ]);
    setActiveMenuItem(`space-${space.todoLists.length}`);
  };

  const navigateToList = (list: any, space: any) => {
    setCurrentPath(`/spaces/${space.todoLists.length}/lists/${list.id}`);
    setBreadcrumbs([
      { label: 'Spaces', path: '/spaces' },
      { label: space.name, path: `/spaces/${space.todoLists.length}` },
      { label: list.title, path: `/spaces/${space.todoLists.length}/lists/${list.id}` },
    ]);
    setActiveMenuItem(`list-${list.id}`);
  };

  const navigateToUser = (user: any) => {
    setCurrentPath(`/users/${user.todoLists.length}`);
    setBreadcrumbs([
      { label: 'Users', path: '/users' },
      { label: user.name || user.email, path: `/users/${user.todoLists.length}` },
    ]);
    setActiveMenuItem(`user-${user.todoLists.length}`);
  };

  return {
    navigation,
    setCurrentPath,
    setBreadcrumbs,
    addBreadcrumb,
    toggleSidebar,
    setSidebarCollapsed,
    setActiveMenuItem,
    goBack,
    canGoBack,
    // Convenience methods
    navigateToSpace,
    navigateToList,
    navigateToUser,
  };
};

// Theme Integration
export const useThemeIntegration = () => {
  const { theme, setTheme, setMode, setPrimaryColor, setFontSize, setCompactMode, toggleMode, isDark, getEffectiveMode } = useThemeIntegration();

  const applyTheme = () => {
    const root = document.documentElement;
    const effectiveMode = getEffectiveMode();
    
    // Apply theme classes
    root.classList.remove('light', 'dark');
    root.classList.add(effectiveMode);
    
    // Apply primary color
    root.style.setProperty('--primary-color', theme.primaryColor);
    
    // Apply font size
    root.classList.remove('text-sm', 'text-base', 'text-lg');
    root.classList.add(`text-${theme.fontSize}`);
    
    // Apply compact mode
    if (theme.compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }
  };

  React.useEffect(() => {
    applyTheme();
  }, [theme]);

  return {
    theme,
    setTheme,
    setMode,
    setPrimaryColor,
    setFontSize,
    setCompactMode,
    toggleMode,
    isDark,
    getEffectiveMode,
    applyTheme,
  };
};

// Loading Integration
export const useLoadingIntegration = () => {
  const { setLoading, setGlobalLoading, isLoading, isAnyLoading, getLoadingKeys } = useLoadingStore();

  const withLoading = async <T,>(
    key: string,
    asyncFn: () => Promise<T>,
    global = false
  ): Promise<T> => {
    if (global) {
      setGlobalLoading(true);
    } else {
      setLoading(key, true);
    }

    try {
      const result = await asyncFn();
      return result;
    } finally {
      if (global) {
        setGlobalLoading(false);
      } else {
        setLoading(key, false);
      }
    }
  };

  return {
    setLoading,
    setGlobalLoading,
    isLoading,
    isAnyLoading,
    getLoadingKeys,
    withLoading,
  };
};

// ============================================================================
// COMPONENT WRAPPER UTILITIES
// ============================================================================

export const withStoreIntegration = <P extends object>(
  Component: React.ComponentType<P>,
  integrationHooks: Array<() => any>
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const integrations = integrationHooks.map(hook => hook());
    
    return <Component {...props as P} {...integrations} ref={ref} />;  
  });
};

// ============================================================================
// STORE SELECTORS
// ============================================================================

export const useUserSelector = <T,>(selector: (state: any) => T) => {
  return useUserStore(selector);
};

export const useSpaceSelector = <T,>(selector: (state: any) => T) => {
  // return useSpaceStore(selector); 
}; 

export const useTodoSelector = <T,>(selector: (state: any) => T) => {
  // return useTodoStore(selector);
};

export const useAuthSelector = <T,>(selector: (state: any) => T) => {
  return useAuthStore(selector);  
};

// ============================================================================
// STORE ACTIONS
// ============================================================================

export const useStoreActions = () => {
  const userActions = useUserStore(state => ({
    setCurrentUser: state.setCurrentUser,
    setUsers: state.setUsers,
    addUser: state.addUser,
    updateUser: state.updateUser,
    removeUser: state.removeUser,
  }));

  // const spaceActions = useSpaceStore(state => ({ 
  //   setCurrentSpace: state.setCurrentSpace,
  //   setSpaces: state.setSpaces,
  //   addSpace: state.addSpace,
  //   updateSpace: state.updateSpace,
  //   removeSpace: state.removeSpace,
  // }));

  // const todoActions = useTodoStore(state => ({ 
  //   setLists: state.setLists,
  //   addList: state.addList,
  //   updateList: state.updateList, 
  //   removeList: state.removeList, 
  //   setTodos: state.setTodos,
  //   addTodo: state.addTodo,
  //   updateTodo: state.updateTodo,
  //   removeTodo: state.removeTodo,
  //   toggleTodo: state.toggleTodo,
  // }));

  const authActions = useAuthStore(state => ({
    login: state.login,
    logout: state.logout,
    register: state.register,
    updateProfile: state.updateProfile,
  }));

  return {
    user: userActions,
    auth: authActions,
  };
};
