module.exports = {
  apps: [
    {
      name: 'pdpa-req-system',
      script: './server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        // Environment variables will be loaded from .env automatically by dotenv
      }
    }
  ]
};
