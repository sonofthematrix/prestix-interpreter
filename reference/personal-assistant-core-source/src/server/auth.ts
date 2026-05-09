// Re-export auth from the auth directory
// NextAuth handlers are exported from the API route, not here
// For server-side auth, use getServerSession from next-auth
import { getServerSession } from 'next-auth';
import { authOptions } from '../lib/nextauth.config';

export const auth = async () => {
  return await getServerSession(authOptions);
};

export const signIn = async (provider?: string, options?: any) => {
  // Sign in is handled by NextAuth API route
  throw new Error('Use NextAuth API route for sign in');
};

export const signOut = async () => {
  // Sign out is handled by NextAuth API route
  throw new Error('Use NextAuth API route for sign out');
};
