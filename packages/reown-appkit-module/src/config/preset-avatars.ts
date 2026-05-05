// Preset avatar options for user profile selection
// PRESTIX-themed avatars

export interface PresetAvatar {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  category: 'prestix' | 'default';
}

export const presetAvatars: PresetAvatar[] = [
  {
    id: 'prestix1',
    name: 'Majestic Prestix',
    imageUrl: '/images/avatars/prestix1.png',
    description: 'A powerful and regal avatar with geometric styling',
    category: 'prestix'
  },
  {
    id: 'prestix2',
    name: 'Vibrant Prestix',
    imageUrl: '/images/avatars/prestix2.png',
    description: 'A colorful and energetic avatar with pop-art styling',
    category: 'prestix'
  },
  {
    id: 'prestix3',
    name: 'Geometric Prestix',
    imageUrl: '/images/avatars/prestix3.png',
    description: 'A modern geometric avatar with bold colors',
    category: 'prestix'
  },
  {
    id: 'prestix4',
    name: 'Abstract Prestix',
    imageUrl: '/images/avatars/prestix4.png',
    description: 'An abstract avatar with vibrant color palette',
    category: 'prestix'
  },
  {
    id: 'prestix5',
    name: 'Crystalline Prestix',
    imageUrl: '/images/avatars/prestix5.png',
    description: 'A crystalline avatar with low-poly styling',
    category: 'prestix'
  },
  {
    id: 'prestix6',
    name: 'Classic Prestix',
    imageUrl: '/images/avatars/prestix6.png',
    description: 'A classic avatar with traditional styling',
    category: 'prestix'
  }
];

// Helper function to get avatar by ID
export function getAvatarById(id: string): PresetAvatar | undefined {
  return presetAvatars.find(avatar => avatar.id === id);
}

// Helper function to get all Prestix avatars
export function getPrestixAvatars(): PresetAvatar[] {
  return presetAvatars.filter(avatar => avatar.category === 'prestix');
}

/** @deprecated Use getPrestixAvatars instead */
export const getTigerAvatars = getPrestixAvatars;

// Helper function to validate avatar URL
export function isValidAvatarUrl(url: string): boolean {
  if (!url) return false;
  
  // Check if it's a preset avatar
  const presetAvatar = presetAvatars.find(avatar => avatar.imageUrl === url);
  if (presetAvatar) return true;
  
  // Check if it's a valid external URL
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Default avatar fallback
export const defaultAvatar: PresetAvatar = {
  id: 'default',
  name: 'Default Avatar',
  imageUrl: '/images/avatars/default-avatar.png',
  description: 'Default user avatar',
  category: 'default'
};
