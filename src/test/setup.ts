// Глобальные настройки для тестов
import { beforeAll } from 'vitest'

beforeAll(() => {
  // Устанавливаем переменные окружения для тестов
  process.env.JWT_SECRET = 'test-secret-key'
  process.env.NODE_ENV = 'test'
})
