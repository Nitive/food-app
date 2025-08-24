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
  LoadingOverlay,
} from '@mantine/core'
import { useStore } from '@nanostores/react'
import { CheckCircleFillIcon, DashIcon, PlusIcon, TrashIcon, XCircleFillIcon } from '@primer/octicons-react'
import { atom, computed } from 'nanostores'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router'
import { groupBy, sumBy } from 'remeda'
import { apiClient, type Recipe, type CartItem, type Ingredient, type StockItem, type ShoppingListItem } from './api-client.js'
import React from 'react'

function Providers(props: { children: React.ReactNode }) {
  return (
    <MantineProvider>
      <BrowserRouter>{props.children}</BrowserRouter>
    </MantineProvider>
  )
}

// Состояние загрузки
const $loading = atom(false)

// Состояние рецептов
const $recipes = atom<Recipe[]>([])

// Состояние корзины
const $cartItems = atom<CartItem[]>([])

// Состояние ингредиентов
const $ingredients = atom<Ingredient[]>([])

// Состояние наличия ингредиентов
const $stockItems = atom<StockItem[]>([])

// Состояние списка покупок
const $shoppingList = atom<ShoppingListItem[]>([])

// Загрузка данных
async function loadData() {
  $loading.set(true)
  try {
    const [recipes, cartItems, ingredients, stockItems, shoppingList] = await Promise.all([
      apiClient.getRecipes(),
      apiClient.getCart(),
      apiClient.getIngredients(),
      apiClient.getStock(),
      apiClient.getShoppingList()
    ])
    
    $recipes.set(recipes)
    $cartItems.set(cartItems)
    $ingredients.set(ingredients)
    $stockItems.set(stockItems)
    $shoppingList.set(shoppingList)
  } catch (error) {
    console.error('Ошибка загрузки данных:', error)
  } finally {
    $loading.set(false)
  }
}

// Функции для работы с корзиной
async function addToCart(recipeId: number) {
  try {
    const newItem = await apiClient.addToCart(recipeId)
    await loadData() // Перезагружаем данные
  } catch (error) {
    console.error('Ошибка добавления в корзину:', error)
  }
}

async function updateCartQuantity(id: number, quantity: number) {
  try {
    await apiClient.updateCartItem(id, quantity)
    await loadData() // Перезагружаем данные
  } catch (error) {
    console.error('Ошибка обновления корзины:', error)
  }
}

async function removeFromCart(id: number) {
  try {
    await apiClient.removeFromCart(id)
    await loadData() // Перезагружаем данные
  } catch (error) {
    console.error('Ошибка удаления из корзины:', error)
  }
}

async function clearCart() {
  try {
    await apiClient.clearCart()
    await loadData() // Перезагружаем данные
  } catch (error) {
    console.error('Ошибка очистки корзины:', error)
  }
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

function getIngredientStock(ingredientName: string): number {
  const stockItem = $stockItems.get().find(item => item.ingredient.name === ingredientName)
  return stockItem?.amount || 0
}

function RecipesPage() {
  const recipes = useStore($recipes)
  const cartItems = useStore($cartItems)
  const shoppingList = useStore($shoppingList)
  const loading = useStore($loading)

  const stats = {
    calories: sumBy(cartItems, (r) => (r?.recipe?.calories || 0) * (r?.quantity || 0)).toFixed(1),
    proteins: sumBy(cartItems, (r) => (r?.recipe?.proteins || 0) * (r?.quantity || 0)).toFixed(1),
    fats: sumBy(cartItems, (r) => (r?.recipe?.fats || 0) * (r?.quantity || 0)).toFixed(1),
    carbohydrates: sumBy(cartItems, (r) => (r?.recipe?.carbohydrates || 0) * (r?.quantity || 0)).toFixed(1),
  }

  return (
    <Stack gap="lg" pos="relative">
      <LoadingOverlay visible={loading} />
      
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

      {cartItems.length > 0 && (
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
              {cartItems.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Link
                      to={`/recipe/${item.recipe.id}`}
                      style={{ color: 'var(--mantine-color-blue-6)', textDecoration: 'none' }}
                    >
                      {item.recipe.name}
                    </Link>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon variant="light" color="red" onClick={() => updateCartQuantity(item.id, item.quantity - 1)}>
                        <DashIcon size={16} />
                      </ActionIcon>
                      <NumberInput
                        value={item.quantity}
                        onChange={(value) => updateCartQuantity(item.id, Number(value) || 0)}
                        min={1}
                        max={99}
                        w={80}
                        size="sm"
                      />
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {item.recipe.calories}/{item.recipe.proteins}/{item.recipe.fats}/{item.recipe.carbohydrates}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon variant="light" color="red" onClick={() => removeFromCart(item.id)}>
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
                    {item.amount} {item.amountType}
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
  const ingredients = useStore($ingredients)
  const stockItems = useStore($stockItems)
  const loading = useStore($loading)

  return (
    <Stack gap="lg" pos="relative">
      <LoadingOverlay visible={loading} />
      
      <Group justify="space-between" align="center">
        <Title>Управление ингредиентами</Title>
        <Group gap="xs">
          <Button variant="light" color="red" onClick={clearCart} size="sm">
            Очистить все данные
          </Button>
          <Button component={Link} to="/" variant="light">
            Назад к рецептам
          </Button>
        </Group>
      </Group>

      <Text c="dimmed">
        Укажите количество имеющихся ингредиентов. Это поможет составить точный список покупок. 
        Все данные автоматически сохраняются в базе данных.
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
          {ingredients.map((ingredient) => {
            const currentStock = stockItems.find(s => s.ingredient.id === ingredient.id)?.amount || 0
            
            return (
              <Table.Tr key={ingredient.id}>
                <Table.Td>
                  <Text fw={500}>{ingredient.name}</Text>
                </Table.Td>
                <Table.Td>
                  <Text>{ingredient.amountType}</Text>
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    value={currentStock}
                    onChange={(value) => updateIngredientStock(ingredient.id, Number(value) || 0)}
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
          {stockItems.map((item) => (
            <List.Item key={item.ingredient.name}>
              <Text fw={500}>{item.ingredient.name}</Text>
              <Amount>
                {item.amount} {item.ingredient.amountType}
              </Amount>
            </List.Item>
          ))}
        </List>
        {stockItems.length === 0 && <Text c="dimmed">Нет ингредиентов в наличии</Text>}
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
  const recipes = useStore($recipes)
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
  // Загружаем данные при монтировании компонента
  React.useEffect(() => {
    loadData()
  }, [])

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
