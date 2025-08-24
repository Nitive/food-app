import '@mantine/core/styles.css'

import { Anchor, Checkbox, Group, List, MantineProvider, Table, Text, Title } from '@mantine/core'
import { useStore } from '@nanostores/react'
import { CheckCircleFillIcon } from '@primer/octicons-react'
import { atom, computed } from 'nanostores'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes, useParams } from 'react-router'
import { sumBy, unique } from 'remeda'
import { recipes } from './data.js'

function Providers(props: { children: React.ReactNode }) {
  return (
    <MantineProvider>
      <BrowserRouter>{props.children}</BrowserRouter>
    </MantineProvider>
  )
}

const $selectedRecipesIds = atom<number[]>([])
const $selectedRecipes = computed($selectedRecipesIds, (rs) => recipes.filter((r) => rs.includes(r.id)))

function addSelectedRecipe(id: number) {
  $selectedRecipesIds.set(unique([...$selectedRecipesIds.get(), id]))
}

function removeSelectedRecipe(id: number) {
  $selectedRecipesIds.set($selectedRecipesIds.get().filter((rid) => rid !== id))
}

function RecipesPage() {
  const selectedRecipes = useStore($selectedRecipes)

  const stats = {
    calories: sumBy(selectedRecipes, (r) => r.calories).toFixed(1),
    proteins: sumBy(selectedRecipes, (r) => r.proteins).toFixed(1),
    fats: sumBy(selectedRecipes, (r) => r.fats).toFixed(1),
    carbohydrates: sumBy(selectedRecipes, (r) => r.carbohydrates).toFixed(1),
  }

  return (
    <>
      <Title>Рецепты</Title>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Название</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {recipes.map((recipe) => (
            <Table.Tr key={recipe.id}>
              <Table.Td width={1}>
                <Checkbox
                  onClick={(e) => {
                    if (e.currentTarget.checked) {
                      addSelectedRecipe(recipe.id)
                    } else {
                      removeSelectedRecipe(recipe.id)
                    }
                  }}
                />
              </Table.Td>
              <Table.Td>
                <Anchor href={`/recipe/${recipe.id}`}>{recipe.name}</Anchor>
              </Table.Td>
              <Table.Td>{recipe.ingredients.map((i) => i.name).join(', ')}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Amount>
        КБЖУ {stats.calories}/{stats.proteins}/{stats.fats}/{stats.carbohydrates}
      </Amount>
    </>
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
