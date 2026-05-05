import { useState, useCallback } from 'react';
import { useToast } from './use-toast';

interface UseAvatarOptions {
  userId: string;
  onSuccess?: (avatarUrl: string | null) => void;
  onError?: (error: string) => void;
}

export function useAvatar({ userId, onSuccess, onError }: UseAvatarOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const updateAvatar = useCallback(async (avatarUrl: string | null) => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/users/${userId}/avatar`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileImageUrl: avatarUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update avatar');
      }

      toast({
        title: 'Avatar Updated',
        description: 'Your avatar has been updated successfully.',
      });

      onSuccess?.(avatarUrl);
      return data.user;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update avatar';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      onError?.(errorMessage);
      throw error;

    } finally {
      setIsLoading(false);
    }
  }, [userId, onSuccess, onError, toast]);

  const removeAvatar = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/users/${userId}/avatar`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove avatar');
      }

      toast({
        title: 'Avatar Removed',
        description: 'Your avatar has been removed successfully.',
      });

      onSuccess?.(null);
      return data.user;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove avatar';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      onError?.(errorMessage);
      throw error;

    } finally {
      setIsLoading(false);
    }
  }, [userId, onSuccess, onError, toast]);

  return {
    updateAvatar,
    removeAvatar,
    isLoading,
  };
}

// Hook for managing user profile updates
export function useUserProfile(userId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const updateProfile = useCallback(async (profileData: {
    name?: string;
    email?: string;
    phone?: string;
    bio?: string;
    dateOfBirth?: string;
    profileImageUrl?: string;
  }) => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      });

      return data.user;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      throw error;

    } finally {
      setIsLoading(false);
    }
  }, [userId, toast]);

  return {
    updateProfile,
    isLoading,
  };
}
