import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  Grid,
  Group,
  List,
  LoadingOverlay,
  MantineProvider,
  Modal,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core'
import { useStore } from '@nanostores/react'
import {
  CalendarIcon,
  CheckCircleFillIcon,
  HeartFillIcon,
  HeartIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XCircleFillIcon,
  GlobeIcon,
  LockIcon,
} from '@primer/octicons-react'
import jsPDF from 'jspdf'
import { atom } from 'nanostores'
import React from 'react'
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router'
import {
  apiClient,
  type CalendarItem,
  type Ingredient,
  type Recipe,
  type ShoppingListItem,
  type ShoppingListResponse,
  type StockItem,
  type User,
} from './api-client.js'
import { Breadcrumbs } from './components/Breadcrumbs.js'
import { Login } from './components/Login.js'
import { MainNavigation } from './components/MainNavigation.js'
import { ProfileReminderModal } from './components/ProfileReminderModal.js'
import { QuickActions } from './components/QuickActions.js'
import { UserMenu } from './components/UserMenu.js'
import { UserProfileModal } from './components/UserProfileModal.js'

// Интерфейс для записей дневника питания
interface FoodDiaryEntry {
  id: string
  recipeId: number
  recipeName: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  servingSize: number
  calories: number
  proteins: number
  fats: number
  carbohydrates: number
  timestamp: string
  date: string
}

import { AddToCalendarModal } from './components/AddToCalendarModal.js'
import { EditRecipeForm } from './components/EditRecipeForm.js'
import { FavoritesPage } from './pages/FavoritesPage.js'
import { FoodDiaryPage } from './pages/FoodDiaryPage.js'
import { PublicRecipesPage } from './pages/PublicRecipesPage.js'
import { ShoppingListPage } from './pages/ShoppingListPage.js'
import { StatsPage } from './pages/StatsPage.js'

function Providers(props: { children: React.ReactNode }) {
  return (
    <MantineProvider
      defaultColorScheme="light"
      theme={{
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
        fontFamilyMonospace: 'Monaco, Courier, monospace',
        headings: {
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
        },
      }}
    >
      <BrowserRouter basename="/">{props.children}</BrowserRouter>
    </MantineProvider>
  )
}

// Состояние загрузки
const $loading = atom(false)

// Состояние рецептов
const $recipes = atom<Recipe[]>([])

// Состояние ингредиентов
const $ingredients = atom<Ingredient[]>([])

// Состояние наличия ингредиентов
const $stockItems = atom<StockItem[]>([])

// Состояние списка покупок
const $shoppingList = atom<ShoppingListResponse>({
  items: [],
  date: '',
  recipes: [],
})

// Состояние календаря
const $calendarItems = atom<CalendarItem[]>([])

// Состояние любимых рецептов
const $favoriteRecipes = atom<Recipe[]>([])

// Состояние модального окна создания рецепта
const $createRecipeModal = atom(false)

// Состояние модального окна создания ингредиента
const $createIngredientModal = atom(false)

// Состояние модального окна добавления в календарь
const $addToCalendarModal = atom(false)
const $profileModal = atom(false)
const $profileReminderModal = atom(false)
const $selectedRecipeForCalendar = atom<Recipe | null>(null)

// Состояние модального окна редактирования рецепта
const $editRecipeModal = atom(false)
const $selectedRecipeForEdit = atom<Recipe | null>(null)

// Состояние авторизации
const $user = atom<User | null>(null)
const $isAuthenticated = atom(false)

// Загрузка данных
async function loadData() {
  $loading.set(true)
  try {
    const [recipes, ingredients, stockItems, shoppingList, calendarItems] = await Promise.all([
      apiClient.getRecipes(),
      apiClient.getIngredients(),
      apiClient.getStock(),
      apiClient.getShoppingList(), // По умолчанию для сегодняшней даты
      apiClient.getCalendar(),
    ])

    $recipes.set(recipes)
    $ingredients.set(ingredients)
    $stockItems.set(stockItems)
    $shoppingList.set(shoppingList)
    $calendarItems.set(calendarItems)

    // Загружаем любимые рецепты из localStorage
    loadFavoriteRecipes()
  } catch (error) {
    console.error('Ошибка загрузки данных:', error)
  } finally {
    $loading.set(false)
  }
}

// Функции для работы с авторизацией
async function checkAuth() {
  try {
    const response = await apiClient.getMe()
    if (response.authenticated && response.user) {
      $user.set(response.user)
      $isAuthenticated.set(true)
      return true
    } else {
      $user.set(null)
      $isAuthenticated.set(false)
      return false
    }
  } catch (error) {
    console.error('Ошибка проверки авторизации:', error)
    $user.set(null)
    $isAuthenticated.set(false)
    return false
  }
}

function handleLogout() {
  $user.set(null)
  $isAuthenticated.set(false)
  // Очищаем все данные
  $recipes.set([])
  $ingredients.set([])
  $stockItems.set([])
  $shoppingList.set({ items: [], date: '', recipes: [] })
  $calendarItems.set([])
  $favoriteRecipes.set([])
  // Очищаем localStorage
  localStorage.removeItem('user')
  localStorage.removeItem('favoriteRecipes')
}

// Функции для работы с наличием ингредиентов
async function updateIngredientStock(ingredientId: number, amount: number) {
  try {
    await apiClient.updateStock(ingredientId, amount)
    await loadData() // Перезагружаем данные
  } catch (error) {
    console.error('Ошибка обновления наличия:', error)
  }
}

// Функция создания рецепта
async function createRecipe(recipeData: {
  name: string
  calories: number
  proteins: number
  fats: number
  carbohydrates: number
  instructions?: string
  cookingTime?: number
  difficulty?: string
  isPublic?: boolean
  ingredients: { name: string; amount: number; amountType: string }[]
}) {
  try {
    await apiClient.createRecipe(recipeData)
    await loadData() // Перезагружаем данные
    $createRecipeModal.set(false) // Закрываем модальное окно
  } catch (error) {
    console.error('Ошибка создания рецепта:', error)
  }
}

// Функция создания ингредиента
async function createIngredient(ingredientData: { name: string; amountType: string }) {
  try {
    await apiClient.createIngredient(ingredientData)
    await loadData() // Перезагружаем данные
  } catch (error) {
    console.error('Ошибка создания ингредиента:', error)
  }
}

// Функция удаления ингредиента
async function deleteIngredient(id: number) {
  try {
    await apiClient.deleteIngredient(id)
    await loadData() // Перезагружаем данные
  } catch (error) {
    console.error('Ошибка удаления ингредиента:', error)
  }
}

// Функция для обновления списка покупок
async function updateShoppingList(date: string) {
  try {
    const shoppingList = await apiClient.getShoppingList(date)
    $shoppingList.set(shoppingList)
  } catch (error) {
    console.error('Ошибка обновления списка покупок:', error)
  }
}

// Функции для работы с календарем
async function addToCalendar(date: string, recipeId: number, mealType: string) {
  try {
    const newCalendarItem = await apiClient.addToCalendar(date, recipeId, mealType)

    // Добавляем новый элемент в локальное состояние
    const currentCalendarItems = $calendarItems.get()
    $calendarItems.set([...currentCalendarItems, newCalendarItem])

    // Обновляем список покупок для новой даты
    await updateShoppingList(date)
  } catch (error) {
    console.error('Ошибка добавления в календарь:', error)
  }
}

async function removeFromCalendar(id: number) {
  try {
    await apiClient.removeFromCalendar(id)

    // Удаляем элемент из локального состояния
    const currentCalendarItems = $calendarItems.get()
    $calendarItems.set(currentCalendarItems.filter((item) => item.id !== id))

    // Обновляем список покупок для текущей даты
    const currentDate = new Date().toISOString().split('T')[0]
    if (currentDate) {
      await updateShoppingList(currentDate)
    }
  } catch (error) {
    console.error('Ошибка удаления из календаря:', error)
  }
}

// Функции для работы с модальным окном календаря
function openAddToCalendarModal(recipe: Recipe) {
  $selectedRecipeForCalendar.set(recipe)
  $addToCalendarModal.set(true)
}

function closeAddToCalendarModal() {
  $addToCalendarModal.set(false)
  $selectedRecipeForCalendar.set(null)
}

function openProfileModal() {
  $profileModal.set(true)
}

function closeProfileModal() {
  $profileModal.set(false)
}

function openProfileReminderModal() {
  $profileReminderModal.set(true)
}

function closeProfileReminderModal() {
  $profileReminderModal.set(false)
}

async function handleAddToCalendarConfirm(date: string, mealType: string) {
  const recipe = $selectedRecipeForCalendar.get()
  if (recipe) {
    await addToCalendar(date, recipe.id, mealType)
    closeAddToCalendarModal()
  }
}

// Функция для изменения видимости рецепта
async function changeRecipeVisibility(recipeId: number, isPublic: boolean) {
  try {
    await apiClient.changeRecipeVisibility(recipeId, isPublic)
    await loadData() // Перезагружаем данные
  } catch (error) {
    console.error('Ошибка изменения видимости рецепта:', error)
  }
}

// Функции для работы с редактированием рецептов
function openEditRecipeModal(recipe: Recipe) {
  $selectedRecipeForEdit.set(recipe)
  $editRecipeModal.set(true)
}

function closeEditRecipeModal() {
  $editRecipeModal.set(false)
  $selectedRecipeForEdit.set(null)
}

async function handleEditRecipeSave(recipeData: {
  name: string
  calories: number
  proteins: number
  fats: number
  carbohydrates: number
  instructions?: string
  cookingTime?: number
  difficulty?: string
  ingredients: { name: string; amount: number; amountType: string }[]
}) {
  try {
    if ($selectedRecipeForEdit.get()) {
      await apiClient.updateRecipe($selectedRecipeForEdit.get()!.id, recipeData)
      await loadData() // Перезагружаем данные
      closeEditRecipeModal()
    }
  } catch (error) {
    console.error('Ошибка обновления рецепта:', error)
    alert('Ошибка при обновлении рецепта')
  }
}

async function handleDeleteRecipe(recipeId: number) {
  if (window.confirm('Вы уверены, что хотите удалить этот рецепт?')) {
    try {
      await apiClient.deleteRecipe(recipeId)
      await loadData() // Перезагружаем данные
    } catch (error) {
      console.error('Ошибка удаления рецепта:', error)
      alert('Ошибка при удалении рецепта')
    }
  }
}

// Функции для работы с любимыми рецептами
function toggleFavoriteRecipe(recipe: Recipe) {
  const currentFavorites = $favoriteRecipes.get()
  const isFavorite = currentFavorites.some((fav) => fav.id === recipe.id)

  if (isFavorite) {
    // Удаляем из любимых
    const updatedFavorites = currentFavorites.filter((fav) => fav.id !== recipe.id)
    $favoriteRecipes.set(updatedFavorites)
    // Сохраняем в localStorage
    localStorage.setItem('favoriteRecipes', JSON.stringify(updatedFavorites))
  } else {
    // Добавляем в любимые
    const updatedFavorites = [...currentFavorites, recipe]
    $favoriteRecipes.set(updatedFavorites)
    // Сохраняем в localStorage
    localStorage.setItem('favoriteRecipes', JSON.stringify(updatedFavorites))
  }
}

function isRecipeFavorite(recipeId: number): boolean {
  const favorites = $favoriteRecipes.get()
  return favorites.some((fav) => fav.id === recipeId)
}

function loadFavoriteRecipes() {
  try {
    const savedFavorites = localStorage.getItem('favoriteRecipes')
    if (savedFavorites) {
      const favorites = JSON.parse(savedFavorites)
      $favoriteRecipes.set(favorites)
    }
  } catch (error) {
    console.error('Ошибка загрузки любимых рецептов:', error)
  }
}

function getIngredientStock(ingredientName: string): number {
  const stockItem = $stockItems.get().find((item) => item.ingredient.name === ingredientName)
  return stockItem?.amount || 0
}

// Функция экспорта списка покупок в PDF
function exportShoppingListToPDF(shoppingList: ShoppingListItem[]) {
  try {
    const doc = new jsPDF()

    // Заголовок
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Список покупок', 20, 30)

    // Дата создания
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    const currentDate = new Date().toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    doc.text(`Создан: ${currentDate}`, 20, 45)

    // Список товаров
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Товары:', 20, 65)

    let yPosition = 80
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')

    shoppingList.forEach((item, index) => {
      // Проверяем, нужно ли добавить новую страницу
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 30
      }

      const itemText = `${index + 1}. ${item.name}`
      const amountText = `${item.amount} ${item.amountType}`

      doc.text(itemText, 25, yPosition)
      doc.text(amountText, 150, yPosition)

      yPosition += 15
    })

    // Итого
    if (shoppingList.length > 0) {
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(`Итого товаров: ${shoppingList.length}`, 20, yPosition + 10)
    }

    // Сохраняем файл
    const fileName = `shopping-list-${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  } catch (error) {
    console.error('Ошибка экспорта в PDF:', error)
    alert('Ошибка при создании PDF файла')
  }
}

// Функция экспорта календаря в PDF
function exportCalendarToPDF(calendarItems: CalendarItem[]) {
  try {
    const doc = new jsPDF()

    // Заголовок
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('План питания', 20, 30)

    // Дата создания
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    const currentDate = new Date().toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    doc.text(`Создан: ${currentDate}`, 20, 45)

    // Группируем по датам
    const groupedByDate: Record<string, CalendarItem[]> = {}
    calendarItems.forEach((item) => {
      const dateKey = new Date(item.date).toLocaleDateString('ru-RU')
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = []
      }
      groupedByDate[dateKey].push(item)
    })

    // Сортируем даты
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

    let yPosition = 65
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')

    sortedDates.forEach((date) => {
      // Проверяем, нужно ли добавить новую страницу
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 30
      }

      // Дата
      doc.text(date, 20, yPosition)
      yPosition += 15

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')

      // Рецепты на эту дату
      groupedByDate[date]?.forEach((item, itemIndex) => {
        const recipeText = `${itemIndex + 1}. ${item.recipe.name}`
        const caloriesText = `${item.recipe.calories} ккал`

        doc.text(recipeText, 25, yPosition)
        doc.text(caloriesText, 150, yPosition)

        yPosition += 12
      })

      yPosition += 10
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
    })

    // Итого
    if (calendarItems.length > 0) {
      const totalCalories = calendarItems.reduce((sum, item) => sum + item.recipe.calories, 0)
      const totalProteins = calendarItems.reduce((sum, item) => sum + item.recipe.proteins, 0)
      const totalFats = calendarItems.reduce((sum, item) => sum + item.recipe.fats, 0)
      const totalCarbs = calendarItems.reduce((sum, item) => sum + item.recipe.carbohydrates, 0)

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Итого:', 20, yPosition + 10)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`Рецептов: ${calendarItems.length}`, 25, yPosition + 25)
      doc.text(`Калории: ${totalCalories.toFixed(1)} ккал`, 25, yPosition + 35)
      doc.text(`Белки: ${totalProteins.toFixed(1)}г`, 25, yPosition + 45)
      doc.text(`Жиры: ${totalFats.toFixed(1)}г`, 25, yPosition + 55)
      doc.text(`Углеводы: ${totalCarbs.toFixed(1)}г`, 25, yPosition + 65)
    }

    // Сохраняем файл
    const fileName = `calendar-${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  } catch (error) {
    console.error('Ошибка экспорта календаря в PDF:', error)
    alert('Ошибка при создании PDF файла')
  }
}

// Функция экспорта дневника питания в PDF
function exportFoodDiaryToPDF(foodEntries: FoodDiaryEntry[], startDate: Date, endDate: Date) {
  try {
    const doc = new jsPDF()

    // Заголовок
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Дневник питания', 20, 30)

    // Период отчета
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    const startDateStr = startDate.toLocaleDateString('ru-RU')
    const endDateStr = endDate.toLocaleDateString('ru-RU')
    doc.text(`Период: ${startDateStr} - ${endDateStr}`, 20, 45)

    // Дата создания
    const currentDate = new Date().toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    doc.text(`Создан: ${currentDate}`, 20, 55)

    // Группируем записи по датам
    const groupedByDate: Record<string, FoodDiaryEntry[]> = {}
    foodEntries.forEach((entry) => {
      const dateKey = new Date(entry.date).toLocaleDateString('ru-RU')
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = []
      }
      groupedByDate[dateKey].push(entry)
    })

    // Сортируем даты
    const sortedDates = Object.keys(groupedByDate).sort(
      (a, b) =>
        new Date(a.split('.').reverse().join('-')).getTime() - new Date(b.split('.').reverse().join('-')).getTime()
    )

    let yPosition = 80

    sortedDates.forEach((date, dateIndex) => {
      const entries = groupedByDate[date] || []

      // Проверяем, нужно ли добавить новую страницу
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 30
      }

      // Заголовок даты
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(`📅 ${date}`, 20, yPosition)
      yPosition += 15

      // Статистика дня
      const dayStats = entries.reduce(
        (stats, entry) => ({
          calories: stats.calories + entry.calories,
          proteins: stats.proteins + entry.proteins,
          fats: stats.fats + entry.fats,
          carbohydrates: stats.carbohydrates + entry.carbohydrates,
          count: stats.count + 1,
        }),
        { calories: 0, proteins: 0, fats: 0, carbohydrates: 0, count: 0 }
      )

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('📊 Статистика дня:', 25, yPosition)
      yPosition += 10

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Калории: ${dayStats.calories.toFixed(1)} ккал`, 30, yPosition)
      yPosition += 8
      doc.text(`Белки: ${dayStats.proteins.toFixed(1)}г`, 30, yPosition)
      yPosition += 8
      doc.text(`Жиры: ${dayStats.fats.toFixed(1)}г`, 30, yPosition)
      yPosition += 8
      doc.text(`Углеводы: ${dayStats.carbohydrates.toFixed(1)}г`, 30, yPosition)
      yPosition += 8
      doc.text(`Приемов пищи: ${dayStats.count}`, 30, yPosition)
      yPosition += 15

      // Список приемов пищи
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('🍽️ Приемы пищи:', 25, yPosition)
      yPosition += 10

      entries.forEach((entry) => {
        // Проверяем, нужно ли добавить новую страницу
        if (yPosition > 250) {
          doc.addPage()
          yPosition = 30
        }

        const mealTypeEmoji =
          {
            breakfast: '🌅',
            lunch: '🍽️',
            dinner: '🌙',
            snack: '🍎',
          }[entry.mealType] || '🍽️'

        const mealTypeLabel =
          {
            breakfast: 'Завтрак',
            lunch: 'Обед',
            dinner: 'Ужин',
            snack: 'Перекус',
          }[entry.mealType] || 'Прием пищи'

        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(`${mealTypeEmoji} ${mealTypeLabel}`, 30, yPosition)
        yPosition += 8

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`• ${entry.recipeName} (${entry.servingSize} порция)`, 35, yPosition)
        yPosition += 8
        doc.text(
          `  Калории: ${entry.calories.toFixed(1)} ккал, Белки: ${entry.proteins.toFixed(1)}г, Жиры: ${entry.fats.toFixed(1)}г, Углеводы: ${entry.carbohydrates.toFixed(1)}г`,
          35,
          yPosition
        )
        yPosition += 12
      })

      // Разделитель между днями
      if (dateIndex < sortedDates.length - 1) {
        yPosition += 5
        doc.setLineWidth(0.5)
        doc.line(20, yPosition, 190, yPosition)
        yPosition += 10
      }
    })

    // Общая статистика за период
    if (foodEntries.length > 0) {
      // Проверяем, нужно ли добавить новую страницу
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 30
      }

      const totalStats = foodEntries.reduce(
        (stats, entry) => ({
          calories: stats.calories + entry.calories,
          proteins: stats.proteins + entry.proteins,
          fats: stats.fats + entry.fats,
          carbohydrates: stats.carbohydrates + entry.carbohydrates,
          count: stats.count + 1,
        }),
        { calories: 0, proteins: 0, fats: 0, carbohydrates: 0, count: 0 }
      )

      const avgStats = {
        calories: totalStats.calories / sortedDates.length,
        proteins: totalStats.proteins / sortedDates.length,
        fats: totalStats.fats / sortedDates.length,
        carbohydrates: totalStats.carbohydrates / sortedDates.length,
      }

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('📈 Общая статистика за период', 20, yPosition)
      yPosition += 15

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Итого:', 25, yPosition)
      yPosition += 10

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`Дней: ${sortedDates.length}`, 30, yPosition)
      yPosition += 8
      doc.text(`Записей: ${totalStats.count}`, 30, yPosition)
      yPosition += 8
      doc.text(`Общие калории: ${totalStats.calories.toFixed(1)} ккал`, 30, yPosition)
      yPosition += 8
      doc.text(`Общие белки: ${totalStats.proteins.toFixed(1)}г`, 30, yPosition)
      yPosition += 8
      doc.text(`Общие жиры: ${totalStats.fats.toFixed(1)}г`, 30, yPosition)
      yPosition += 8
      doc.text(`Общие углеводы: ${totalStats.carbohydrates.toFixed(1)}г`, 30, yPosition)
      yPosition += 15

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Среднее за день:', 25, yPosition)
      yPosition += 10

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`Калории: ${avgStats.calories.toFixed(1)} ккал`, 30, yPosition)
      yPosition += 8
      doc.text(`Белки: ${avgStats.proteins.toFixed(1)}г`, 30, yPosition)
      yPosition += 8
      doc.text(`Жиры: ${avgStats.fats.toFixed(1)}г`, 30, yPosition)
      yPosition += 8
      doc.text(`Углеводы: ${avgStats.carbohydrates.toFixed(1)}г`, 30, yPosition)
    }

    // Сохраняем файл
    const fileName = `food-diary-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  } catch (error) {
    console.error('Ошибка экспорта дневника питания в PDF:', error)
    alert('Ошибка при создании PDF файла')
  }
}

function RecipesPage() {
  const recipes = useStore($recipes)
  const favoriteRecipes = useStore($favoriteRecipes)
  const loading = useStore($loading)
  const user = useStore($user)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [sortBy, setSortBy] = React.useState<'name' | 'calories' | 'popularity'>('name')
  const [filterCategory, setFilterCategory] = React.useState<string | null>(null)
  const [viewMode, setViewMode] = React.useState<'cards' | 'table'>('cards')

  // Фильтрация и сортировка рецептов
  const filteredAndSortedRecipes = React.useMemo(() => {
    let filtered = recipes.filter((recipe) => recipe.name.toLowerCase().includes(searchQuery.toLowerCase()))

    // Фильтр по категории (простая логика на основе названия)
    if (filterCategory) {
      filtered = filtered.filter((recipe) => {
        const name = recipe.name.toLowerCase()
        switch (filterCategory) {
          case 'breakfast':
            return (
              name.includes('омлет') || name.includes('блины') || name.includes('сырники') || name.includes('яичница')
            )
          case 'lunch':
            return name.includes('суп') || name.includes('салат') || name.includes('паста')
          case 'dinner':
            return name.includes('мясо') || name.includes('рыба') || name.includes('курица')
          case 'dessert':
            return name.includes('торт') || name.includes('пирог') || name.includes('мороженое')
          default:
            return true
        }
      })
    }

    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'calories':
          return a.calories - b.calories
        case 'popularity':
          // Простая логика популярности на основе калорий
          return b.calories - a.calories
        default:
          return 0
      }
    })

    return filtered
  }, [recipes, searchQuery, filterCategory, sortBy])

  // Статистика всех рецептов
  const allRecipesStats = {
    total: recipes.length,
    avgCalories:
      recipes.length > 0 ? (recipes.reduce((sum, r) => sum + r.calories, 0) / recipes.length).toFixed(0) : '0',
    totalIngredients: recipes.reduce((sum, r) => sum + r.ingredients.length, 0),
  }

  return (
    <Stack gap="lg" pos="relative">
      <LoadingOverlay visible={loading} />

      <Group justify="space-between" align="center">
        <div>
          <Title>Рецепты</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Просматривайте и создавайте рецепты
          </Text>
        </div>
        <Group gap="xs">
          <QuickActions showCreateRecipe={true} />
          {user && <UserMenu user={user} onLogout={handleLogout} onOpenProfile={openProfileModal} />}
        </Group>
      </Group>

      <Breadcrumbs />

      {/* Панель поиска и фильтрации */}
      <Card withBorder p="md">
        <Stack gap="md">
          <Group gap="md" align="flex-end">
            <TextInput
              placeholder="Поиск рецептов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1 }}
              leftSection={<span style={{ fontSize: '12px' }}>🔍</span>}
            />
            <Select
              placeholder="Категория"
              value={filterCategory || ''}
              onChange={(value) => setFilterCategory(value || null)}
              data={[
                { value: '', label: 'Все категории' },
                { value: 'breakfast', label: '🍳 Завтрак' },
                { value: 'lunch', label: '🍽️ Обед' },
                { value: 'dinner', label: '🌙 Ужин' },
                { value: 'dessert', label: '🍰 Десерты' },
              ]}
              clearable
              w={150}
            />
            <Select
              placeholder="Сортировка"
              value={sortBy}
              onChange={(value) => setSortBy(value as any)}
              data={[
                { value: 'name', label: 'По названию' },
                { value: 'calories', label: 'По калориям' },
                { value: 'popularity', label: 'По популярности' },
              ]}
              w={150}
            />
            <Button.Group>
              <Button
                variant={viewMode === 'cards' ? 'filled' : 'light'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                📋 Карточки
              </Button>
              <Button
                variant={viewMode === 'table' ? 'filled' : 'light'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                📊 Таблица
              </Button>
            </Button.Group>
          </Group>

          {searchQuery || filterCategory ? (
            <Text size="sm" c="dimmed">
              Найдено рецептов: {filteredAndSortedRecipes.length}
            </Text>
          ) : null}
        </Stack>
      </Card>

      {/* Дашборд статистики */}
      <Grid>
        <Grid.Col span={3}>
          <Card withBorder p="md" style={{ textAlign: 'center' }}>
            <Text size="xl" fw={700} c="teal">
              {allRecipesStats.total}
            </Text>
            <Text size="sm" c="dimmed">
              Всего рецептов
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder p="md" style={{ textAlign: 'center' }}>
            <Text size="xl" fw={700} c="sage">
              {allRecipesStats.avgCalories}
            </Text>
            <Text size="sm" c="dimmed">
              Средние калории
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder p="md" style={{ textAlign: 'center' }}>
            <Text size="xl" fw={700} c="amber">
              {allRecipesStats.totalIngredients}
            </Text>
            <Text size="sm" c="dimmed">
              Ингредиентов
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Отображение рецептов */}
      {viewMode === 'cards' ? (
        <Grid>
          {filteredAndSortedRecipes.map((recipe) => (
            <Grid.Col key={recipe.id} span={4}>
              <Card
                withBorder
                p="md"
                style={{
                  height: '100%',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <Stack gap="sm">
                  {/* Заголовок карточки */}
                  <Group justify="space-between" align="flex-start">
                    <Link
                      to={`/recipe/${recipe.id}`}
                      style={{
                        color: 'var(--mantine-color-teal-6)',
                        textDecoration: 'none',
                        flex: 1,
                      }}
                    >
                      <Title order={4} lineClamp={2}>
                        {recipe.name}
                      </Title>
                    </Link>
                    <Group gap="xs">
                      <ActionIcon
                        variant="subtle"
                        color="pink"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleFavoriteRecipe(recipe)
                        }}
                      >
                        {favoriteRecipes.some((fav) => fav.id === recipe.id) ? (
                          <HeartFillIcon size={16} />
                        ) : (
                          <HeartIcon size={16} />
                        )}
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          openEditRecipeModal(recipe)
                        }}
                      >
                        <PencilIcon size={16} />
                      </ActionIcon>
                      {/* Кнопка изменения видимости - только для личных рецептов */}
                      {recipe.authorId === user?.id && (
                        <ActionIcon
                          variant="subtle"
                          color={recipe.authorId === null ? "orange" : "green"}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            changeRecipeVisibility(recipe.id, recipe.authorId !== null)
                          }}
                          title={recipe.authorId === null ? "Сделать личным" : "Сделать публичным"}
                        >
                          {recipe.authorId === null ? <LockIcon size={16} /> : <GlobeIcon size={16} />}
                        </ActionIcon>
                      )}
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDeleteRecipe(recipe.id)
                        }}
                      >
                        <TrashIcon size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>

                  {/* Автор рецепта */}
                  {recipe.author && (
                    <Text size="xs" c="dimmed">
                      👨‍🍳 Автор: {recipe.author.name || recipe.author.email}
                    </Text>
                  )}

                  {/* КБЖУ */}
                  <Group gap="xs">
                    <Badge size="sm" color="teal" variant="light">
                      {recipe.calories} ккал
                    </Badge>
                    <Badge size="sm" color="sage" variant="light">
                      {recipe.proteins}г белка
                    </Badge>
                    <Badge size="sm" color="amber" variant="light">
                      {recipe.fats}г жиров
                    </Badge>
                    <Badge size="sm" color="indigo" variant="light">
                      {recipe.carbohydrates}г углеводов
                    </Badge>
                  </Group>

                  {/* Ингредиенты */}
                  <div>
                    <Text size="sm" fw={500} c="dimmed" mb={4}>
                      Ингредиенты:
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={3}>
                      {recipe.ingredients.map((i) => i.name).join(', ')}
                    </Text>
                  </div>

                  {/* Быстрые действия */}
                  <Group gap="xs" mt="auto">
                    <Button variant="light" size="xs" fullWidth onClick={() => openAddToCalendarModal(recipe)}>
                      Добавить в календарь
                    </Button>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Название</Table.Th>
              <Table.Th>КБЖУ</Table.Th>
              <Table.Th>Ингредиенты</Table.Th>
              <Table.Th>Действия</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredAndSortedRecipes.map((recipe) => (
              <Table.Tr key={recipe.id}>
                <Table.Td>
                  <Link
                    to={`/recipe/${recipe.id}`}
                    style={{
                      color: 'var(--mantine-color-teal-6)',
                      textDecoration: 'none',
                    }}
                  >
                    {recipe.name}
                  </Link>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">
                    {recipe.calories}/{recipe.proteins}/{recipe.fats}/{recipe.carbohydrates}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" lineClamp={2}>
                    {recipe.ingredients.map((i) => i.name).join(', ')}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" color="pink" onClick={() => toggleFavoriteRecipe(recipe)}>
                      {favoriteRecipes.some((fav) => fav.id === recipe.id) ? (
                        <HeartFillIcon size={16} />
                      ) : (
                        <HeartIcon size={16} />
                      )}
                    </ActionIcon>
                    <ActionIcon variant="light" color="teal" onClick={() => openAddToCalendarModal(recipe)}>
                      <CalendarIcon size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="blue" onClick={() => openEditRecipeModal(recipe)}>
                      <PencilIcon size={16} />
                    </ActionIcon>
                    {/* Кнопка изменения видимости - только для личных рецептов */}
                    {recipe.authorId === user?.id && (
                      <ActionIcon
                        variant="subtle"
                        color={recipe.authorId === null ? "orange" : "green"}
                        onClick={() => changeRecipeVisibility(recipe.id, recipe.authorId !== null)}
                        title={recipe.authorId === null ? "Сделать личным" : "Сделать публичным"}
                      >
                        {recipe.authorId === null ? <LockIcon size={16} /> : <GlobeIcon size={16} />}
                      </ActionIcon>
                    )}
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteRecipe(recipe.id)}>
                      <TrashIcon size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  )
}

function IngredientsPage() {
  const ingredients = useStore($ingredients)
  const stockItems = useStore($stockItems)
  const loading = useStore($loading)
  const user = useStore($user)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filterCategory, setFilterCategory] = React.useState<string | null>(null)
  const [sortBy, setSortBy] = React.useState<'name' | 'amount' | 'category'>('name')
  const [viewMode, setViewMode] = React.useState<'cards' | 'table'>('cards')
  const [showLowStockOnly, setShowLowStockOnly] = React.useState(false)

  // Функция для определения категории ингредиента
  const getIngredientCategory = (name: string): string => {
    const lowerName = name.toLowerCase()
    if (
      lowerName.includes('молоко') ||
      lowerName.includes('творог') ||
      lowerName.includes('сыр') ||
      lowerName.includes('сметана') ||
      lowerName.includes('масло')
    ) {
      return 'dairy'
    } else if (
      lowerName.includes('мясо') ||
      lowerName.includes('курица') ||
      lowerName.includes('рыба') ||
      lowerName.includes('колбаса')
    ) {
      return 'meat'
    } else if (
      lowerName.includes('помидор') ||
      lowerName.includes('огурец') ||
      lowerName.includes('морковь') ||
      lowerName.includes('лук') ||
      lowerName.includes('картофель')
    ) {
      return 'vegetables'
    } else if (
      lowerName.includes('яблоко') ||
      lowerName.includes('банан') ||
      lowerName.includes('апельсин') ||
      lowerName.includes('виноград')
    ) {
      return 'fruits'
    } else if (
      lowerName.includes('мука') ||
      lowerName.includes('сахар') ||
      lowerName.includes('масло растительное') ||
      lowerName.includes('яйцо')
    ) {
      return 'basics'
    } else {
      return 'other'
    }
  }

  // Фильтрация и сортировка ингредиентов
  const filteredAndSortedIngredients = React.useMemo(() => {
    let filtered = ingredients.filter((ingredient) => ingredient.name.toLowerCase().includes(searchQuery.toLowerCase()))

    // Фильтр по категории
    if (filterCategory) {
      filtered = filtered.filter((ingredient) => getIngredientCategory(ingredient.name) === filterCategory)
    }

    // Фильтр по низким запасам
    if (showLowStockOnly) {
      filtered = filtered.filter((ingredient) => {
        const stock = stockItems.find((s) => s.ingredient.id === ingredient.id)?.amount || 0
        return stock < 10
      })
    }

    // Сортировка
    filtered.sort((a, b) => {
      const stockA = stockItems.find((s) => s.ingredient.id === a.id)?.amount || 0
      const stockB = stockItems.find((s) => s.ingredient.id === b.id)?.amount || 0

      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'amount':
          return stockB - stockA
        case 'category':
          return getIngredientCategory(a.name).localeCompare(getIngredientCategory(b.name))
        default:
          return 0
      }
    })

    return filtered
  }, [ingredients, stockItems, searchQuery, filterCategory, sortBy, showLowStockOnly])

  // Статистика
  const stats = {
    total: ingredients.length,
    inStock: stockItems.length,
    lowStock: stockItems.filter((item) => item.amount < 10).length,
    totalAmount: stockItems.reduce((sum, item) => sum + item.amount, 0),
  }

  // Категории для фильтрации
  const categories = [
    { value: 'dairy', label: '🥛 Молочные продукты' },
    { value: 'meat', label: '🥩 Мясо и рыба' },
    { value: 'vegetables', label: '🥬 Овощи' },
    { value: 'fruits', label: '🍎 Фрукты' },
    { value: 'basics', label: '🧂 Основные продукты' },
    { value: 'other', label: '📦 Прочее' },
  ]

  return (
    <Stack gap="lg" pos="relative">
      <LoadingOverlay visible={loading} />

      {/* Дашборд статистики */}
      <Grid>
        <Grid.Col span={3}>
          <Card withBorder p="md" style={{ textAlign: 'center' }}>
            <Text size="xl" fw={700} c="teal">
              {stats.total}
            </Text>
            <Text size="sm" c="dimmed">
              Всего ингредиентов
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder p="md" style={{ textAlign: 'center' }}>
            <Text size="xl" fw={700} c="sage">
              {stats.inStock}
            </Text>
            <Text size="sm" c="dimmed">
              В наличии
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder p="md" style={{ textAlign: 'center' }}>
            <Text size="xl" fw={700} c="amber">
              {stats.lowStock}
            </Text>
            <Text size="sm" c="dimmed">
              Заканчиваются
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder p="md" style={{ textAlign: 'center' }}>
            <Text size="xl" fw={700} c="indigo">
              {stats.totalAmount}
            </Text>
            <Text size="sm" c="dimmed">
              Общее количество
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      <Group justify="space-between" align="center">
        <div>
          <Title>Управление ингредиентами</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Создавайте и управляйте ингредиентами
          </Text>
        </div>
        <Group gap="xs">
          <QuickActions showCreateIngredient={true} showClear={true} clearLabel="Очистить все данные" />
          {user && <UserMenu user={user} onLogout={handleLogout} onOpenProfile={openProfileModal} />}
        </Group>
      </Group>

      <Breadcrumbs />

      <Card withBorder p="md" style={{ backgroundColor: 'var(--mantine-color-teal-0)' }}>
        <Group gap="md" align="flex-start">
          <div style={{ fontSize: '24px' }}>💡</div>
          <div style={{ flex: 1 }}>
            <Text fw={500} mb="xs">
              Советы по управлению ингредиентами:
            </Text>
            <List size="sm" c="dimmed">
              <List.Item>• Используйте поиск и фильтры для быстрого нахождения ингредиентов</List.Item>
              <List.Item>• Переключайтесь между карточками и таблицей для удобного просмотра</List.Item>
              <List.Item>• Ингредиенты с количеством менее 10 выделяются розовым цветом</List.Item>
              <List.Item>• Используйте быстрые кнопки +10/-10 для изменения количества</List.Item>
              <List.Item>• Нажмите "Добавить популярные" для создания базовых ингредиентов</List.Item>
            </List>
          </div>
        </Group>
      </Card>

      {/* Панель поиска и фильтрации */}
      <Card withBorder p="md">
        <Stack gap="md">
          <Group gap="md" align="flex-end">
            <TextInput
              placeholder="Поиск ингредиентов..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                // Сбрасываем фильтр низких запасов при поиске
                if (showLowStockOnly && e.target.value) {
                  setShowLowStockOnly(false)
                }
              }}
              style={{ flex: 1 }}
              leftSection={<span style={{ fontSize: '12px' }}>🔍</span>}
            />
            <Select
              placeholder="Категория"
              value={filterCategory || ''}
              onChange={(value) => {
                setFilterCategory(value || null)
                // Сбрасываем фильтр низких запасов при изменении категории
                if (showLowStockOnly) {
                  setShowLowStockOnly(false)
                }
              }}
              data={[{ value: '', label: 'Все категории' }, ...categories]}
              clearable
              w={200}
            />
            <Select
              placeholder="Сортировка"
              value={sortBy}
              onChange={(value) => setSortBy(value as any)}
              data={[
                { value: 'name', label: 'По названию' },
                { value: 'amount', label: 'По количеству' },
                { value: 'category', label: 'По категории' },
              ]}
              w={150}
            />
            <Button.Group>
              <Button
                variant={viewMode === 'cards' ? 'filled' : 'light'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                📋 Карточки
              </Button>
              <Button
                variant={viewMode === 'table' ? 'filled' : 'light'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                📊 Таблица
              </Button>
            </Button.Group>
          </Group>

          {(searchQuery || filterCategory || showLowStockOnly) ? (
            <Group justify="space-between" align="center">
              <Text size="sm" c="dimmed">
                Найдено ингредиентов: {filteredAndSortedIngredients.length}
                {showLowStockOnly && " (только с низкими запасами)"}
              </Text>
              <Button
                variant="light"
                color="gray"
                size="xs"
                onClick={() => {
                  setSearchQuery('')
                  setFilterCategory(null)
                  setShowLowStockOnly(false)
                }}
              >
                ❌ Очистить фильтры
              </Button>
            </Group>
          ) : null}
        </Stack>
      </Card>

      {/* Отображение ингредиентов */}
      <div>
        {viewMode === 'cards' ? (
          <Grid>
            {filteredAndSortedIngredients.map((ingredient) => {
              const currentStock = stockItems.find((s) => s.ingredient.id === ingredient.id)?.amount || 0
              const category = getIngredientCategory(ingredient.name)
              const isLowStock = currentStock < 10

              return (
                <Grid.Col key={ingredient.id} span={4}>
                  <Card
                    withBorder
                    p="md"
                    style={{
                      height: '100%',
                      transition: 'all 0.2s ease',
                      borderColor: isLowStock ? 'var(--mantine-color-rose-3)' : 'var(--mantine-color-gray-3)',
                      backgroundColor: isLowStock ? 'var(--mantine-color-rose-0)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <Stack gap="sm">
                      {/* Заголовок карточки */}
                      <Group justify="space-between" align="flex-start">
                        <div style={{ flex: 1 }}>
                          <Title order={4} lineClamp={2}>
                            {ingredient.name}
                          </Title>
                          <Text size="xs" c="dimmed" mt={4}>
                            {categories.find((c) => c.value === category)?.label || '📦 Прочее'}
                          </Text>
                        </div>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => deleteIngredient(ingredient.id)}
                          size="sm"
                        >
                          <TrashIcon size={16} />
                        </ActionIcon>
                      </Group>

                      {/* Единица измерения */}
                      <Badge size="sm" color="gray" variant="light">
                        {ingredient.amountType}
                      </Badge>

                      {/* Количество в наличии */}
                      <div>
                        <Text size="sm" fw={500} mb="xs">
                          Количество в наличии:
                        </Text>
                        <Group gap="xs" align="center">
                          <NumberInput
                            value={currentStock}
                            onChange={(value) => updateIngredientStock(ingredient.id, Number(value) || 0)}
                            min={0}
                            max={9999}
                            w={100}
                            size="sm"
                            placeholder="0"
                          />
                          <Text size="xs" c="dimmed">
                            {ingredient.amountType}
                          </Text>
                        </Group>
                      </div>

                      {/* Быстрые действия */}
                      <Group gap="xs">
                        <Button
                          variant="light"
                          size="xs"
                          onClick={() => updateIngredientStock(ingredient.id, currentStock + 10)}
                        >
                          +10
                        </Button>
                        <Button
                          variant="light"
                          size="xs"
                          onClick={() => updateIngredientStock(ingredient.id, Math.max(0, currentStock - 10))}
                        >
                          -10
                        </Button>
                        <Button
                          variant="light"
                          size="xs"
                          color="red"
                          onClick={() => updateIngredientStock(ingredient.id, 0)}
                        >
                          Очистить
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                </Grid.Col>
              )
            })}
          </Grid>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Ингредиент</Table.Th>
                <Table.Th>Категория</Table.Th>
                <Table.Th>Единица измерения</Table.Th>
                <Table.Th>Количество в наличии</Table.Th>
                <Table.Th>Действия</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredAndSortedIngredients.map((ingredient) => {
                const currentStock = stockItems.find((s) => s.ingredient.id === ingredient.id)?.amount || 0
                const category = getIngredientCategory(ingredient.name)
                const isLowStock = currentStock < 10

                return (
                  <Table.Tr
                    key={ingredient.id}
                    style={{
                      backgroundColor: isLowStock ? 'var(--mantine-color-rose-0)' : 'transparent',
                    }}
                  >
                    <Table.Td>
                      <Text fw={500}>{ingredient.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" color="gray" variant="light">
                        {categories.find((c) => c.value === category)?.label || '📦 Прочее'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text>{ingredient.amountType}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" align="center">
                        <NumberInput
                          value={currentStock}
                          onChange={(value) => updateIngredientStock(ingredient.id, Number(value) || 0)}
                          min={0}
                          max={9999}
                          w={100}
                          size="sm"
                          placeholder="0"
                        />
                        <Group gap="xs">
                          <Button
                            variant="light"
                            size="xs"
                            onClick={() => updateIngredientStock(ingredient.id, currentStock + 10)}
                          >
                            +10
                          </Button>
                          <Button
                            variant="light"
                            size="xs"
                            onClick={() => updateIngredientStock(ingredient.id, Math.max(0, currentStock - 10))}
                          >
                            -10
                          </Button>
                        </Group>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon variant="light" color="red" onClick={() => deleteIngredient(ingredient.id)} size="sm">
                        <TrashIcon size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        )}
      </div>

      {/* Быстрые действия */}
      <Card withBorder p="md">
        <Title order={3} mb="md">
          ⚡ Быстрые действия
        </Title>
        <Group gap="md">
          <Button
            variant="light"
            color="green"
            onClick={() => {
              // Добавить +10 ко всем ингредиентам в наличии
              stockItems.forEach((item) => {
                updateIngredientStock(item.ingredient.id, item.amount + 10)
              })
            }}
            size="sm"
          >
            ➕ +10 ко всем
          </Button>
          <Button
            variant="light"
            color="orange"
            onClick={() => {
              // Очистить все низкие запасы
              stockItems
                .filter((item) => item.amount < 10)
                .forEach((item) => {
                  updateIngredientStock(item.ingredient.id, 0)
                })
            }}
            size="sm"
          >
            🗑️ Очистить низкие запасы
          </Button>
          <Button
            variant={showLowStockOnly ? "filled" : "light"}
            color="blue"
            onClick={() => {
              if (showLowStockOnly) {
                // Сбросить фильтр низких запасов
                setShowLowStockOnly(false)
              } else {
                // Показать только ингредиенты с низкими запасами
                setFilterCategory(null)
                setSearchQuery('')
                setShowLowStockOnly(true)
              }
            }}
            size="sm"
          >
            {showLowStockOnly ? "❌ Сбросить фильтр" : "🔍 Показать низкие запасы"}
          </Button>
        </Group>
      </Card>

      {/* Улучшенная секция "Ингредиенты в наличии" */}
      <Card withBorder p="md">
        <Title order={3} mb="md">
          📦 Ингредиенты в наличии ({stockItems.length})
        </Title>
        {stockItems.length > 0 ? (
          <Grid>
            {stockItems.map((item) => {
              const isLowStock = item.amount < 10
              const category = getIngredientCategory(item.ingredient.name)

              return (
                <Grid.Col key={item.ingredient.name} span={4}>
                  <Card
                    withBorder
                    p="sm"
                    style={{
                      backgroundColor: isLowStock ? 'var(--mantine-color-amber-0)' : 'var(--mantine-color-sage-0)',
                      borderColor: isLowStock ? 'var(--mantine-color-amber-3)' : 'var(--mantine-color-sage-3)',
                    }}
                  >
                    <Group justify="space-between" align="center">
                      <div style={{ flex: 1 }}>
                        <Text fw={500} size="sm">
                          {item.ingredient.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {categories.find((c) => c.value === category)?.label || '📦 Прочее'}
                        </Text>
                      </div>
                      <Badge color={isLowStock ? 'amber' : 'sage'} variant="light" size="sm">
                        {item.amount} {item.ingredient.amountType}
                      </Badge>
                    </Group>
                  </Card>
                </Grid.Col>
              )
            })}
          </Grid>
        ) : (
          <Text c="dimmed" ta="center" py="xl">
            Нет ингредиентов в наличии
          </Text>
        )}
      </Card>
    </Stack>
  )
}

function CreateRecipeForm() {
  const [formData, setFormData] = React.useState({
    name: '',
    calories: 0,
    proteins: 0,
    fats: 0,
    carbohydrates: 0,
    instructions: '',
    cookingTime: 0,
    difficulty: '',
    isPublic: false,
    ingredients: [{ name: '', amount: 0, amountType: 'гр' }],
  })

  const [loading, setLoading] = React.useState(false)
  const [ingredientSearch, setIngredientSearch] = React.useState<string[]>([''])
  const modalOpened = useStore($createRecipeModal)
  const ingredients = useStore($ingredients)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createRecipe(formData)
      // Сбрасываем форму
      setFormData({
        name: '',
        calories: 0,
        proteins: 0,
        fats: 0,
        carbohydrates: 0,
        instructions: '',
        cookingTime: 0,
        difficulty: '',
        isPublic: false,
        ingredients: [{ name: '', amount: 0, amountType: 'гр' }],
      })
      setIngredientSearch([''])
    } finally {
      setLoading(false)
    }
  }

  const addIngredient = () => {
    setFormData((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', amount: 0, amountType: 'гр' }],
    }))
    setIngredientSearch((prev) => [...prev, ''])
  }

  const removeIngredient = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }))
    setIngredientSearch((prev) => prev.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)),
    }))
  }

  const handleIngredientSearch = (index: number, searchValue: string) => {
    setIngredientSearch((prev) => prev.map((val, i) => (i === index ? searchValue : val)))
  }

  const handleIngredientSelect = async (index: number, selectedValue: string | null) => {
    if (!selectedValue) return

    // Проверяем, является ли это новым ингредиентом
    if (selectedValue.startsWith('Создать: ')) {
      const newIngredientName = selectedValue.replace('Создать: ', '')
      const currentAmountType = formData.ingredients[index]?.amountType || 'гр'

      try {
        await createIngredient({
          name: newIngredientName,
          amountType: currentAmountType,
        })
        // Обновляем форму с новым ингредиентом
        updateIngredient(index, 'name', newIngredientName)
        setIngredientSearch((prev) => prev.map((val, i) => (i === index ? '' : val)))
      } catch (error) {
        console.error('Ошибка создания ингредиента:', error)
      }
    } else {
      // Выбираем существующий ингредиент
      updateIngredient(index, 'name', selectedValue)
      setIngredientSearch((prev) => prev.map((val, i) => (i === index ? '' : val)))
    }
  }

  const getFilteredIngredients = (searchValue: string) => {
    if (!searchValue) return ingredients.map((ing) => ing.name)

    const filtered = ingredients
      .filter((ing) => ing.name.toLowerCase().includes(searchValue.toLowerCase()))
      .map((ing) => ing.name)

    // Добавляем опцию создания нового ингредиента, если он не найден
    const exactMatch = ingredients.some((ing) => ing.name.toLowerCase() === searchValue.toLowerCase())

    if (!exactMatch && searchValue.trim()) {
      filtered.push(`Создать: ${searchValue}`)
    }

    return filtered
  }

  return (
    <Modal opened={modalOpened} onClose={() => $createRecipeModal.set(false)} title="Создать новый рецепт" size="lg">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Название рецепта"
            placeholder="Введите название рецепта"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            required
          />

          <Group grow>
            <NumberInput
              label="Калории"
              placeholder="0"
              value={formData.calories}
              onChange={(value) => setFormData((prev) => ({ ...prev, calories: Number(value) || 0 }))}
              min={0}
              required
            />
            <NumberInput
              label="Белки (г)"
              placeholder="0"
              value={formData.proteins}
              onChange={(value) => setFormData((prev) => ({ ...prev, proteins: Number(value) || 0 }))}
              min={0}
              required
            />
            <NumberInput
              label="Жиры (г)"
              placeholder="0"
              value={formData.fats}
              onChange={(value) => setFormData((prev) => ({ ...prev, fats: Number(value) || 0 }))}
              min={0}
              required
            />
            <NumberInput
              label="Углеводы (г)"
              placeholder="0"
              value={formData.carbohydrates}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  carbohydrates: Number(value) || 0,
                }))
              }
              min={0}
              required
            />
          </Group>

          <Divider />

          {/* Дополнительная информация */}
          <Title order={3}>Дополнительная информация</Title>

          <Group grow>
            <NumberInput
              label="Время приготовления (мин)"
              placeholder="0"
              value={formData.cookingTime}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  cookingTime: Number(value) || 0,
                }))
              }
              min={0}
            />
            <Select
              label="Сложность"
              placeholder="Выберите сложность"
              value={formData.difficulty}
              onChange={(value) => setFormData((prev) => ({ ...prev, difficulty: value || '' }))}
              data={[
                { value: 'easy', label: '🟢 Легко' },
                { value: 'medium', label: '🟡 Средне' },
                { value: 'hard', label: '🔴 Сложно' },
              ]}
              clearable
            />
          </Group>

          <Textarea
            label="Инструкции приготовления"
            placeholder="Опишите пошагово процесс приготовления..."
            value={formData.instructions}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev) => ({ ...prev, instructions: e.target.value }))
            }
            minRows={4}
            maxRows={8}
          />

          <Checkbox
            label="Сделать рецепт общедоступным"
            description="Публичные рецепты будут видны всем пользователям"
            checked={formData.isPublic}
            onChange={(e) => setFormData((prev) => ({ ...prev, isPublic: e.target.checked }))}
          />

          <Divider />

          <Group justify="space-between" align="center">
            <Title order={3}>Ингредиенты</Title>
            <Button
              type="button"
              variant="light"
              color="sage"
              leftSection={<PlusIcon size={16} />}
              onClick={addIngredient}
            >
              Добавить ингредиент
            </Button>
          </Group>

          {formData.ingredients.map((ingredient, index) => (
            <Group key={index} align="flex-end">
              <Select
                label="Название"
                placeholder="Начните вводить название ингредиента"
                value={ingredient.name}
                onChange={(value) => handleIngredientSelect(index, value)}
                data={getFilteredIngredients(ingredientSearch[index] || '')}
                searchValue={ingredientSearch[index] || ''}
                onSearchChange={(value) => handleIngredientSearch(index, value)}
                searchable
                style={{ flex: 1 }}
                required
              />
              <NumberInput
                label="Количество"
                placeholder="0"
                value={ingredient.amount}
                onChange={(value) => updateIngredient(index, 'amount', Number(value) || 0)}
                min={0}
                w={120}
                required
              />
              <Select
                label="Единица"
                value={ingredient.amountType}
                onChange={(value) => updateIngredient(index, 'amountType', value || 'гр')}
                data={['гр', 'мл', 'шт', 'по вкусу']}
                w={120}
                required
              />
              {formData.ingredients.length > 1 && (
                <ActionIcon variant="light" color="rose" onClick={() => removeIngredient(index)} mb={4}>
                  <TrashIcon size={16} />
                </ActionIcon>
              )}
            </Group>
          ))}

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => $createRecipeModal.set(false)} disabled={loading}>
              Отмена
            </Button>
            <Button
              type="submit"
              color="sage"
              loading={loading}
              disabled={!formData.name || formData.ingredients.some((ing) => !ing.name)}
            >
              Создать рецепт
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

function CreateIngredientForm() {
  const [formData, setFormData] = React.useState({
    name: '',
    amountType: 'гр',
  })

  const [loading, setLoading] = React.useState(false)
  const modalOpened = useStore($createIngredientModal)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createIngredient(formData)
      // Сбрасываем форму
      setFormData({
        name: '',
        amountType: 'гр',
      })
      $createIngredientModal.set(false) // Закрываем модальное окно
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      opened={modalOpened}
      onClose={() => $createIngredientModal.set(false)}
      title="Создать новый ингредиент"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Название ингредиента"
            placeholder="Введите название ингредиента"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            required
          />

          <Select
            label="Единица измерения"
            value={formData.amountType}
            onChange={(value) => setFormData((prev) => ({ ...prev, amountType: value || 'гр' }))}
            data={['гр', 'мл', 'шт', 'по вкусу']}
            required
          />

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => $createIngredientModal.set(false)} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" loading={loading} disabled={!formData.name}>
              Создать ингредиент
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

function CalendarPage() {
  const recipes = useStore($recipes)
  const calendarItems = useStore($calendarItems)
  const loading = useStore($loading)
  const user = useStore($user)

  // Отладочное логирование
  React.useEffect(() => {
    console.log('CalendarPage: calendarItems обновились:', calendarItems)
  }, [calendarItems])
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null)
  const [selectedRecipe, setSelectedRecipe] = React.useState<number | null>(null)
  const [currentWeek, setCurrentWeek] = React.useState(new Date())
  const [searchQuery, setSearchQuery] = React.useState('')
  const [quickMealType, setQuickMealType] = React.useState<string | null>(null)

  // Состояние для drag & drop
  const [draggedItem, setDraggedItem] = React.useState<CalendarItem | null>(null)
  const [dragOverDate, setDragOverDate] = React.useState<Date | null>(null)

  const handleAddToCalendar = () => {
    if (selectedDate && selectedRecipe) {
      const dateString = selectedDate.toISOString().split('T')[0]
      if (dateString) {
        // Используем выбранный тип приема пищи или 'lunch' по умолчанию
        const mealType = quickMealType || 'lunch'
        addToCalendar(dateString, selectedRecipe, mealType)
        setSelectedRecipe(null)
        setQuickMealType(null)
        // НЕ сбрасываем selectedDate, чтобы можно было добавлять еще рецепты на тот же день
      }
    }
  }

  const handleDateClick = (date: Date) => {
    // Если кликаем на уже выбранный день, отменяем выбор
    if (selectedDate && selectedDate.toDateString() === date.toDateString()) {
      setSelectedDate(null)
      setSelectedRecipe(null)
    } else {
      setSelectedDate(date)
    }
  }

  const handleCancelSelection = () => {
    setSelectedRecipe(null)
    setQuickMealType(null)
    // НЕ сбрасываем selectedDate, чтобы можно было добавлять еще рецепты на тот же день
  }

  const handleCancelDateSelection = () => {
    setSelectedDate(null)
    setSelectedRecipe(null)
    setQuickMealType(null)
  }

  const handleQuickMeal = (mealType: string) => {
    setQuickMealType(mealType)
    // Если выбранная дата не установлена, используем сегодняшний день
    if (!selectedDate) {
      setSelectedDate(new Date())
    }
    // Автоматически выбираем первый подходящий рецепт
    const filteredRecipes = recipes.filter((recipe) => recipe.name.toLowerCase().includes(searchQuery.toLowerCase()))
    if (filteredRecipes.length > 0 && filteredRecipes[0]) {
      setSelectedRecipe(filteredRecipes[0].id)
    }
  }

  const filteredRecipes = recipes.filter((recipe) => recipe.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const getWeekStats = () => {
    const weekStart = getWeekStart(currentWeek)
    let totalCalories = 0
    let totalRecipes = 0

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      const events = getEventsForDate(date)
      totalCalories += events.reduce((sum, event) => sum + event.recipe.calories, 0)
      totalRecipes += events.length
    }

    return { totalCalories, totalRecipes }
  }

  const getSelectedDayStats = () => {
    if (!selectedDate) {
      return { totalCalories: 0, totalRecipes: 0, totalProteins: 0 }
    }

    const events = getEventsForDate(selectedDate)
    const totalCalories = events.reduce((sum, event) => sum + event.recipe.calories, 0)
    const totalProteins = events.reduce((sum, event) => sum + event.recipe.proteins, 0)
    const totalRecipes = events.length

    return { totalCalories, totalRecipes, totalProteins }
  }

  // Функция для расчета рекомендуемых калорий на основе профиля пользователя
  const getRecommendedCalories = () => {
    const currentUser = $user.get()
    if (
      !currentUser ||
      !currentUser.age ||
      !currentUser.weight ||
      !currentUser.height ||
      !currentUser.gender ||
      !currentUser.activityLevel
    ) {
      return null
    }

    // Формула Миффлина-Сан Жеора для расчета BMR
    let bmr = 0
    if (currentUser.gender === 'male') {
      bmr = 88.362 + 13.397 * currentUser.weight + 4.799 * currentUser.height - 5.677 * currentUser.age
    } else {
      bmr = 447.593 + 9.247 * currentUser.weight + 3.098 * currentUser.height - 4.33 * currentUser.age
    }

    // Множители активности
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9,
    }

    const tdee = bmr * (activityMultipliers[currentUser.activityLevel as keyof typeof activityMultipliers] || 1.2)

    // Корректировка по цели
    let recommended = tdee
    if (currentUser.goal === 'lose_weight') {
      recommended = tdee - 500 // Дефицит 500 калорий для похудения
    } else if (currentUser.goal === 'gain_weight') {
      recommended = tdee + 300 // Профицит 300 калорий для набора веса
    }

    return Math.round(recommended)
  }

  // Функция для получения рекомендаций по питанию
  const getNutritionRecommendation = (totalCalories: number) => {
    const recommendedCalories = getRecommendedCalories()
    const currentUser = $user.get()

    if (!recommendedCalories || !currentUser) {
      // Если нет данных профиля, используем старую логику
      if (totalCalories < 1200) {
        return { type: 'low', message: '⚠️ Малокалорийный день', color: 'orange' }
      } else if (totalCalories > 2500) {
        return { type: 'high', message: '⚠️ Высококалорийный день', color: 'red' }
      } else {
        return { type: 'balanced', message: '✅ Сбалансированное питание', color: 'green' }
      }
    }

    // Определяем диапазон калорий (±10% от рекомендуемого)
    const minCalories = Math.round(recommendedCalories * 0.9)
    const maxCalories = Math.round(recommendedCalories * 1.1)

    if (totalCalories < minCalories) {
      const deficit = recommendedCalories - totalCalories
      return {
        type: 'low',
        message: `⚠️ Малокалорийный день (не хватает ~${deficit} ккал)`,
        color: 'orange',
      }
    } else if (totalCalories > maxCalories) {
      const excess = totalCalories - recommendedCalories
      return {
        type: 'high',
        message: `⚠️ Высококалорийный день (превышение ~${excess} ккал)`,
        color: 'red',
      }
    } else {
      return {
        type: 'balanced',
        message: `✅ Сбалансированное питание (${totalCalories}/${recommendedCalories} ккал)`,
        color: 'green',
      }
    }
  }

  const getWeekStart = (date: Date) => {
    const weekStart = new Date(date)
    const dayOfWeek = date.getDay()
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    weekStart.setDate(diff)
    return weekStart
  }

  const getWeekDays = (weekStart: Date) => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      days.push(date)
    }
    return days
  }

  // Функции для drag & drop
  const handleDragStart = (e: React.DragEvent, item: CalendarItem) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', item.id.toString())
  }

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDate(date)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverDate(null)
  }

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault()
    setDragOverDate(null)

    if (draggedItem) {
      const targetDateString = targetDate.toISOString().split('T')[0] || ''
      const originalDateString = new Date(draggedItem.date).toISOString().split('T')[0] || ''

      // Если дата не изменилась, ничего не делаем
      if (targetDateString === originalDateString) {
        setDraggedItem(null)
        return
      }

      try {
        // Обновляем элемент календаря на новую дату
        const updatedItem = await apiClient.updateCalendarItem(draggedItem.id, targetDateString, draggedItem.mealType)

        // Обновляем локальное состояние
        const currentCalendarItems = $calendarItems.get()
        const updatedCalendarItems = currentCalendarItems.map((item) =>
          item.id === draggedItem.id ? updatedItem : item
        )
        $calendarItems.set(updatedCalendarItems)

        // Обновляем список покупок для обеих дат
        await updateShoppingList(targetDateString)
        await updateShoppingList(originalDateString)

        setDraggedItem(null)
      } catch (error) {
        console.error('Ошибка при перемещении рецепта:', error)
        alert('Ошибка при перемещении рецепта')
        setDraggedItem(null)
      }
    }
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverDate(null)
  }

  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    return calendarItems.filter((item) => {
      const itemDate = new Date(item.date).toISOString().split('T')[0]
      return itemDate === dateString
    })
  }

  const renderDay = (date: Date) => {
    const events = getEventsForDate(date)
    const isToday = new Date().toDateString() === date.toDateString()
    const isSelected = selectedDate && selectedDate.toDateString() === date.toDateString()
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const totalCalories = events.reduce((sum, event) => sum + event.recipe.calories, 0)

    // Проверяем, принадлежит ли дата текущей неделе
    const weekStart = getWeekStart(currentWeek)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const isCurrentWeek = date >= weekStart && date <= weekEnd

    const isDragOver = dragOverDate && dragOverDate.toDateString() === date.toDateString()

    return (
      <Box
        style={{
          position: 'relative',
          minHeight: 100,
          padding: 8,
          cursor: isCurrentWeek ? 'pointer' : 'default',
          backgroundColor: isSelected
            ? 'var(--mantine-color-teal-1)'
            : isDragOver
              ? 'var(--mantine-color-blue-1)'
              : isWeekend
                ? 'var(--mantine-color-gray-0)'
                : 'transparent',
          border: isToday
            ? '2px solid var(--mantine-color-teal-6)'
            : isDragOver
              ? '2px dashed var(--mantine-color-blue-6)'
              : '1px solid var(--mantine-color-gray-3)',
          borderRadius: 4,
          transition: 'all 0.2s ease',
          opacity: isCurrentWeek ? 1 : 0.4,
        }}
        onMouseEnter={(e) => {
          if (!isSelected && isCurrentWeek) {
            e.currentTarget.style.transform = 'scale(1.02)'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = 'none'
        }}
        onClick={() => isCurrentWeek && handleDateClick(date)}
        onDragOver={(e) => isCurrentWeek && handleDragOver(e, date)}
        onDragLeave={(e) => isCurrentWeek && handleDragLeave(e)}
        onDrop={(e) => isCurrentWeek && handleDrop(e, date)}
      >
        <Group justify="space-between" align="flex-start" mb={4}>
          <Text
            size="sm"
            fw={isToday ? 700 : 500}
            c={isToday ? 'teal' : isWeekend ? 'dimmed' : isCurrentWeek ? 'inherit' : 'dimmed'}
          >
            {date.getDate()}
          </Text>
          {totalCalories > 0 && isCurrentWeek && (
            <Text size="xs" c="dimmed" fw={500}>
              {(() => {
                const recommendedCalories = getRecommendedCalories()
                if (recommendedCalories) {
                  const percentage = Math.round((totalCalories / recommendedCalories) * 100)
                  let color = 'dimmed'
                  if (percentage < 80) color = 'orange'
                  else if (percentage > 120) color = 'red'
                  else color = 'green'

                  return (
                    <span style={{ color: `var(--mantine-color-${color}-6)` }}>
                      {totalCalories}/{recommendedCalories} ккал ({percentage}%)
                    </span>
                  )
                }
                return `${totalCalories} ккал`
              })()}
            </Text>
          )}
        </Group>

        {events.length > 0 && isCurrentWeek && (
          <Stack gap={2}>
            {events.slice(0, 2).map((event) => {
              const mealTypeEmoji =
                {
                  breakfast: '🌅',
                  lunch: '🍽️',
                  dinner: '🌙',
                  snack: '🍎',
                }[event.mealType] || '🍽️'

              const isDragging = draggedItem && draggedItem.id === event.id

              return (
                <Badge
                  key={event.id}
                  size="xs"
                  variant="filled"
                  color={isDragging ? 'gray' : 'teal'}
                  style={{
                    fontSize: '10px',
                    padding: '2px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    cursor: 'grab',
                    opacity: isDragging ? 0.5 : 1,
                    transform: isDragging ? 'rotate(5deg)' : 'none',
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, event)}
                  onDragEnd={handleDragEnd}
                >
                  <span style={{ fontSize: '8px' }}>{mealTypeEmoji}</span>
                  {event.recipe.name.length > 10 ? event.recipe.name.substring(0, 10) + '...' : event.recipe.name}
                </Badge>
              )
            })}
            {events.length > 2 && (
              <Text size="xs" c="dimmed">
                +{events.length - 2} еще
              </Text>
            )}
          </Stack>
        )}
      </Box>
    )
  }

  const weekDays = getWeekDays(getWeekStart(currentWeek))
  const weekDayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  return (
    <Stack gap="lg" pos="relative">
      <LoadingOverlay visible={loading} />

      <Group justify="space-between" align="center">
        <div>
          <Title>Календарь планирования питания</Title>
          {(() => {
            const selectedStats = getSelectedDayStats()
            const weekStats = getWeekStats()

            if (selectedDate) {
              return (
                <Text size="sm" c="dimmed" mt={4}>
                  {(() => {
                    const recommendedCalories = getRecommendedCalories()
                    if (recommendedCalories) {
                      const percentage = Math.round((selectedStats.totalCalories / recommendedCalories) * 100)
                      return `Выбранный день (${selectedDate.toLocaleDateString('ru-RU')}): ${selectedStats.totalRecipes} рецептов, ${selectedStats.totalCalories}/${recommendedCalories} ккал (${percentage}%)`
                    }
                    return `Выбранный день (${selectedDate.toLocaleDateString('ru-RU')}): ${selectedStats.totalRecipes} рецептов, ${selectedStats.totalCalories} ккал`
                  })()}
                </Text>
              )
            } else {
              return (
                <Text size="sm" c="dimmed" mt={4}>
                  {(() => {
                    const recommendedCalories = getRecommendedCalories()
                    if (recommendedCalories) {
                      const weeklyRecommended = recommendedCalories * 7
                      const percentage = Math.round((weekStats.totalCalories / weeklyRecommended) * 100)
                      return `На этой неделе: ${weekStats.totalRecipes} рецептов, ${weekStats.totalCalories}/${weeklyRecommended} ккал (${percentage}%)`
                    }
                    return `На этой неделе: ${weekStats.totalRecipes} рецептов, ${weekStats.totalCalories} ккал`
                  })()}
                </Text>
              )
            }
          })()}
        </div>
        <Group gap="xs">
          <QuickActions
            showExport={calendarItems.length > 0}
            onExportPDF={() => exportCalendarToPDF(calendarItems)}
            exportLabel="Экспорт календаря"
          />

          {user && <UserMenu user={user} onLogout={handleLogout} onOpenProfile={openProfileModal} />}
        </Group>
      </Group>

      <Breadcrumbs />

      <Text c="dimmed">
        Планируйте свое питание на неделю. Кликните на день, чтобы добавить рецепт. Перетаскивайте рецепты между днями
        для быстрого планирования. Все рецепты из календаря можно добавить в корзину одним кликом. Выходные дни выделены
        серым цветом, а суббота и воскресенье - розовым.
      </Text>

      <Grid>
        <Grid.Col span={9}>
          {/* Навигация календаря */}
          <Group justify="space-between" mb="md">
            <Title order={3}>
              {getWeekStart(currentWeek).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
              })}{' '}
              -{' '}
              {new Date(getWeekStart(currentWeek).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Title>
            <Group gap="xs">
              <Button
                variant="light"
                size="sm"
                onClick={() => {
                  const prevWeek = new Date(currentWeek)
                  prevWeek.setDate(currentWeek.getDate() - 7)
                  setCurrentWeek(prevWeek)
                }}
              >
                ←
              </Button>
              <Button variant="light" size="sm" onClick={() => setCurrentWeek(new Date())}>
                Сегодня
              </Button>
              <Button
                variant="light"
                size="sm"
                onClick={() => {
                  const nextWeek = new Date(currentWeek)
                  nextWeek.setDate(currentWeek.getDate() + 7)
                  setCurrentWeek(nextWeek)
                }}
              >
                →
              </Button>
            </Group>
          </Group>

          {/* Календарь */}
          <Card withBorder p="md" style={{ width: '100%' }}>
            <Stack gap="md" style={{ width: '100%' }}>
              {/* Заголовки дней недели */}
              <Grid columns={7} style={{ width: '100%' }}>
                {weekDayLabels.map((day, index) => (
                  <Grid.Col key={day} span={1}>
                    <Text ta="center" fw={600} size="md" c={index === 5 || index === 6 ? 'rose' : 'dimmed'} py="xs">
                      {day}
                    </Text>
                  </Grid.Col>
                ))}
              </Grid>

              {/* Календарные дни */}
              <Grid columns={7} style={{ width: '100%' }}>
                {weekDays.map((date, dayIndex) => (
                  <Grid.Col key={dayIndex} span={1}>
                    {renderDay(date)}
                  </Grid.Col>
                ))}
              </Grid>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={3}>
          <Stack gap="md">
            {selectedDate && (
              <>
                {/* Статистика калорий для выбранного дня */}
                <Card withBorder p="md">
                  <Title order={5} mb="sm" c="teal">
                    📊 Статистика дня
                  </Title>
                  {(() => {
                    const stats = getSelectedDayStats()
                    return (
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="sm" fw={500}>
                            Ожидаемые калории:
                          </Text>
                          <Badge size="lg" color="teal" variant="light">
                            {(() => {
                              const recommendedCalories = getRecommendedCalories()
                              if (recommendedCalories) {
                                const percentage = Math.round((stats.totalCalories / recommendedCalories) * 100)
                                let color = 'teal'
                                if (percentage < 80) color = 'orange'
                                else if (percentage > 120) color = 'red'
                                else color = 'green'

                                return (
                                  <span style={{ color: `var(--mantine-color-${color}-6)` }}>
                                    {stats.totalCalories}/{recommendedCalories} ккал
                                  </span>
                                )
                              }
                              return `${stats.totalCalories} ккал`
                            })()}
                          </Badge>
                        </Group>
                        <Group justify="space-between">
                          <Text size="sm" fw={500}>
                            Белки:
                          </Text>
                          <Badge size="sm" color="green" variant="light">
                            {stats.totalProteins}г
                          </Badge>
                        </Group>
                        <Group justify="space-between">
                          <Text size="sm" fw={500}>
                            Количество рецептов:
                          </Text>
                          <Badge size="sm" color="blue" variant="light">
                            {stats.totalRecipes}
                          </Badge>
                        </Group>
                        {stats.totalCalories > 0 && (
                          <Stack gap="xs" mt="xs">
                            {(() => {
                              const recommendation = getNutritionRecommendation(stats.totalCalories)
                              return (
                                <Text size="xs" c={recommendation.color}>
                                  {recommendation.message}
                                </Text>
                              )
                            })()}
                            {stats.totalProteins < 80 && (
                              <Text size="xs" c="orange" fw={500}>
                                ⚠️ Мало белка (рекомендуется минимум 80г)
                              </Text>
                            )}
                          </Stack>
                        )}
                      </Stack>
                    )
                  })()}
                </Card>

                <Card withBorder p="md">
                  <Title order={4} mb="md">
                    {selectedDate.toLocaleDateString('ru-RU', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Title>
                  {quickMealType && (
                    <Badge
                      color={
                        quickMealType === 'breakfast'
                          ? 'orange'
                          : quickMealType === 'lunch'
                            ? 'green'
                            : quickMealType === 'dinner'
                              ? 'blue'
                              : 'purple'
                      }
                      variant="light"
                      mb="md"
                    >
                      {quickMealType === 'breakfast'
                        ? '🍳 Завтрак'
                        : quickMealType === 'lunch'
                          ? '🍽️ Обед'
                          : quickMealType === 'dinner'
                            ? '🌙 Ужин'
                            : '🍎 Перекус'}
                    </Badge>
                  )}

                  <Stack gap="xs" mb="md">
                    {getEventsForDate(selectedDate).map((item) => {
                      const mealTypeEmoji =
                        {
                          breakfast: '🌅',
                          lunch: '🍽️',
                          dinner: '🌙',
                          snack: '🍎',
                        }[item.mealType] || '🍽️'

                      const mealTypeLabel =
                        {
                          breakfast: 'Завтрак',
                          lunch: 'Обед',
                          dinner: 'Ужин',
                          snack: 'Перекус',
                        }[item.mealType] || 'Прием пищи'

                      const isDragging = draggedItem && draggedItem.id === item.id

                      return (
                        <Group
                          key={item.id}
                          justify="space-between"
                          align="center"
                          style={{
                            padding: '8px',
                            borderRadius: '4px',
                            backgroundColor: isDragging ? 'var(--mantine-color-gray-1)' : 'transparent',
                            cursor: 'grab',
                            opacity: isDragging ? 0.5 : 1,
                            transform: isDragging ? 'rotate(2deg)' : 'none',
                          }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          onDragEnd={handleDragEnd}
                        >
                          <div>
                            <Group gap="xs" align="center">
                              <Text size="xs" c="dimmed">
                                {mealTypeEmoji} {mealTypeLabel}
                              </Text>
                            </Group>
                            <Text fw={500} size="sm">
                              {item.recipe.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              КБЖУ: {item.recipe.calories}/{item.recipe.proteins}/{item.recipe.fats}/
                              {item.recipe.carbohydrates}
                            </Text>
                          </div>
                          <ActionIcon variant="light" color="red" size="sm" onClick={() => removeFromCalendar(item.id)}>
                            <TrashIcon size={12} />
                          </ActionIcon>
                        </Group>
                      )
                    })}
                  </Stack>

                  <Divider mb="md" />

                  <Title order={5} mb="sm">
                    Добавить рецепт
                  </Title>

                  {/* Быстрые действия */}
                  <Group gap="xs" mb="sm">
                    <Button
                      variant={quickMealType === 'breakfast' ? 'filled' : 'light'}
                      size="xs"
                      onClick={() => handleQuickMeal('breakfast')}
                      color="orange"
                    >
                      🍳 Завтрак
                    </Button>
                    <Button
                      variant={quickMealType === 'lunch' ? 'filled' : 'light'}
                      size="xs"
                      onClick={() => handleQuickMeal('lunch')}
                      color="green"
                    >
                      🍽️ Обед
                    </Button>
                    <Button
                      variant={quickMealType === 'dinner' ? 'filled' : 'light'}
                      size="xs"
                      onClick={() => handleQuickMeal('dinner')}
                      color="blue"
                    >
                      🌙 Ужин
                    </Button>
                    <Button
                      variant={quickMealType === 'snack' ? 'filled' : 'light'}
                      size="xs"
                      onClick={() => handleQuickMeal('snack')}
                      color="purple"
                    >
                      🍎 Перекус
                    </Button>
                  </Group>

                  {/* Поиск рецептов */}
                  <TextInput
                    placeholder="Поиск рецептов..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    mb="sm"
                    leftSection={<span style={{ fontSize: '12px' }}>🔍</span>}
                  />

                  <Select
                    placeholder="Выберите рецепт"
                    value={selectedRecipe?.toString() || ''}
                    onChange={(value) => setSelectedRecipe(value ? Number(value) : null)}
                    data={filteredRecipes.map((recipe) => ({
                      value: recipe.id.toString(),
                      label: `${recipe.name} (${recipe.calories} ккал)`,
                    }))}
                    mb="sm"
                    searchable
                  />
                  {selectedRecipe &&
                    (() => {
                      const recipe = recipes.find((r) => r.id === selectedRecipe)
                      return recipe ? (
                        <Card
                          withBorder
                          p="xs"
                          mb="sm"
                          style={{
                            backgroundColor: 'var(--mantine-color-blue-0)',
                          }}
                        >
                          <Text size="sm" fw={500} mb={4}>
                            {recipe.name}
                          </Text>
                          <Group gap="xs">
                            <Badge size="xs" color="blue">
                              {recipe.calories} ккал
                            </Badge>
                            <Badge size="xs" color="green">
                              {recipe.proteins}г белка
                            </Badge>
                            <Badge size="xs" color="orange">
                              {recipe.fats}г жиров
                            </Badge>
                            <Badge size="xs" color="purple">
                              {recipe.carbohydrates}г углеводов
                            </Badge>
                          </Group>
                        </Card>
                      ) : null
                    })()}

                  <Button onClick={handleAddToCalendar} disabled={!selectedRecipe} size="sm" fullWidth mb="sm">
                    {quickMealType
                      ? `Добавить на ${quickMealType === 'breakfast' ? 'завтрак' : quickMealType === 'lunch' ? 'обед' : quickMealType === 'dinner' ? 'ужин' : 'перекус'}`
                      : 'Добавить (обед по умолчанию)'}
                  </Button>

                  <Group gap="xs">
                    <Button variant="light" color="gray" onClick={handleCancelSelection} size="sm" style={{ flex: 1 }}>
                      Очистить выбор рецепта
                    </Button>
                    <Button
                      variant="light"
                      color="red"
                      onClick={handleCancelDateSelection}
                      size="sm"
                      style={{ flex: 1 }}
                    >
                      Отменить день
                    </Button>
                  </Group>
                </Card>
              </>
            )}

            {!selectedDate && (
              <Card withBorder p="md">
                <Text c="dimmed" ta="center">
                  Выберите день в календаре, чтобы добавить рецепт
                </Text>
              </Card>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  )
}

function Recipe() {
  const params = useParams()
  const id: number = Number(params.id)
  const recipes = useStore($recipes)
  const recipe = recipes.find((r) => r.id === id)
  const [servings, setServings] = React.useState(1)
  const [isFavorite, setIsFavorite] = React.useState(false)

  if (!recipe) {
    return 'Not found'
  }

  // Расчет ингредиентов с учетом количества порций
  const scaledIngredients = recipe.ingredients.map((ingredient) => ({
    ...ingredient,
    scaledAmount: ingredient.amount * servings,
  }))

  // Расчет КБЖУ с учетом количества порций
  const scaledNutrition = {
    calories: recipe.calories * servings,
    proteins: recipe.proteins * servings,
    fats: recipe.fats * servings,
    carbohydrates: recipe.carbohydrates * servings,
  }

  // Процент готовности (наличие ингредиентов)
  const availableIngredients = scaledIngredients.filter((ingredient) => {
    const available = getIngredientStock(ingredient.name)
    return available >= ingredient.scaledAmount
  })
  const readinessPercentage = Math.round((availableIngredients.length / scaledIngredients.length) * 100)

  return (
    <Stack gap="lg">
      {/* Навигация */}
      <Group justify="space-between" align="center">
        <Button component={Link} to="/" variant="light" leftSection="←">
          Назад к рецептам
        </Button>
        <Group gap="xs">
          <ActionIcon variant={isFavorite ? 'filled' : 'light'} color="red" onClick={() => setIsFavorite(!isFavorite)}>
            ❤️
          </ActionIcon>
          <ActionIcon variant="subtle" color="blue" onClick={() => openEditRecipeModal(recipe)}>
            <PencilIcon size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteRecipe(recipe.id)}>
            <TrashIcon size={16} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Основная карточка рецепта */}
      <Card withBorder p="xl" radius="md">
        <Stack gap="lg">
          {/* Заголовок и основная информация */}
          <Group justify="space-between" align="flex-start">
            <div style={{ flex: 1 }}>
              <Title order={1} mb="md">
                {recipe.name}
              </Title>

              {/* КБЖУ с учетом порций */}
              <Group gap="md" mb="md">
                <Badge size="lg" color="blue" variant="filled">
                  {scaledNutrition.calories} ккал
                </Badge>
                <Badge size="lg" color="green" variant="filled">
                  {scaledNutrition.proteins}г белка
                </Badge>
                <Badge size="lg" color="orange" variant="filled">
                  {scaledNutrition.fats}г жиров
                </Badge>
                <Badge size="lg" color="purple" variant="filled">
                  {scaledNutrition.carbohydrates}г углеводов
                </Badge>
              </Group>

              {/* Прогресс готовности */}
              <div style={{ marginBottom: '1rem' }}>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>
                    Готовность к приготовлению:
                  </Text>
                  <Text
                    size="sm"
                    fw={700}
                    c={readinessPercentage === 100 ? 'green' : readinessPercentage > 50 ? 'orange' : 'red'}
                  >
                    {readinessPercentage}%
                  </Text>
                </Group>
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'var(--mantine-color-gray-2)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${readinessPercentage}%`,
                      height: '100%',
                      backgroundColor:
                        readinessPercentage === 100
                          ? 'var(--mantine-color-green-6)'
                          : readinessPercentage > 50
                            ? 'var(--mantine-color-orange-6)'
                            : 'var(--mantine-color-red-6)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Калькулятор порций */}
            <Card withBorder p="md" style={{ minWidth: '200px' }}>
              <Text size="sm" fw={500} mb="sm">
                Количество порций:
              </Text>
              <Group gap="xs" align="center">
                <ActionIcon
                  variant="light"
                  onClick={() => setServings(Math.max(1, servings - 1))}
                  disabled={servings <= 1}
                >
                  -
                </ActionIcon>
                <NumberInput
                  value={servings}
                  onChange={(value) => setServings(Math.max(1, Number(value) || 1))}
                  min={1}
                  max={20}
                  w={80}
                  size="sm"
                />
                <ActionIcon
                  variant="light"
                  onClick={() => setServings(Math.min(20, servings + 1))}
                  disabled={servings >= 20}
                >
                  +
                </ActionIcon>
              </Group>
              <Text size="xs" c="dimmed" mt="xs">
                Все значения пересчитываются автоматически
              </Text>
            </Card>
          </Group>

          <Divider />

          {/* Ингредиенты */}
          <div>
            <Title order={3} mb="md">
              Ингредиенты ({scaledIngredients.length})
            </Title>
            <Grid>
              {scaledIngredients.map((ingredient) => {
                const available = getIngredientStock(ingredient.name)
                const hasEnough = available >= ingredient.scaledAmount
                const icon = hasEnough ? (
                  <CheckCircleFillIcon size={16} fill="var(--mantine-color-green-8)" />
                ) : (
                  <XCircleFillIcon size={16} fill="var(--mantine-color-red-8)" />
                )

                return (
                  <Grid.Col key={ingredient.name} span={6}>
                    <Card
                      withBorder
                      p="sm"
                      style={{
                        backgroundColor: hasEnough ? 'var(--mantine-color-green-0)' : 'var(--mantine-color-red-0)',
                        borderColor: hasEnough ? 'var(--mantine-color-green-3)' : 'var(--mantine-color-red-3)',
                      }}
                    >
                      <Group gap="sm">
                        {icon}
                        <div style={{ flex: 1 }}>
                          <Text size="sm" fw={500}>
                            {ingredient.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {ingredient.scaledAmount} {ingredient.amountType}
                            {available > 0 && <span> (есть {available})</span>}
                          </Text>
                        </div>
                      </Group>
                    </Card>
                  </Grid.Col>
                )
              })}
            </Grid>
          </div>

          <Divider />

          {/* Информация о приготовлении */}
          {(recipe.cookingTime || recipe.difficulty) && (
            <div>
              <Title order={3} mb="md">
                Информация о приготовлении
              </Title>
              <Group gap="lg">
                {recipe.cookingTime && (
                  <Card withBorder p="sm" style={{ minWidth: '150px' }}>
                    <Text size="sm" fw={500} c="dimmed">
                      Время приготовления
                    </Text>
                    <Text size="lg" fw={700}>
                      ⏱️ {recipe.cookingTime} мин
                    </Text>
                  </Card>
                )}
                {recipe.difficulty && (
                  <Card withBorder p="sm" style={{ minWidth: '150px' }}>
                    <Text size="sm" fw={500} c="dimmed">
                      Сложность
                    </Text>
                    <Text size="lg" fw={700}>
                      {recipe.difficulty === 'easy'
                        ? '🟢 Легко'
                        : recipe.difficulty === 'medium'
                          ? '🟡 Средне'
                          : recipe.difficulty === 'hard'
                            ? '🔴 Сложно'
                            : recipe.difficulty}
                    </Text>
                  </Card>
                )}
              </Group>
            </div>
          )}

          {/* Инструкции приготовления */}
          {recipe.instructions && (
            <div>
              <Title order={3} mb="md">
                Инструкции приготовления
              </Title>
              <Card withBorder p="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                <Text style={{ whiteSpace: 'pre-line' }}>{recipe.instructions}</Text>
              </Card>
            </div>
          )}

          <Divider />

          {/* Быстрые действия */}
          <div>
            <Title order={3} mb="md">
              Действия
            </Title>
            <Group gap="md">
              <Button
                variant="light"
                color="green"
                leftSection="📅"
                component={Link}
                to={`/calendar?recipe=${recipe.id}`}
                size="lg"
              >
                Добавить в календарь
              </Button>
              <Button
                variant="light"
                color="gray"
                leftSection="📋"
                onClick={() => {
                  // Копирование рецепта в буфер обмена
                  const recipeText = `${recipe.name}\n\nКБЖУ: ${recipe.calories}/${recipe.proteins}/${recipe.fats}/${recipe.carbohydrates}\n\nИнгредиенты:\n${recipe.ingredients.map((i) => `- ${i.name}: ${i.amount} ${i.amountType}`).join('\n')}`
                  navigator.clipboard.writeText(recipeText)
                }}
                size="lg"
              >
                Копировать рецепт
              </Button>
            </Group>
          </div>
        </Stack>
      </Card>

      {/* Похожие рецепты */}
      {recipes.length > 1 && (
        <Card withBorder p="xl">
          <Title order={3} mb="md">
            Похожие рецепты
          </Title>
          <Grid>
            {recipes
              .filter((r) => r.id !== recipe.id)
              .slice(0, 3)
              .map((similarRecipe) => (
                <Grid.Col key={similarRecipe.id} span={4}>
                  <Card
                    withBorder
                    p="md"
                    style={{ cursor: 'pointer' }}
                    onClick={() => (window.location.href = `/recipe/${similarRecipe.id}`)}
                  >
                    <Title order={4} mb="sm">
                      {similarRecipe.name}
                    </Title>
                    <Group gap="xs" mb="sm">
                      <Badge size="sm" color="blue">
                        {similarRecipe.calories} ккал
                      </Badge>
                      <Badge size="sm" color="green">
                        {similarRecipe.proteins}г белка
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed" lineClamp={2}>
                      {similarRecipe.ingredients.map((i) => i.name).join(', ')}
                    </Text>
                  </Card>
                </Grid.Col>
              ))}
          </Grid>
        </Card>
      )}
    </Stack>
  )
}

function App() {
  const isAuthenticated = useStore($isAuthenticated)
  const loading = useStore($loading)
  // Хуки для модального окна календаря
  const addToCalendarModalOpened = useStore($addToCalendarModal)
  const profileModalOpened = useStore($profileModal)
  const profileReminderModalOpened = useStore($profileReminderModal)
  const selectedRecipeForCalendar = useStore($selectedRecipeForCalendar)

  // Хуки для модального окна редактирования рецепта
  const editRecipeModalOpened = useStore($editRecipeModal)
  const selectedRecipeForEdit = useStore($selectedRecipeForEdit)

  // Проверяем авторизацию при монтировании компонента
  React.useEffect(() => {
    checkAuth()
  }, [])

  // Загружаем данные при монтировании компонента (только если авторизованы)
  React.useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  // Если проверяем авторизацию, показываем загрузку
  if (loading && !isAuthenticated) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <LoadingOverlay visible />
      </div>
    )
  }

  // Если не авторизованы, показываем страницу входа
  if (!isAuthenticated) {
    return (
      <div style={{ fontFamily: 'Inter' }}>
        <Providers>
          <Login />
        </Providers>
      </div>
    )
  }

  return (
    <div>
      <Providers>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          {/* Боковая навигация */}
          <MainNavigation />

          {/* Основной контент */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="main-content" style={{ flex: 1, padding: '20px' }}>
              <Routes>
                <Route path="/" element={<CalendarPage />} />
                <Route path="/recipes" element={<RecipesPage />} />
                <Route path="/public-recipes" element={<PublicRecipesPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />

                <Route path="/shopping-list" element={<ShoppingListPage />} />
                <Route path="/ingredients" element={<IngredientsPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/food-diary" element={<FoodDiaryPage />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/recipe/:id" element={<Recipe />} />
              </Routes>
            </div>
          </div>
        </div>
        <CreateRecipeForm />
        <CreateIngredientForm />
        <AddToCalendarModal
          opened={addToCalendarModalOpened}
          onClose={closeAddToCalendarModal}
          onConfirm={handleAddToCalendarConfirm}
          recipeName={selectedRecipeForCalendar?.name || ''}
        />
        <EditRecipeForm
          opened={editRecipeModalOpened}
          onClose={closeEditRecipeModal}
          recipe={selectedRecipeForEdit}
          onSave={handleEditRecipeSave}
        />
        <UserProfileModal opened={profileModalOpened} onClose={closeProfileModal} />
        <ProfileReminderModal
          opened={profileReminderModalOpened}
          onClose={closeProfileReminderModal}
          onOpenProfile={openProfileModal}
        />
      </Providers>
    </div>
  )
}

// Экспорты для использования в других компонентах
export {
  $addToCalendarModal,
  $calendarItems,
  $createIngredientModal,
  $createRecipeModal,
  $favoriteRecipes,
  $ingredients,
  $isAuthenticated,
  $loading,
  $recipes,
  $selectedRecipeForCalendar,
  $shoppingList,
  $stockItems,
  $user,
  addToCalendar,
  closeAddToCalendarModal,
  closeEditRecipeModal,
  closeProfileModal,
  closeProfileReminderModal,
  exportCalendarToPDF,
  exportFoodDiaryToPDF,
  exportShoppingListToPDF,
  getIngredientStock,
  handleAddToCalendarConfirm,
  handleDeleteRecipe,
  handleEditRecipeSave,
  isRecipeFavorite,
  openAddToCalendarModal,
  openEditRecipeModal,
  openProfileModal,
  openProfileReminderModal,
  toggleFavoriteRecipe,
  updateShoppingList,
}

export default App
