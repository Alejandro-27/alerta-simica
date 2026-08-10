import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    env: {
      NODE_ENV: 'test',
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      MONGODB_URI: 'mongodb://localhost:27017/alertasimica_test',
      VAPID_PUBLIC_KEY: 'test-public-key-0123456789abcdef',
      VAPID_PRIVATE_KEY: 'test-private-key-0123456789abcdef',
      VAPID_SUBJECT: 'mailto:test@example.com',
      EARTHQUAKE_MIN_MAGNITUDE: '4.5',
      EARTHQUAKE_ALERT_RADIUS_KM: '100',
      LOG_FORMAT: 'json',
      LOG_LEVEL: 'silent',
    },
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/app.ts', 'src/config/**'],
    },
    pool: 'forks',
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
