module.exports = {
  apps: [
    {
      name: 'contract-monitor',
      script: 'scripts/monitor-contracts.ts',
      interpreter: 'bun',
      interpreter_args: 'run',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        // Environment variables will be loaded from .env.local
      },
      error_file: './logs/contract-monitor-error.log',
      out_file: './logs/contract-monitor-out.log',
      log_file: './logs/contract-monitor.log',
      time: true,
      // Restart policy
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      // Health check
      health_check: {
        enabled: true,
        interval: 30000, // 30 seconds
        timeout: 5000,
        unhealthy_threshold: 3,
        healthy_threshold: 2,
      },
    },
  ],
};
