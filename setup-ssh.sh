#!/bin/bash

# Скрипт для настройки SSH ключа для GitHub Actions
# Использование: ./setup-ssh.sh [SERVER_IP]

set -e

if [ $# -lt 1 ]; then
    echo "Использование: $0 <SERVER_IP>"
    echo "Пример: $0 138.68.124.16"
    exit 1
fi

SERVER_IP=$1
KEY_NAME="github-actions-food-app"

echo "🔑 Настройка SSH ключа для GitHub Actions..."

# Проверяем, существует ли уже ключ
if [ -f ~/.ssh/${KEY_NAME} ]; then
    echo "⚠️  SSH ключ уже существует: ~/.ssh/${KEY_NAME}"
    read -p "Перезаписать? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Отменено"
        exit 1
    fi
fi

# Генерируем SSH ключ
echo "🔐 Генерируем SSH ключ..."
ssh-keygen -t ed25519 -f ~/.ssh/${KEY_NAME} -C "${KEY_NAME}@$(hostname)" -N ""

# Устанавливаем правильные права
chmod 600 ~/.ssh/${KEY_NAME}
chmod 644 ~/.ssh/${KEY_NAME}.pub

# Копируем публичный ключ на сервер
echo "📤 Копируем публичный ключ на сервер..."
ssh-copy-id -i ~/.ssh/${KEY_NAME}.pub root@${SERVER_IP}

# Тестируем подключение
echo "🧪 Тестируем подключение..."
ssh -i ~/.ssh/${KEY_NAME} root@${SERVER_IP} "echo '✅ SSH подключение работает!'"

echo ""
echo "🎉 SSH ключ успешно настроен!"
echo ""
echo "📋 Для GitHub Actions добавьте следующий секрет:"
echo ""
echo "Имя: SERVER_SSH_KEY"
echo "Значение:"
echo "---"
cat ~/.ssh/${KEY_NAME}
echo "---"
echo ""
echo "📋 Другие необходимые секреты:"
echo "SERVER_HOST = ${SERVER_IP}"
echo "SERVER_USER = root"
echo "SERVER_PORT = 22"
echo "DOMAIN = food.nitive.me"
echo ""
echo "🔐 Для генерации JWT_SECRET выполните:"
echo "openssl rand -base64 32"
echo ""
echo "📖 Подробная инструкция в файле GITHUB_SECRETS.md"
