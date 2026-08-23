module.exports = {
  apps: [
    {
      name: "austral-backend",
      cwd: "/opt/austral/backend",
      script: "npm",
      args: "start",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      out_file: "/opt/austral/logs/backend-out.log",
      error_file: "/opt/austral/logs/backend-error.log",
      merge_logs: true,
    },
  ],
};
