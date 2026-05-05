import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Safe wrapper for useSession to handle cases where SessionProvider is not available
function useSafeSession() {
  try {
    const sessionResult = useSession();
    return sessionResult || { data: null, status: 'loading' };
  } catch (error) {
    console.warn('useSession hook failed, returning safe defaults:', error);
    return { data: null, status: 'loading' };
  }
}

export function useAuth() {
  const { data: session, status } = useSafeSession();
  const router = useRouter();

  const user = session?.user ? {
    id: session.user.id || '',
    email: session.user.email || '',
    name: session.user.name || '',
    role: (session.user as any)?.role || 'CUSTOMER',
    profileImageUrl: (session.user as any)?.profileImageUrl,
    walletAddress: (session.user as any)?.walletAddress,
    authMethod: (session.user as any)?.authMethod || 'email',
  } : null;

  const login = async () => {
    router.push('/sign-in');
  };

  const logout = async () => {
    try {
      await signOut({ redirect: false });
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
      window.location.href = '/';
    }
  };

  const requireAuth = () => {
    if (status === 'loading') return null;
    if (!session || !user) {
      router.push('/sign-in');
      return false;
    }
    return true;
  };

  const requireRole = (requiredRole: string | string[]) => {
    if (status === 'loading') return null;
    if (!session || !user) {
      router.push('/sign-in');
      return false;
    }

    const userRole = user.role;
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    if (!roles.includes(userRole)) {
      router.push('/unauthorized');
      return false;
    }

    return true;
  };

  return {
    user,
    session,
    isLoading: status === 'loading',
    isAuthenticated: !!session && !!user,
    login,
    logout,
    requireAuth,
    requireRole,
  };
}
