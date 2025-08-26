import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export interface JWTPayload {
  userId: number;
  email: string;
  googleId: string;
}

// Получение информации о пользователе от Google
export async function getGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  const response = await fetch(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch user info from Google');
  }

  return response.json();
}

// Создание или получение пользователя из базы данных
export async function findOrCreateUser(googleUserInfo: GoogleUserInfo) {
  const existingUser = await prisma.user.findUnique({
    where: { googleId: googleUserInfo.id },
  });

  if (existingUser) {
    // Обновляем информацию пользователя
    return await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        email: googleUserInfo.email,
        name: googleUserInfo.name,
        picture: googleUserInfo.picture,
      },
    });
  }

  // Создаем нового пользователя
  return await prisma.user.create({
    data: {
      googleId: googleUserInfo.id,
      email: googleUserInfo.email,
      name: googleUserInfo.name,
      picture: googleUserInfo.picture,
    },
  });
}

// Создание JWT токена
export function createJWT(user: {
  id: number;
  email: string;
  googleId: string;
}): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    googleId: user.googleId,
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: '7d',
  });
}

// Проверка JWT токена
export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret'
    ) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Получение пользователя по JWT токену
export async function getUserFromToken(token: string) {
  const payload = verifyJWT(token);
  if (!payload) return null;

  return await prisma.user.findUnique({
    where: { id: payload.userId },
  });
}
