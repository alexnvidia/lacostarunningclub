import jwt from 'jsonwebtoken';

export const generateValidToken = (payload = {}) => {
  return jwt.sign(
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      role: 'user',
      ...payload,
    },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '1h' }
  );
};

export const generateExpiredToken = () => {
  return jwt.sign(
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      role: 'user',
    },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '-1h' } // Token ya expirado
  );
};

export const generateAdminToken = () => {
  return generateValidToken({ role: 'admin' });
};

export const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  password: 'Test123!',
  first_name: 'Test',
  last_name: 'User',
  role: 'user',
};
