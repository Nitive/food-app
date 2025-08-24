import '@mantine/core/styles.css'

import { Anchor, Button, Checkbox, Group, List, MantineProvider, Table, Text, Title, Stack, Badge, ActionIcon, NumberInput, Paper, Divider } from '@mantine/core'
import { useStore } from '@nanostores/react'
import { CheckCircleFillIcon, PlusIcon, DashIcon, TrashIcon } from '@primer/octicons-react'
import { atom, computed } from 'nanostores'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes, useParams } from 'react-router'
import { sumBy, unique, groupBy } from 'remeda'
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

// Состояние корзины
const $cartItems = atom<CartItem[]>([])

// Вычисляем рецепты в корзине
const $cartRecipes = computed($cartItems, (items) => 
  items.map(item => {
    const recipe = recipes.find(r => r.id === item.recipeId)
    return recipe ? { ...recipe, quantity: item.quantity } : null
  }).filter(Boolean)
)

// Вычисляем список покупок (группированные ингредиенты)
const $shoppingList = computed($cartItems, (items) => {
  const allIngredients: Array<{name: string, amount: number, amountType: string}> = []
  
  items.forEach(item => {
    const recipe = recipes.find(r => r.id === item.recipeId)
    if (recipe) {
      recipe.ingredients.forEach(ingredient => {
        allIngredients.push({
          name: ingredient.name,
          amount: ingredient.amount * item.quantity,
          amountType: ingredient.amountType
        })
      })
    }
  })
  
  // Группируем по названию ингредиента
  const grouped = groupBy(allIngredients, (item) => item.name)
  
  return Object.entries(grouped).map(([name, ingredients]) => ({
    name,
    totalAmount: sumBy(ingredients, (item) => item.amount),
    amountType: ingredients[0].amountType
  }))
})

// Функции для работы с корзиной
function addToCart(recipeId: number) {
  const currentItems = $cartItems.get()
  const existingItem = currentItems.find(item => item.recipeId === recipeId)
  
  if (existingItem) {
    $cartItems.set(currentItems.map(item => 
      item.recipeId === recipeId 
        ? { ...item, quantity: item.quantity + 1 }
        : item
    ))
  } else {
    $cartItems.set([...currentItems, { recipeId, quantity: 1 }])
  }
}

function removeFromCart(recipeId: number) {
  const currentItems = $cartItems.get()
  const existingItem = currentItems.find(item => item.recipeId === recipeId)
  
  if (existingItem && existingItem.quantity > 1) {
    $cartItems.set(currentItems.map(item => 
      item.recipeId === recipeId 
        ? { ...item, quantity: item.quantity - 1 }
        : item
    ))
  } else {
    $cartItems.set(currentItems.filter(item => item.recipeId !== recipeId))
  }
}

function updateCartQuantity(recipeId: number, quantity: number) {
  const currentItems = $cartItems.get()
  
  if (quantity <= 0) {
    $cartItems.set(currentItems.filter(item => item.recipeId !== recipeId))
  } else {
    $cartItems.set(currentItems.map(item => 
      item.recipeId === recipeId 
        ? { ...item, quantity }
        : item
    ))
  }
}

function clearCart() {
  $cartItems.set([])
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
      <Title>Рецепты</Title>
      
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
                <Anchor href={`/recipe/${recipe.id}`}>{recipe.name}</Anchor>
              </Table.Td>
              <Table.Td>{recipe.ingredients.map((i) => i.name).join(', ')}</Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon 
                    variant="light" 
                    color="blue" 
                    onClick={() => addToCart(recipe.id)}
                  >
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
                     <Anchor href={`/recipe/${recipe?.id}`}>{recipe?.name}</Anchor>
                   </Table.Td>
                   <Table.Td>
                     <Group gap="xs">
                       <ActionIcon 
                         variant="light" 
                         color="red" 
                         onClick={() => removeFromCart(recipe?.id || 0)}
                       >
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
                     <ActionIcon 
                       variant="light" 
                       color="red" 
                       onClick={() => updateCartQuantity(recipe?.id || 0, 0)}
                     >
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
                    {item.totalAmount} {item.amountType}
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

function Amount(props: { children: React.ReactNode }) {
  return (
    <Text component="span" c="gray.6" fw={500}>
      {props.children}{' '}
    </Text>
  )
}

function Recipe() {
  const icon = <CheckCircleFillIcon size={16} fill="var(--mantine-color-green-8)" />

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

      <List mt="xs" icon={icon}>
        {recipe.ingredients.map((ingredient) => (
          <List.Item key={ingredient.name}>
            {ingredient.name}{' '}
            <Amount>
              {ingredient.amount} {ingredient.amountType}
            </Amount>
          </List.Item>
        ))}
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
          <Route path="recipe/:id" element={<Recipe />} />
        </Routes>
      </Providers>
    </div>
  )
}

const root = createRoot(document.getElementById('app')!)
root.render(<App />)
