import { beforeEach, describe, expect, it } from 'vitest'
import type { JWTPayload } from '../../auth.js'
import { createJWT, verifyJWT } from '../../auth.js'

// Расширенный интерфейс для JWT с полем exp
interface JWTPayloadWithExp extends JWTPayload {
  exp?: number
}

describe('Auth Utils', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    googleId: 'google123',
  }

  beforeEach(() => {
    // Устанавливаем тестовый секрет для JWT
    process.env.JWT_SECRET = 'test-secret-key'
  })

  describe('createJWT', () => {
    it('должен создавать валидный JWT токен', () => {
      const token = createJWT(mockUser)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT состоит из 3 частей
    })

    it('должен создавать токен с правильными данными', () => {
      const token = createJWT(mockUser)
      const decoded = verifyJWT(token)

      expect(decoded).not.toBeNull()
      expect(decoded?.userId).toBe(mockUser.id)
      expect(decoded?.email).toBe(mockUser.email)
      expect(decoded?.googleId).toBe(mockUser.googleId)
    })

    it('должен создавать токен с истечением через 7 дней', () => {
      const token = createJWT(mockUser)
      const decoded = verifyJWT(token) as JWTPayloadWithExp

      expect(decoded).not.toBeNull()
      expect(decoded.exp).toBeDefined()

      // Проверяем, что токен истекает примерно через 7 дней
      const now = Math.floor(Date.now() / 1000)
      const sevenDaysInSeconds = 7 * 24 * 60 * 60

      expect(decoded.exp).toBeGreaterThan(now)
      expect(decoded.exp).toBeLessThan(now + sevenDaysInSeconds + 60) // +60 секунд для погрешности
    })
  })

  describe('verifyJWT', () => {
    it('должен валидировать правильный токен', () => {
      const token = createJWT(mockUser)
      const decoded = verifyJWT(token)

      expect(decoded).not.toBeNull()
      expect(decoded?.userId).toBe(mockUser.id)
    })

    it('должен возвращать null для невалидного токена', () => {
      const invalidToken = 'invalid.token.here'
      const decoded = verifyJWT(invalidToken)

      expect(decoded).toBeNull()
    })

    it('должен возвращать null для токена с неправильной подписью', () => {
      const token = createJWT(mockUser)
      const tamperedToken = token.slice(0, -10) + 'tampered'
      const decoded = verifyJWT(tamperedToken)

      expect(decoded).toBeNull()
    })

    it('должен возвращать null для пустой строки', () => {
      const decoded = verifyJWT('')
      expect(decoded).toBeNull()
    })
  })
})
