module.exports = {
  apps: [
    {
      name: "km-web",
      cwd: "/var/www/kelajak-mediklari",
      script: "pnpm",
      args: "--filter @km/web start",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "km-bot",
      cwd: "/var/www/kelajak-mediklari",
      script: "pnpm",
      args: "--filter @km/bot start",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
