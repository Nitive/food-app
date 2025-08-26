# 🔐 GitHub Secrets для деплоя

Для работы GitHub Actions необходимо добавить следующие секреты в настройки репозитория:

## 📍 Где добавить секреты

1. Перейдите в ваш GitHub репозиторий
2. Нажмите на вкладку **Settings**
3. В левом меню выберите **Secrets and variables** → **Actions**
4. Нажмите **New repository secret**

## 🔑 Список необходимых секретов

### 🌐 Сервер

| Секрет           | Описание                   | Пример значения                          |
| ---------------- | -------------------------- | ---------------------------------------- |
| `SERVER_HOST`    | IP адрес или домен сервера | `138.68.124.16`                          |
| `SERVER_USER`    | Пользователь для SSH       | `root`                                   |
| `SERVER_SSH_KEY` | Приватный SSH ключ         | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SERVER_PORT`    | SSH порт (обычно 22)       | `22`                                     |

### 🏷️ Домен

| Секрет   | Описание         | Пример значения  |
| -------- | ---------------- | ---------------- |
| `DOMAIN` | Домен приложения | `food.nitive.me` |

### 🔐 Google OAuth

| Секрет                 | Описание                   | Где взять                                                                 |
| ---------------------- | -------------------------- | ------------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`     | Google OAuth Client ID     | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |

### 🔒 JWT

| Секрет       | Описание                       | Как сгенерировать         |
| ------------ | ------------------------------ | ------------------------- |
| `JWT_SECRET` | Секретный ключ для JWT токенов | `openssl rand -base64 32` |

## 📋 Пошаговая инструкция

### 1. Настройка SSH ключа

```bash
# Генерируем SSH ключ (если еще нет)
ssh-keygen -t ed25519 -C "github-actions@food-app"

# Копируем публичный ключ на сервер
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@138.68.124.16

# Копируем приватный ключ для GitHub
cat ~/.ssh/id_ed25519
```

### 2. Настройка Google OAuth

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите Google+ API
4. Создайте OAuth 2.0 credentials
5. Добавьте домен `food.nitive.me` в разрешенные домены
6. Скопируйте Client ID и Client Secret

### 3. Генерация JWT секрета

```bash
# Генерируем случайный секрет
openssl rand -base64 32
```

### 4. Добавление секретов в GitHub

1. Перейдите в **Settings** → **Secrets and variables** → **Actions**
2. Добавьте каждый секрет:

```
SERVER_HOST = 138.68.124.16
SERVER_USER = root
SERVER_SSH_KEY = -----BEGIN OPENSSH PRIVATE KEY-----
                 ваш_приватный_ключ
                 -----END OPENSSH PRIVATE KEY-----
SERVER_PORT = 22
DOMAIN = food.nitive.me
GOOGLE_CLIENT_ID = ваш_google_client_id
GOOGLE_CLIENT_SECRET = ваш_google_client_secret
JWT_SECRET = ваш_сгенерированный_секрет
```

## 🚀 Активация деплоя

После добавления всех секретов:

1. **Автоматический деплой** - при каждом push в ветку `main`
2. **Ручной деплой** - в Actions → Deploy to Production → Run workflow

## 🔍 Проверка

После успешного деплоя приложение будет доступно по адресу:

- **HTTPS**: https://food.nitive.me
- **HTTP**: http://138.68.124.16 (автоматически перенаправляет на HTTPS)

## 🛠️ Устранение неполадок

### Проблемы с SSH

```bash
# Проверка подключения
ssh -i ~/.ssh/id_ed25519 root@138.68.124.16

# Проверка прав на ключ
chmod 600 ~/.ssh/id_ed25519
```

### Проблемы с Google OAuth

- Убедитесь, что домен добавлен в разрешенные
- Проверьте, что API включен
- Убедитесь, что credentials правильные

### Проблемы с доменом

- Убедитесь, что DNS записи настроены
- Проверьте, что домен указывает на сервер
- Подождите обновления DNS (может занять до 24 часов)

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте логи в GitHub Actions
2. Проверьте логи на сервере: `ssh root@138.68.124.16 'cd /opt/food-app && docker-compose logs'`
3. Убедитесь, что все секреты добавлены правильно
