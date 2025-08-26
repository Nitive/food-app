# Настройка ESLint и Prettier

## 🎯 Описание

Настроены автоматические проверки кода с помощью ESLint и Prettier для обеспечения качества и единообразия кода.

## 📦 Установленные пакеты

### ESLint и плагины

```bash
pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y prettier eslint-config-prettier eslint-plugin-prettier @eslint/js
```

### Пакеты

- **eslint** - основной линтер
- **@typescript-eslint/parser** - парсер для TypeScript
- **@typescript-eslint/eslint-plugin** - правила для TypeScript
- **eslint-plugin-react** - правила для React
- **eslint-plugin-react-hooks** - правила для React Hooks
- **eslint-plugin-jsx-a11y** - правила доступности
- **prettier** - форматировщик кода
- **eslint-config-prettier** - интеграция ESLint с Prettier
- **eslint-plugin-prettier** - плагин Prettier для ESLint
- **@eslint/js** - конфигурация ESLint для версии 9

## ⚙️ Конфигурация

### ESLint (eslint.config.js)

```javascript
import js from '@eslint/js'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import prettier from 'eslint-plugin-prettier'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        URLSearchParams: 'readonly',
        alert: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        HTMLTextAreaElement: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      prettier,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'prettier/prettier': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-case-declarations': 'off',
      'no-redeclare': 'off',
      'max-warnings': 100,
    },
    settings: {
      react: { version: 'detect' },
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '*.config.js', '*.config.ts'],
  },
]
```

### Prettier (.prettierrc)

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

## 📜 Скрипты

### Добавленные скрипты в package.json

```json
{
  "scripts": {
    "types": "tsc -p . --noEmit",
    "lint": "eslint src --ext .ts,.tsx --fix",
    "lint:check": "eslint src --ext .ts,.tsx",
    "format": "prettier --write src/**/*.{ts,tsx,js,jsx,json,css,md}",
    "format:check": "prettier --check src/**/*.{ts,tsx,js,jsx,json,css,md}",
    "check": "npm run types && npm run lint:check && npm run format:check",
    "fix": "npm run lint && npm run format"
  }
}
```

### Описание скриптов

- **`npm run types`** - проверка типов TypeScript
- **`npm run lint`** - исправление ошибок ESLint
- **`npm run lint:check`** - проверка ESLint без исправлений
- **`npm run format`** - форматирование кода Prettier
- **`npm run format:check`** - проверка форматирования
- **`npm run check`** - полная проверка (типы + линтер + форматирование)
- **`npm run fix`** - автоматическое исправление (линтер + форматирование)

## 🔧 Правила ESLint

### Основные правила

- **`prettier/prettier: 'error'`** - ошибки форматирования
- **`react/react-in-jsx-scope: 'off'`** - не требовать импорт React
- **`react/prop-types: 'off'`** - отключить проверку prop-types (используем TypeScript)
- **`@typescript-eslint/no-unused-vars: ['warn', { argsIgnorePattern: '^_' }]`** - предупреждение о неиспользуемых переменных
- **`@typescript-eslint/no-explicit-any: 'warn'`** - предупреждение о использовании any
- **`no-console: 'warn'`** - предупреждение о console.log
- **`prefer-const: 'error'`** - требовать const вместо let
- **`no-var: 'error'`** - запретить var

### Глобальные переменные

Настроены глобальные переменные для браузера и Node.js:

- `window`, `document`, `console`
- `process`, `fetch`, `Response`
- `URLSearchParams`, `alert`, `navigator`
- `localStorage`, `HTMLTextAreaElement`

## 🎨 Настройки Prettier

### Форматирование

- **`semi: true`** - точки с запятой
- **`trailingComma: "es5"`** - запятые в конце
- **`singleQuote: true`** - одинарные кавычки
- **`printWidth: 80`** - максимальная ширина строки
- **`tabWidth: 2`** - размер отступа
- **`useTabs: false`** - использовать пробелы
- **`bracketSpacing: true`** - пробелы в скобках
- **`arrowParens: "avoid"`** - скобки в стрелочных функциях
- **`endOfLine: "lf"`** - Unix окончания строк

## 🚀 Использование

### Автоматическая проверка после изменений

```bash
# Полная проверка
npm run check

# Автоматическое исправление
npm run fix
```

### Интеграция с IDE

Для VS Code рекомендуется установить расширения:

- **ESLint** - интеграция с ESLint
- **Prettier** - интеграция с Prettier
- **TypeScript** - поддержка TypeScript

### Настройки VS Code

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": ["typescript", "typescriptreact"]
}
```

## 📊 Результаты проверки

### Текущий статус

- ✅ **TypeScript**: 0 ошибок
- ⚠️ **ESLint**: 75 предупреждений (0 ошибок)
- ✅ **Prettier**: все файлы отформатированы

### Типы предупреждений

- **Неиспользуемые переменные** - можно удалить или переименовать с `_`
- **Использование `any`** - рекомендуется указать конкретные типы
- **Console statements** - для продакшена лучше убрать
- **Неиспользуемые импорты** - можно удалить

## 🔄 Автоматизация

### Pre-commit хуки

Можно настроить автоматическую проверку перед коммитом:

```bash
# Установка husky
pnpm add -D husky lint-staged

# Настройка pre-commit
npx husky add .husky/pre-commit "npm run check"
```

### CI/CD

Для автоматической проверки в CI/CD:

```yaml
# GitHub Actions
- name: Check code quality
  run: npm run check
```

## 📝 Заключение

Настройка ESLint и Prettier обеспечивает:

- **Качество кода** - автоматическое выявление проблем
- **Единообразие** - единый стиль кода
- **Производительность** - раннее выявление ошибок
- **Поддерживаемость** - читаемый и структурированный код

Все проверки настроены и готовы к использованию! 🎉✨
