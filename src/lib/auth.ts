import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'secret-key-123';

export function signToken(payload: any) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}
