#!/bin/bash

# Скрипт для деплоя Food App на сервер
# Использование: ./deploy.sh [IP_ADDRESS] [DOMAIN]

set -e

# Проверяем аргументы
if [ $# -lt 1 ]; then
    echo "Использование: $0 <IP_ADDRESS> [DOMAIN]"
    echo "Пример: $0 138.68.124.16 example.com"
    exit 1
fi

SERVER_IP=$1
DOMAIN=${2:-""}

echo "🚀 Начинаем деплой Food App на $SERVER_IP"

# Создаем .env файл для продакшена
echo "📝 Создаем .env файл..."
cat > .env.production << EOF
# База данных
DATABASE_URL=postgresql://food_user:food_password@postgres:5432/food_app

# Google OAuth (замените на ваши значения)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# JWT секрет (сгенерируйте случайную строку)
JWT_SECRET=$(openssl rand -base64 32)

# Окружение
NODE_ENV=production
PORT=3000
EOF

    # Собираем Docker образ
    echo "🔨 Собираем Docker образ..."
    docker build -t food-app:latest .
    docker save food-app:latest | gzip > food-app.tar.gz

    # Создаем архив для деплоя
    echo "📦 Создаем архив для деплоя..."
    tar -czf deployment.tar.gz \
        food-app.tar.gz \
        docker-compose.yml \
        Caddyfile \
        .dockerignore

    # Копируем архив на сервер
    echo "📤 Копируем архив на сервер..."
    scp deployment.tar.gz root@$SERVER_IP:/opt/food-app/

# Подключаемся к серверу и выполняем деплой
echo "🔧 Выполняем деплой на сервере..."
ssh root@$SERVER_IP << EOF
    set -e
    
    echo "📦 Устанавливаем Docker и Docker Compose..."
    # Обновляем систему
    apt update && apt upgrade -y
    
    # Устанавливаем Docker
    if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        usermod -aG docker \$USER
    fi
    
    # Устанавливаем Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi
    
    echo "📁 Создаем директорию приложения..."
    mkdir -p /opt/food-app
    cd /opt/food-app
    
        echo "📦 Распаковываем архив..."
    tar -xzf deployment.tar.gz
    
    echo "🐳 Загружаем Docker образ..."
    docker load < food-app.tar.gz
    
    echo "🔧 Настраиваем Caddyfile для домена..."
    if [ -n "$DOMAIN" ]; then
      # Заменяем localhost на домен в Caddyfile
      sed -i "s/localhost/$DOMAIN/g" Caddyfile
      # Раскомментируем секцию с доменом
      sed -i '/^# example.com {/,/^# }/s/^# //' Caddyfile
      # Удаляем секцию localhost
      sed -i '/^localhost {/,/^}/d' Caddyfile
    fi
    
    echo "🐳 Останавливаем старые контейнеры..."
    docker-compose down || true
    
    echo "🧹 Очищаем старые образы..."
    docker system prune -f
    
    echo "🔨 Запускаем приложение..."
    docker-compose up -d
    
    echo "⏳ Ждем запуска сервисов..."
    sleep 30
    
    echo "🗄️ Выполняем миграции базы данных..."
    docker-compose exec -T app npx prisma migrate deploy
    
    echo "🌱 Заполняем базу данных начальными данными..."
    docker-compose exec -T app npx prisma db seed || true
    
    echo "✅ Проверяем статус сервисов..."
    docker-compose ps
    
    echo "🔍 Проверяем логи..."
    docker-compose logs --tail=20
    
    echo "🧹 Очищаем временные файлы..."
    rm -f deployment.tar.gz food-app.tar.gz
EOF

echo "🎉 Деплой завершен!"
echo "📱 Приложение доступно по адресу:"
if [ -n "$DOMAIN" ]; then
    echo "   https://$DOMAIN"
else
    echo "   http://$SERVER_IP"
fi

echo ""
echo "📋 Полезные команды:"
echo "   Просмотр логов: ssh root@$SERVER_IP 'cd /opt/food-app && docker-compose logs -f'"
echo "   Перезапуск: ssh root@$SERVER_IP 'cd /opt/food-app && docker-compose restart'"
echo "   Остановка: ssh root@$SERVER_IP 'cd /opt/food-app && docker-compose down'"
echo "   Обновление: ./deploy.sh $SERVER_IP $DOMAIN"
