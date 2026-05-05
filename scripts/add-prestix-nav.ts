#!/usr/bin/env tsx
/**
 * Add PRESTIX Lifestyle Navigation
 * 
 * NOTE: NavigationItem model does not exist in the current schema.
 * This script is kept for reference but will need to be updated when
 * navigation system is implemented.
 * 
 * Updated for ZenStack v3 ORM
 */

import 'dotenv/config';
import { createClient } from '../src/lib/db';

const systemUser = {
  id: 'system',
  email: 'system@prestix.vip',
  role: 'PLATFORM_ADMIN' as const,
  name: 'System Admin'
};

async function main() {
  const db = createClient(systemUser);
  console.log('🎭 Adding PRESTIX Lifestyle Navigation...\n');

  // TODO: NavigationItem model needs to be added to schema.zmodel
  // For now, this script is a placeholder
  console.log('⚠️  NavigationItem model not found in schema.');
  console.log('   Please add NavigationItem model to schema.zmodel first.');
  console.log('   Or implement navigation using a different approach.');
  
  // Uncomment below when NavigationItem model is available:
  /*
  // Create parent
  const lifestyle = await db.navigationItem.create({
    data: {
      title: 'Lifestyle',
      href: '#',
      icon: 'sparkles',
      authRequired: true,
      category: 'LIFESTYLE',
      sortOrder: 20,
      isActive: true,
      description: 'PRESTIX.VIP premium experiences'
    }
  });

  console.log('✅ Created Lifestyle menu');

  // Create Venue Management submenu
  const venueMenu = await db.navigationItem.create({
    data: {
      title: 'Venue Management',
      href: '#',
      icon: 'building-2',
      authRequired: true,
      category: 'LIFESTYLE',
      parentId: lifestyle.id,
      sortOrder: 1,
      isActive: true,
      description: 'Manage venues and bookings'
    }
  });

  console.log('✅ Created Venue Management submenu');

  // Venue items
  await db.navigationItem.createMany({
    data: [
      {
        title: 'Venues',
        href: '/admin/venueProfile',
        icon: 'building',
        authRequired: true,
        category: 'LIFESTYLE',
        parentId: venueMenu.id,
        sortOrder: 1,
        isActive: true
      },
      {
        title: 'Bookings',
        href: '/admin/booking',
        icon: 'calendar-check',
        authRequired: true,
        category: 'LIFESTYLE',
        parentId: venueMenu.id,
        sortOrder: 2,
        isActive: true
      }
    ]
  });

  console.log('✅ Created 2 Venue items');
  */
  console.log('\n⚠️  Navigation setup skipped - model not available');
}

main().then(() => process.exit(0)).catch(e => { 
  console.error('❌ Script failed:', e); 
  process.exit(1); 
});
