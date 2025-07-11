module.exports = {
  apps: [
    {
      name: 'admin',
      script: 'dist/apps/admin/main.js',
      watch: false,
    },
    {
      name: 'auth',
      script: 'dist/apps/auth/main.js',
      watch: false,
    },
    {
      name: 'connect-platform',
      script: 'dist/apps/connect-platform/main.js',
      watch: false,
    },
  ],
};
