# Используем Node.js 22 Alpine для меньшего размера образа
FROM node:22-alpine AS base

# Устанавливаем pnpm
RUN npm install -g pnpm

# Рабочая директория
WORKDIR /app

# Копируем файлы зависимостей
COPY package.json pnpm-lock.yaml ./

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Копируем исходный код
COPY . .

# Генерируем Prisma клиент
RUN npx prisma generate

# Собираем приложение
RUN pnpm run build

# Продакшн образ
FROM node:18-alpine AS production

# Устанавливаем pnpm
RUN npm install -g pnpm

# Рабочая директория
WORKDIR /app

# Копируем package.json и pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Устанавливаем только продакшн зависимости
RUN pnpm install --frozen-lockfile --prod

# Копируем собранное приложение
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Меняем владельца файлов
RUN chown -R nextjs:nodejs /app
USER nextjs

# Открываем порт
EXPOSE 3000

# Команда запуска
CMD ["node", "dist/api.js"]
