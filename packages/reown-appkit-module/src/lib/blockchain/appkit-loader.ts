import { createClient } from '@/lib/db';
import { getSystemUser } from '@/lib/utils/system-user';

export async function loadAppKitConfig() {
  try {
    // Use system user for configuration loading
    const systemUser = getSystemUser();
    const db = await createClient(systemUser);
    
    const config = await db.appKitConfig.findFirst({
      where: { isActive: true }
    });
    
    if (!config) {
      // Return defaults with proper structure
      return {
        id: 'default',
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID || '122878b95737e1300958ec73a8c0b61a',
        isActive: true,
        themeMode: 'dark',
        themeVariables: {
          '--w3m-accent': '#F59E0B',
          '--w3m-border-radius-master': '8px'
        },
        features: {
          analytics: false,
          allWallets: true,
          email: false,
          socials: []
        },
        enabledNetworks: [11155111], // Sepolia
        defaultNetwork: 11155111,
        appName: 'prestix-app',
        appDescription: 'Real Estate Investment Platform',
        appUrl: process.env.NEXT_PUBLIC_HOST || 'https://prestix.vip',
        appIcons: ['/playlogo.png'],
        adminWallets: ['0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047']
      };
    }

    // Ensure config has required structure with defaults
    return {
      id: config.id || 'default',
      projectId: config.projectId || process.env.NEXT_PUBLIC_PROJECT_ID || '122878b95737e1300958ec73a8c0b61a',
      isActive: config.isActive ?? true,
      themeMode: config.themeMode || 'dark',
      themeVariables: config.themeVariables || {
        '--w3m-accent': '#F59E0B',
        '--w3m-border-radius-master': '8px'
      },
      features: config.features || {
        analytics: false,
        allWallets: true,
        email: false,
        socials: []
      },
      enabledNetworks: config.enabledNetworks || [11155111],
      defaultNetwork: config.defaultNetwork || 11155111,
      appName: config.appName || 'prestix-app',
      appDescription: config.appDescription || 'Real Estate Investment Platform',
      appUrl: config.appUrl || (process.env.NEXT_PUBLIC_HOST || 'https://prestix.vip'),
      appIcons: config.appIcons || ['/playlogo.png'],
      adminWallets: config.adminWallets || ['0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047']
    };
  } catch (error) {
    console.error('Error loading AppKit config:', error);
    // Return defaults on error with proper structure
    return {
      id: 'default',
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID || '122878b95737e1300958ec73a8c0b61a',
      isActive: true,
      themeMode: 'dark',
      themeVariables: {
        '--w3m-accent': '#F59E0B',
        '--w3m-border-radius-master': '8px'
      },
      features: {
        analytics: false,
        allWallets: true,
        email: false,
        socials: []
      },
      enabledNetworks: [11155111],
      defaultNetwork: 11155111,
      appName: 'prestix-app',
      appDescription: 'Real Estate Investment Platform',
      appUrl: process.env.NEXT_PUBLIC_HOST || 'https://prestix.vip',
      appIcons: ['/playlogo.png'],
      adminWallets: ['0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047']
    };
  }
}
