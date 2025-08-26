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

### 2. Настройка GitHub Secrets

Добавьте необходимые секреты в GitHub репозиторий (см. `GITHUB_SECRETS.md`):

```bash
SERVER_HOST = 138.68.124.16
SERVER_USER = root
SERVER_SSH_KEY = ваш_ssh_ключ
SERVER_PORT = 22
DOMAIN = food.nitive.me
GOOGLE_CLIENT_ID = ваш_google_client_id
GOOGLE_CLIENT_SECRET = ваш_google_client_secret
JWT_SECRET = ваш_jwt_секрет
```

### 3. Автоматический деплой

После настройки секретов:
- **Автоматический деплой** - при каждом push в ветку `main`
- **Ручной деплой** - в Actions → Deploy to Production → Run workflow

### 4. Ручной деплой (локально)

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
