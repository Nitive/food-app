import '@mantine/core/styles.css'

import {
  ActionIcon,
  Button,
  Divider,
  Group,
  List,
  LoadingOverlay,
  MantineProvider,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useStore } from '@nanostores/react'
import { CheckCircleFillIcon, DashIcon, PlusIcon, TrashIcon, XCircleFillIcon } from '@primer/octicons-react'
import { atom } from 'nanostores'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router'
import { sumBy } from 'remeda'
import {
  apiClient,
  type CartItem,
  type Ingredient,
  type Recipe,
  type ShoppingListItem,
  type StockItem,
} from './api-client.js'

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

// Состояние модального окна создания рецепта
const $createRecipeModal = atom(false)

// Состояние модального окна создания ингредиента
const $createIngredientModal = atom(false)

// Загрузка данных
async function loadData() {
  $loading.set(true)
  try {
    const [recipes, cartItems, ingredients, stockItems, shoppingList] = await Promise.all([
      apiClient.getRecipes(),
      apiClient.getCart(),
      apiClient.getIngredients(),
      apiClient.getStock(),
      apiClient.getShoppingList(),
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

async function clearAllData() {
  try {
    await apiClient.clearCart()
    await loadData() // Перезагружаем данные
  } catch (error) {
    console.error('Ошибка очистки данных:', error)
  }
}

// Функция создания рецепта
async function createRecipe(recipeData: {
  name: string
  calories: number
  proteins: number
  fats: number
  carbohydrates: number
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

function getIngredientStock(ingredientName: string): number {
  const stockItem = $stockItems.get().find((item) => item.ingredient.name === ingredientName)
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
        <Group gap="xs">
          <Button
            variant="light"
            color="green"
            leftSection={<PlusIcon size={16} />}
            onClick={() => $createRecipeModal.set(true)}
          >
            Создать рецепт
          </Button>
          <Button component={Link} to="/ingredients" variant="light">
            Управление ингредиентами
          </Button>
        </Group>
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
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                      >
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
          <Button 
            variant="light" 
            color="green"
            leftSection={<PlusIcon size={16} />}
            onClick={() => $createIngredientModal.set(true)}
            size="sm"
          >
            Создать ингредиент
          </Button>
          <Button variant="light" color="red" onClick={clearCart} size="sm">
            Очистить все данные
          </Button>
          <Button component={Link} to="/" variant="light">
            Назад к рецептам
          </Button>
        </Group>
      </Group>

      <Text c="dimmed">
        Укажите количество имеющихся ингредиентов. Это поможет составить точный список покупок. Все данные автоматически
        сохраняются в базе данных.
      </Text>

      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Ингредиент</Table.Th>
            <Table.Th>Единица измерения</Table.Th>
            <Table.Th>Количество в наличии</Table.Th>
            <Table.Th>Действия</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {ingredients.map((ingredient) => {
            const currentStock = stockItems.find((s) => s.ingredient.id === ingredient.id)?.amount || 0

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
                <Table.Td>
                  <ActionIcon 
                    variant="light" 
                    color="red" 
                    onClick={() => deleteIngredient(ingredient.id)}
                    size="sm"
                  >
                    <TrashIcon size={16} />
                  </ActionIcon>
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

function CreateRecipeForm() {
  const [formData, setFormData] = React.useState({
    name: '',
    calories: 0,
    proteins: 0,
    fats: 0,
    carbohydrates: 0,
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
        await createIngredient({ name: newIngredientName, amountType: currentAmountType })
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

  const getFilteredIngredients = (searchValue: string, index: number) => {
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
              onChange={(value) => setFormData((prev) => ({ ...prev, carbohydrates: Number(value) || 0 }))}
              min={0}
              required
            />
          </Group>

          <Divider />

          <Group justify="space-between" align="center">
            <Title order={3}>Ингредиенты</Title>
            <Button type="button" variant="light" leftSection={<PlusIcon size={16} />} onClick={addIngredient}>
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
                data={getFilteredIngredients(ingredientSearch[index] || '', index)}
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
                <ActionIcon variant="light" color="red" onClick={() => removeIngredient(index)} mb={4}>
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
    amountType: 'гр'
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
        amountType: 'гр'
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
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />

          <Select
            label="Единица измерения"
            value={formData.amountType}
            onChange={(value) => setFormData(prev => ({ ...prev, amountType: value || 'гр' }))}
            data={['гр', 'мл', 'шт', 'по вкусу']}
            required
          />

          <Group justify="flex-end" mt="md">
            <Button 
              variant="light" 
              onClick={() => $createIngredientModal.set(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              loading={loading}
              disabled={!formData.name}
            >
              Создать ингредиент
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
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
        <CreateRecipeForm />
        <CreateIngredientForm />
      </Providers>
    </div>
  )
}

export default App
