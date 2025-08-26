# Настройка Google OAuth для Food App

## Шаг 1: Создание проекта в Google Cloud Console

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите Google+ API:
   - Перейдите в "APIs & Services" > "Library"
   - Найдите "Google+ API" и включите его

## Шаг 2: Создание OAuth 2.0 credentials

1. Перейдите в "APIs & Services" > "Credentials"
2. Нажмите "Create Credentials" > "OAuth 2.0 Client IDs"
3. Выберите тип приложения "Web application"
4. Заполните форму:
   - **Name**: Food App
   - **Authorized JavaScript origins**:
     - `http://localhost:5173`
     - `http://127.0.0.1:5173`
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/google/callback`
     - `http://127.0.0.1:3000/api/auth/google/callback`

## Шаг 3: Получение credentials

После создания вы получите:

- **Client ID** (например: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
- **Client Secret** (например: `GOCSPX-abcdefghijklmnopqrstuvwxyz`)

## Шаг 4: Настройка переменных окружения

1. Откройте файл `.env` в корне проекта
2. Замените placeholder значения на реальные:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=ваш_client_id_здесь
GOOGLE_CLIENT_SECRET=ваш_client_secret_здесь
JWT_SECRET=создайте_случайный_секретный_ключ_здесь
```

### Генерация JWT_SECRET

Вы можете создать случайный секретный ключ с помощью команды:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Шаг 5: Перезапуск приложения

После настройки переменных окружения перезапустите приложение:

```bash
# Остановите текущие процессы
pkill -f "tsx watch src/api.ts"
pkill -f "vite"

# Запустите заново
pnpm start-backend
pnpm start-frontend
```

## Проверка работы

1. Откройте приложение в браузере: http://localhost:5173
2. Вы должны увидеть страницу входа с кнопкой "Войти через Google"
3. Нажмите на кнопку - вы будете перенаправлены на страницу авторизации Google
4. После успешной авторизации вы будете автоматически перенаправлены обратно в приложение

## Возможные проблемы

### Ошибка "redirect_uri_mismatch"

- Убедитесь, что в Google Cloud Console правильно указан redirect URI
- Проверьте, что нет лишних пробелов или символов

### Ошибка "invalid_client"

- Проверьте правильность Client ID и Client Secret
- Убедитесь, что OAuth 2.0 credentials созданы для веб-приложения

### Ошибка CORS

- Убедитесь, что в Google Cloud Console добавлены правильные JavaScript origins
- Проверьте, что приложение запущено на правильном порту

## Безопасность

- Никогда не коммитьте `.env` файл в git
- Используйте разные credentials для разработки и продакшена
- Регулярно обновляйте JWT_SECRET
- Ограничьте доступ к Google Cloud Console только необходимым пользователям
- JWT токены хранятся в httpOnly куках для безопасности
- Для продакшена добавьте флаг `Secure` к кукам (требует HTTPS)

## Преимущества редиректа

- ✅ Лучше работает на мобильных устройствах
- ✅ Не блокируется блокировщиками popup окон
- ✅ Более надежный процесс авторизации
- ✅ Лучший пользовательский опыт
- ✅ Работает во всех браузерах
