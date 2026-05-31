// Setup global para todos los tests
beforeAll(() => {
  // Configuración global
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'your-super-secret-jwt-key-change-in-production-please-12345';
});

afterAll(() => {
  // Cleanup global
});
