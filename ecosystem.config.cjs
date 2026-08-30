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
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: 465,
        SMTP_USER: 'pdpa.utopia@gmail.com',
        SMTP_PASS: 'bxabpsctfsoqihrh',
      }
    }
  ]
};
