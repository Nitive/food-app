# 🚀 Деплой Food App

## Требования

- Сервер с Ubuntu/Debian
- SSH доступ к серверу
- Домен `food.nitive.me` (уже настроен)

## Быстрый деплой

### 1. Подготовка

Убедитесь, что у вас есть:
- SSH ключ для доступа к серверу
- Google OAuth credentials (для авторизации)

### 2. Настройка переменных окружения

Отредактируйте файл `.env.production` или создайте его:

```bash
# База данных
DATABASE_URL=postgresql://food_user:food_password@postgres:5432/food_app

# Google OAuth (замените на ваши значения)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# JWT секрет (сгенерируйте случайную строку)
JWT_SECRET=your_jwt_secret

# Окружение
NODE_ENV=production
PORT=3000
```

### 3. Запуск деплоя

```bash
# Деплой на IP адрес
./deploy.sh 138.68.124.16

# Деплой с доменом (автоматически настроит HTTPS)
./deploy.sh 138.68.124.16 food.nitive.me
```

## Архитектура

Приложение развертывается с помощью Docker Compose и включает:

- **PostgreSQL** - база данных
- **Node.js App** - основное приложение
- **Caddy** - веб-сервер с автоматическим HTTPS

## Структура файлов

```
/opt/food-app/
├── docker-compose.yml    # Конфигурация Docker
├── Dockerfile           # Образ приложения
├── Caddyfile           # Конфигурация Caddy
├── .env.production     # Переменные окружения
└── src/                # Исходный код
```

## Управление

### Просмотр логов
```bash
ssh root@138.68.124.16 'cd /opt/food-app && docker-compose logs -f'
```

### Перезапуск
```bash
ssh root@138.68.124.16 'cd /opt/food-app && docker-compose restart'
```

### Остановка
```bash
ssh root@138.68.124.16 'cd /opt/food-app && docker-compose down'
```

### Обновление
```bash
./deploy.sh 138.68.124.16 food.nitive.me
```

## Доступ

После деплоя приложение будет доступно по адресу:
- **HTTPS**: https://food.nitive.me
- **HTTP**: http://138.68.124.16 (автоматически перенаправляет на HTTPS)

## Безопасность

- Автоматический HTTPS с Let's Encrypt
- Изолированные Docker контейнеры
- Непривилегированный пользователь в контейнере
- Переменные окружения для секретов

## Мониторинг

### Проверка статуса
```bash
ssh root@138.68.124.16 'cd /opt/food-app && docker-compose ps'
```

### Проверка логов
```bash
ssh root@138.68.124.16 'cd /opt/food-app && docker-compose logs --tail=50'
```

### Проверка базы данных
```bash
ssh root@138.68.124.16 'cd /opt/food-app && docker-compose exec postgres psql -U food_user -d food_app'
```

## Устранение неполадок

### Проблемы с подключением к базе данных
```bash
ssh root@138.68.124.16 'cd /opt/food-app && docker-compose exec app npx prisma db push'
```

### Проблемы с миграциями
```bash
ssh root@138.68.124.16 'cd /opt/food-app && docker-compose exec app npx prisma migrate reset'
```

### Проблемы с SSL
```bash
ssh root@138.68.124.16 'cd /opt/food-app && docker-compose logs caddy'
```

## Резервное копирование

### База данных
```bash
ssh root@138.68.124.16 'cd /opt/food-app && docker-compose exec postgres pg_dump -U food_user food_app > backup.sql'
```

### Восстановление
```bash
ssh root@138.68.124.16 'cd /opt/food-app && docker-compose exec -T postgres psql -U food_user -d food_app < backup.sql'
```
