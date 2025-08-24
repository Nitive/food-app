import '@mantine/core/styles.css'

import {
  ActionIcon,
  Button,
  Divider,
  Group,
  List,
  MantineProvider,
  NumberInput,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { useStore } from '@nanostores/react'
import { CheckCircleFillIcon, DashIcon, PlusIcon, TrashIcon, XCircleFillIcon } from '@primer/octicons-react'
import { atom, computed } from 'nanostores'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router'
import { groupBy, sumBy } from 'remeda'
import { recipes } from './data.js'

function Providers(props: { children: React.ReactNode }) {
  return (
    <MantineProvider>
      <BrowserRouter>{props.children}</BrowserRouter>
    </MantineProvider>
  )
}

// Типы для корзины
interface CartItem {
  recipeId: number
  quantity: number
}

// Типы для ингредиентов
interface IngredientStock {
  name: string
  amount: number
  amountType: string
}

// Функции для работы с localStorage
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch (error) {
    console.warn(`Failed to load ${key} from localStorage:`, error)
    return defaultValue
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage:`, error)
  }
}

// Загружаем начальное состояние из localStorage
const initialCartItems = loadFromStorage<CartItem[]>('food-app-cart', [])
const initialIngredientStock = loadFromStorage<IngredientStock[]>('food-app-ingredients', [])

// Состояние корзины
const $cartItems = atom<CartItem[]>(initialCartItems)

// Состояние наличия ингредиентов
const $ingredientStock = atom<IngredientStock[]>(initialIngredientStock)

// Подписываемся на изменения и сохраняем в localStorage
$cartItems.listen((items) => {
  saveToStorage('food-app-cart', items)
})

$ingredientStock.listen((stock) => {
  saveToStorage('food-app-ingredients', stock)
})

// Получаем все уникальные ингредиенты из рецептов
const $allIngredients = computed([], () => {
  const allIngredients = new Map<string, { name: string; amountType: string }>()

  recipes.forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      if (!allIngredients.has(ingredient.name)) {
        allIngredients.set(ingredient.name, {
          name: ingredient.name,
          amountType: ingredient.amountType,
        })
      }
    })
  })

  return Array.from(allIngredients.values())
})

// Вычисляем рецепты в корзине
const $cartRecipes = computed($cartItems, (items) =>
  items
    .map((item) => {
      const recipe = recipes.find((r) => r.id === item.recipeId)
      return recipe ? { ...recipe, quantity: item.quantity } : null
    })
    .filter(Boolean)
)

// Вычисляем список покупок (группированные ингредиенты с учетом наличия)
const $shoppingList = computed([$cartItems, $ingredientStock], (items, stock) => {
  const allIngredients: Array<{ name: string; amount: number; amountType: string }> = []

  items.forEach((item) => {
    const recipe = recipes.find((r) => r.id === item.recipeId)
    if (recipe) {
      recipe.ingredients.forEach((ingredient) => {
        allIngredients.push({
          name: ingredient.name,
          amount: ingredient.amount * item.quantity,
          amountType: ingredient.amountType,
        })
      })
    }
  })

  // Группируем по названию ингредиента
  const grouped = groupBy(allIngredients, (item) => item.name)

  return Object.entries(grouped)
    .map(([name, ingredients]) => {
      const totalNeeded = sumBy(ingredients, (item) => item.amount)
      const available = stock.find((s) => s.name === name)?.amount || 0
      const needToBuy = Math.max(0, totalNeeded - available)

      return {
        name,
        totalNeeded,
        available,
        needToBuy,
        amountType: ingredients[0].amountType,
      }
    })
    .filter((item) => item.needToBuy > 0) // Показываем только то, что нужно купить
})

// Функции для работы с корзиной
function addToCart(recipeId: number) {
  const currentItems = $cartItems.get()
  const existingItem = currentItems.find((item) => item.recipeId === recipeId)

  if (existingItem) {
    $cartItems.set(
      currentItems.map((item) => (item.recipeId === recipeId ? { ...item, quantity: item.quantity + 1 } : item))
    )
  } else {
    $cartItems.set([...currentItems, { recipeId, quantity: 1 }])
  }
}

function removeFromCart(recipeId: number) {
  const currentItems = $cartItems.get()
  const existingItem = currentItems.find((item) => item.recipeId === recipeId)

  if (existingItem && existingItem.quantity > 1) {
    $cartItems.set(
      currentItems.map((item) => (item.recipeId === recipeId ? { ...item, quantity: item.quantity - 1 } : item))
    )
  } else {
    $cartItems.set(currentItems.filter((item) => item.recipeId !== recipeId))
  }
}

function updateCartQuantity(recipeId: number, quantity: number) {
  const currentItems = $cartItems.get()

  if (quantity <= 0) {
    $cartItems.set(currentItems.filter((item) => item.recipeId !== recipeId))
  } else {
    $cartItems.set(currentItems.map((item) => (item.recipeId === recipeId ? { ...item, quantity } : item)))
  }
}

function clearCart() {
  $cartItems.set([])
}

// Функции для работы с наличием ингредиентов
function updateIngredientStock(name: string, amount: number) {
  const currentStock = $ingredientStock.get()
  const existingIndex = currentStock.findIndex((item) => item.name === name)

  if (existingIndex >= 0) {
    if (amount <= 0) {
      $ingredientStock.set(currentStock.filter((item) => item.name !== name))
    } else {
      const updatedStock = [...currentStock]
      const existingItem = updatedStock[existingIndex]
      if (existingItem) {
        updatedStock[existingIndex] = {
          name: existingItem.name,
          amount,
          amountType: existingItem.amountType
        }
        $ingredientStock.set(updatedStock)
      }
    }
  } else if (amount > 0) {
    const allIngredients = $allIngredients.get()
    const ingredient = allIngredients.find((i) => i.name === name)
    if (ingredient) {
      const newItem: IngredientStock = {
        name,
        amount,
        amountType: ingredient.amountType,
      }
      $ingredientStock.set([...currentStock, newItem])
    }
  }
}

function getIngredientStock(name: string): number {
  return $ingredientStock.get().find((item) => item.name === name)?.amount || 0
}

// Функция для очистки всех данных
function clearAllData() {
  $cartItems.set([])
  $ingredientStock.set([])
  localStorage.removeItem('food-app-cart')
  localStorage.removeItem('food-app-ingredients')
}

function RecipesPage() {
  const cartRecipes = useStore($cartRecipes)
  const shoppingList = useStore($shoppingList)

  const stats = {
    calories: sumBy(cartRecipes, (r) => (r?.calories || 0) * (r?.quantity || 0)).toFixed(1),
    proteins: sumBy(cartRecipes, (r) => (r?.proteins || 0) * (r?.quantity || 0)).toFixed(1),
    fats: sumBy(cartRecipes, (r) => (r?.fats || 0) * (r?.quantity || 0)).toFixed(1),
    carbohydrates: sumBy(cartRecipes, (r) => (r?.carbohydrates || 0) * (r?.quantity || 0)).toFixed(1),
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title>Рецепты</Title>
        <Button component={Link} to="/ingredients" variant="light">
          Управление ингредиентами
        </Button>
      </Group>

      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Название</Table.Th>
            <Table.Th>Ингредиенты</Table.Th>
            <Table.Th>Действия</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {recipes.map((recipe) => (
            <Table.Tr key={recipe.id}>
              <Table.Td>
                <Link
                  to={`/recipe/${recipe.id}`}
                  style={{ color: 'var(--mantine-color-blue-6)', textDecoration: 'none' }}
                >
                  {recipe.name}
                </Link>
              </Table.Td>
              <Table.Td>{recipe.ingredients.map((i) => i.name).join(', ')}</Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="light" color="blue" onClick={() => addToCart(recipe.id)}>
                    <PlusIcon size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {cartRecipes.length > 0 && (
        <>
          <Divider />

          <Title order={2}>Корзина</Title>

          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Рецепт</Table.Th>
                <Table.Th>Количество</Table.Th>
                <Table.Th>КБЖУ (на порцию)</Table.Th>
                <Table.Th>Действия</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {cartRecipes.map((recipe) => (
                <Table.Tr key={recipe?.id}>
                  <Table.Td>
                    <Link
                      to={`/recipe/${recipe?.id}`}
                      style={{ color: 'var(--mantine-color-blue-6)', textDecoration: 'none' }}
                    >
                      {recipe?.name}
                    </Link>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon variant="light" color="red" onClick={() => removeFromCart(recipe?.id || 0)}>
                        <DashIcon size={16} />
                      </ActionIcon>
                      <NumberInput
                        value={recipe?.quantity || 0}
                        onChange={(value) => updateCartQuantity(recipe?.id || 0, Number(value) || 0)}
                        min={1}
                        max={99}
                        w={80}
                        size="sm"
                      />
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {recipe?.calories}/{recipe?.proteins}/{recipe?.fats}/{recipe?.carbohydrates}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon variant="light" color="red" onClick={() => updateCartQuantity(recipe?.id || 0, 0)}>
                      <TrashIcon size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <Group justify="space-between" align="center">
            <Text fw={500}>
              Общий КБЖУ: {stats.calories}/{stats.proteins}/{stats.fats}/{stats.carbohydrates}
            </Text>
            <Button variant="light" color="red" onClick={clearCart}>
              Очистить корзину
            </Button>
          </Group>

          <Divider />

          <Title order={2}>Список покупок</Title>

          <Paper p="md" withBorder>
            <List icon={<CheckCircleFillIcon size={16} fill="var(--mantine-color-green-8)" />}>
              {shoppingList.map((item) => (
                <List.Item key={item.name}>
                  <Text fw={500}>{item.name}</Text>
                  <Amount>
                    {item.needToBuy} {item.amountType} (нужно {item.totalNeeded}, есть {item.available})
                  </Amount>
                </List.Item>
              ))}
            </List>
          </Paper>
        </>
      )}
    </Stack>
  )
}

function IngredientsPage() {
  const allIngredients = useStore($allIngredients)
  const ingredientStock = useStore($ingredientStock)

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title>Управление ингредиентами</Title>
        <Group gap="xs">
          <Button variant="light" color="red" onClick={clearAllData} size="sm">
            Очистить все данные
          </Button>
          <Button component={Link} to="/" variant="light">
            Назад к рецептам
          </Button>
        </Group>
      </Group>

      <Text c="dimmed">
        Укажите количество имеющихся ингредиентов. Это поможет составить точный список покупок. Все данные автоматически
        сохраняются в браузере.
      </Text>

      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Ингредиент</Table.Th>
            <Table.Th>Единица измерения</Table.Th>
            <Table.Th>Количество в наличии</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {allIngredients.map((ingredient) => {
            const currentStock = ingredientStock.find((s) => s.name === ingredient.name)?.amount || 0

            return (
              <Table.Tr key={ingredient.name}>
                <Table.Td>
                  <Text fw={500}>{ingredient.name}</Text>
                </Table.Td>
                <Table.Td>
                  <Text>{ingredient.amountType}</Text>
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    value={currentStock}
                    onChange={(value) => updateIngredientStock(ingredient.name, Number(value) || 0)}
                    min={0}
                    max={9999}
                    w={120}
                    size="sm"
                    placeholder="0"
                  />
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>

      <Paper p="md" withBorder>
        <Title order={3} mb="sm">
          Ингредиенты в наличии
        </Title>
        <List>
          {ingredientStock.map((item) => (
            <List.Item key={item.name}>
              <Text fw={500}>{item.name}</Text>
              <Amount>
                {item.amount} {item.amountType}
              </Amount>
            </List.Item>
          ))}
        </List>
        {ingredientStock.length === 0 && <Text c="dimmed">Нет ингредиентов в наличии</Text>}
      </Paper>
    </Stack>
  )
}

function Amount(props: { children: React.ReactNode }) {
  return (
    <Text component="span" c="gray.6" fw={500}>
      {props.children}{' '}
    </Text>
  )
}

function Recipe() {
  const params = useParams()
  const id: number = Number(params.id)
  const recipe = recipes.find((r) => r.id === id)

  if (!recipe) {
    return 'Not found'
  }

  return (
    <>
      <Group>
        <Title component="h1">{recipe.name}</Title>
        <Text c="gray.7" fw={500}>
          КБЖУ {recipe.calories}/{recipe.proteins}/{recipe.fats}/{recipe.carbohydrates}
        </Text>
      </Group>

      <Title mt="sm" component="h2" size="xl">
        Ингредиенты
      </Title>

      <List mt="xs">
        {recipe.ingredients.map((ingredient) => {
          const available = getIngredientStock(ingredient.name)
          const hasEnough = available >= ingredient.amount
          const icon = hasEnough ? (
            <CheckCircleFillIcon size={16} fill="var(--mantine-color-green-8)" />
          ) : (
            <XCircleFillIcon size={16} fill="var(--mantine-color-red-8)" />
          )

          return (
            <List.Item key={ingredient.name} icon={icon}>
              {ingredient.name}{' '}
              <Amount>
                {ingredient.amount} {ingredient.amountType}
              </Amount>
              {available > 0 && (
                <Text component="span" c="dimmed" size="sm">
                  {' '}
                  (есть {available})
                </Text>
              )}
            </List.Item>
          )
        })}
      </List>
    </>
  )
}

function App() {
  return (
    <div
      style={{
        width: 900,
        marginTop: 30,
        marginLeft: 'auto',
        marginRight: 'auto',
        fontFamily: 'Inter',
      }}
    >
      <Providers>
        <Routes>
          <Route index element={<RecipesPage />} />
          <Route path="ingredients" element={<IngredientsPage />} />
          <Route path="recipe/:id" element={<Recipe />} />
        </Routes>
      </Providers>
    </div>
  )
}

const root = createRoot(document.getElementById('app')!)
root.render(<App />)
