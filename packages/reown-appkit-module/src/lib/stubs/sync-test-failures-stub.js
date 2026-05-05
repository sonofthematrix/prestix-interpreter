// Stub for sync-test-failures-to-generation script (not available during Vercel builds)
module.exports = {
  syncTestFailuresToGeneration: async () => {
    console.warn('⚠️  Test failure sync script not available (expected during Vercel builds)');
    return Promise.resolve();
  }
};
