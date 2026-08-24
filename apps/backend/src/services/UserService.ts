import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

export const registerUser = async (email: string, passwordHashRaw: string, name: string, role: 'PATIENT' | 'DOCTOR' | 'ADMIN') => {
  const passwordHash = await bcrypt.hash(passwordHashRaw, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role },
  });
  
  if (role === 'PATIENT') {
    await prisma.patient.create({ data: { userId: user.id } });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_ACCESS_SECRET || 'secret', { expiresIn: '7d' });
  const refreshToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_REFRESH_SECRET || 'refresh_secret', { expiresIn: '30d' });
  return { user, token, refreshToken };
};

export const loginUser = async (email: string, passwordRaw: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Invalid credentials');

  const match = await bcrypt.compare(passwordRaw, user.passwordHash);
  if (!match) throw new Error('Invalid credentials');

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_ACCESS_SECRET || 'secret', { expiresIn: '7d' });
  const refreshToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_REFRESH_SECRET || 'refresh_secret', { expiresIn: '30d' });
  return { user, token, refreshToken };
};

export const refreshUserToken = async (refreshToken: string) => {
  if (!refreshToken) throw new Error('Refresh token required');
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh_secret') as any;
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user) throw new Error('User not found');

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_ACCESS_SECRET || 'secret', { expiresIn: '7d' });
  const newRefreshToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_REFRESH_SECRET || 'refresh_secret', { expiresIn: '30d' });
  return { user, token, refreshToken: newRefreshToken };
};

