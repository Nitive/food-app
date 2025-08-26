# Подключение шрифта Inter с Google Fonts

## Обзор

В приложении Food App подключен шрифт **Inter** от Google Fonts для обеспечения современного и читаемого интерфейса.

## 🎨 Шрифт Inter

**Inter** - это шрифт без засечек, специально разработанный для пользовательских интерфейсов. Он обеспечивает:

- Отличную читаемость на всех размерах экрана
- Современный и чистый дизайн
- Оптимизацию для цифровых устройств
- Поддержку множества языков

## 🔧 Реализация

### 1. HTML подключение (index.html)

```html
<!-- Google Fonts - Inter -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap"
  rel="stylesheet"
/>
```

**Особенности:**

- `preconnect` - ускоряет загрузку шрифтов
- `crossorigin` - для безопасной загрузки
- Все веса шрифта (100-900) для гибкости
- `display=swap` - предотвращает FOUT (Flash of Unstyled Text)

### 2. CSS стили

```css
/* Применяем шрифт Inter ко всему приложению */
* {
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    'Roboto',
    'Oxygen',
    'Ubuntu',
    'Cantarell',
    'Fira Sans',
    'Droid Sans',
    'Helvetica Neue',
    sans-serif;
}

body {
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    'Roboto',
    'Oxygen',
    'Ubuntu',
    'Cantarell',
    'Fira Sans',
    'Droid Sans',
    'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  margin: 0;
  padding: 0;
}

#app {
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    'Roboto',
    'Oxygen',
    'Ubuntu',
    'Cantarell',
    'Fira Sans',
    'Droid Sans',
    'Helvetica Neue',
    sans-serif;
}
```

**Fallback шрифты:**

- `-apple-system` - системный шрифт macOS/iOS
- `BlinkMacSystemFont` - системный шрифт macOS
- `Segoe UI` - системный шрифт Windows
- `Roboto` - шрифт Android
- Другие системные шрифты

### 3. Mantine конфигурация

```typescript
<MantineProvider
  theme={{
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    fontFamilyMonospace: 'Monaco, Courier, monospace',
    headings: {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    },
  }}
>
```

## 📊 Доступные веса шрифта

| Вес | Описание    | Использование        |
| --- | ----------- | -------------------- |
| 100 | Thin        | Тонкие акценты       |
| 200 | Extra Light | Подзаголовки         |
| 300 | Light       | Основной текст       |
| 400 | Regular     | Основной текст       |
| 500 | Medium      | Полужирный текст     |
| 600 | Semi Bold   | Заголовки            |
| 700 | Bold        | Основные заголовки   |
| 800 | Extra Bold  | Крупные заголовки    |
| 900 | Black       | Выделенные заголовки |

## 🎯 Использование в компонентах

### Mantine компоненты

```typescript
// Автоматически используют Inter через тему
<Text fw={600}>Полужирный текст</Text>
<Title order={1}>Заголовок</Title>
<Button>Кнопка</Button>
```

### Кастомные стили

```typescript
// Можно указать конкретный вес
<Text style={{ fontWeight: 500 }}>Средний вес</Text>
<Text fw={700}>Жирный текст</Text>
```

## ⚡ Оптимизация производительности

### 1. Preconnect

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
```

Ускоряет загрузку шрифтов на 100-500ms.

### 2. Display Swap

```html
<link href="...&display=swap" rel="stylesheet" />
```

Предотвращает FOUT (Flash of Unstyled Text).

### 3. Font Smoothing

```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

Улучшает рендеринг шрифтов на разных платформах.

## 🌐 Поддержка браузеров

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ Opera 47+

## 📱 Адаптивность

Шрифт Inter оптимизирован для:

- **Desktop** - отличная читаемость на больших экранах
- **Tablet** - оптимальный размер для планшетов
- **Mobile** - четкость на маленьких экранах
- **High DPI** - кристальная четкость на Retina дисплеях

## 🔍 Проверка подключения

### В браузере

1. Откройте DevTools (F12)
2. Перейдите во вкладку Network
3. Найдите запросы к `fonts.googleapis.com`
4. Проверьте, что шрифты загрузились

### В коде

```javascript
// Проверка загрузки шрифта
document.fonts.ready.then(() => {
  console.log('Шрифты загружены')
})
```

## 🎨 Цветовая схема

Шрифт Inter отлично сочетается с:

- **Teal** - основной цвет приложения
- **Sage** - позитивные действия
- **Amber** - предупреждения
- **Indigo** - вторичные элементы
- **Slate** - нейтральные элементы
- **Rose** - удаление/отмена

## 📈 Преимущества

### Для пользователей

- **Читаемость** - отличная читаемость на всех устройствах
- **Современность** - актуальный дизайн
- **Скорость** - быстрая загрузка благодаря оптимизации

### Для разработчиков

- **Консистентность** - единый шрифт во всем приложении
- **Гибкость** - множество весов для разных нужд
- **Производительность** - оптимизированная загрузка

### Для бизнеса

- **UX** - улучшенный пользовательский опыт
- **Брендинг** - современный и профессиональный вид
- **Доступность** - отличная читаемость для всех пользователей

## 🚀 Будущие улучшения

### Планируемые оптимизации

- **Variable Fonts** - использование переменных шрифтов для экономии трафика
- **Self-Hosting** - локальное хранение шрифтов для офлайн работы
- **Subset** - подмножество символов для конкретных языков

### Мониторинг

- **Web Vitals** - отслеживание метрик производительности
- **Font Loading** - мониторинг времени загрузки шрифтов
- **User Experience** - анализ влияния на пользовательский опыт

## 📝 Заключение

Шрифт Inter успешно интегрирован в приложение Food App, обеспечивая современный, читаемый и профессиональный интерфейс. Оптимизация загрузки и fallback шрифты гарантируют отличный пользовательский опыт на всех устройствах и браузерах.
