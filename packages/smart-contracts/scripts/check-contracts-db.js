/**
 * Check Contracts Database - JavaScript Version
 */

console.log('📊 CHECKING CONTRACT DATABASE (JS VERSION)\n');

try {
  // Load environment
  require('dotenv').config();

  console.log('✅ Environment loaded');

  // Check if we can load the database client
  try {
    const { createClient } = require('../../../src/lib/db');
    console.log('✅ Database client loaded');

    const systemUser = {
      id: 'system',
      email: 'system@TKNZN.pro',
      role: 'ADMIN',
      name: 'System Admin'
    };

    const db = createClient(systemUser);
    console.log('✅ Database connection created');

    // This would normally query the database
    // For now, just show that the imports work

  } catch (dbError) {
    console.error('❌ Database loading error:', dbError.message);
  }

} catch (error) {
  console.error('❌ General error:', error.message);
}

console.log('\n🎯 Script completed');