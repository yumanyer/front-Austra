module.exports = {
  apps: [
    {
      name: "austral-backend",
      cwd: "/home/ubuntu/front-Austra/backend",
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
      out_file: "/home/ubuntu/front-Austra/logs/backend-out.log",
      error_file: "/home/ubuntu/front-Austra/logs/backend-error.log",
      merge_logs: true,
    },

    {
      name: "austral-frontend",
      cwd: "/home/ubuntu/front-Austra/frontend",
      script: "server.cjs",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      out_file: "/home/ubuntu/front-Austra/logs/frontend-out.log",
      error_file: "/home/ubuntu/front-Austra/logs/frontend-error.log",
      merge_logs: true,
    },
  ],
};