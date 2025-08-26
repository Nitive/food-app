import { Card, Grid, Group, LoadingOverlay, Stack, Text, Title } from '@mantine/core'
import { useStore } from '@nanostores/react'
import { $calendarItems, $ingredients, $loading, $recipes, $shoppingList, $stockItems, $user } from '../app.js'
import { Breadcrumbs } from '../components/Breadcrumbs.js'
import { QuickActions } from '../components/QuickActions.js'
import { UserMenu } from '../components/UserMenu.js'

export function StatsPage() {
  const recipes = useStore($recipes)
  const shoppingList = useStore($shoppingList)
  const calendarItems = useStore($calendarItems)
  const ingredients = useStore($ingredients)
  const stockItems = useStore($stockItems)
  const loading = useStore($loading)
  const user = useStore($user)

  const handleLogout = () => {
    // Функция будет передана из основного компонента
  }

  // Общая статистика
  const totalStats = {
    recipes: recipes.length,
    shoppingList: shoppingList.items.length,
    calendarItems: calendarItems.length,
    ingredients: ingredients.length,
    stockItems: stockItems.length,
  }

  // Статистика калорий
  const caloriesStats = {
    totalCalendar: calendarItems.reduce((sum: number, item: any) => sum + item.recipe.calories, 0),
    avgRecipe:
      recipes.length > 0 ? recipes.reduce((sum: number, recipe: any) => sum + recipe.calories, 0) / recipes.length : 0,
  }

  // Статистика ингредиентов
  const ingredientsStats = {
    totalUnique: new Set(recipes.flatMap((recipe: any) => recipe.ingredients.map((ing: any) => ing.name))).size,
    lowStock: stockItems.filter((item: any) => item.amount < 10).length,
    totalStock: stockItems.reduce((sum: number, item: any) => sum + item.amount, 0),
  }

  // Популярные рецепты
  const popularRecipes = recipes
    .map((recipe: any) => ({
      ...recipe,
      inCalendarCount: calendarItems.filter((item: any) => item.recipeId === recipe.id).length,
    }))
    .sort((a: any, b: any) => b.inCalendarCount - a.inCalendarCount)
    .slice(0, 5)

  return (
    <Stack gap="lg" pos="relative">
      <LoadingOverlay visible={loading} />

      {/* Заголовок и навигация */}
      <Group justify="space-between" align="center">
        <div>
          <Title>Статистика и аналитика</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Обзор вашей активности и данных
          </Text>
        </div>
        <Group gap="xs">
          <QuickActions />
          {user && <UserMenu user={user} onLogout={handleLogout} />}
        </Group>
      </Group>

      <Breadcrumbs />

      {/* Основная статистика */}
      <Grid>
        <Grid.Col span={3}>
          <Card withBorder p="md" style={{ textAlign: 'center' }}>
            <Text size="xl" fw={700} c="teal">
              {totalStats.recipes}
            </Text>
            <Text size="sm" c="dimmed">
              Всего рецептов
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder p="md" style={{ textAlign: 'center' }}></Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder p="md" style={{ textAlign: 'center' }}>
            <Text size="xl" fw={700} c="amber">
              {totalStats.shoppingList}
            </Text>
            <Text size="sm" c="dimmed">
              В списке покупок
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder p="md" style={{ textAlign: 'center' }}>
            <Text size="xl" fw={700} c="indigo">
              {totalStats.calendarItems}
            </Text>
            <Text size="sm" c="dimmed">
              В календаре
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Статистика калорий */}
      <Card withBorder p="md">
        <Title order={3} mb="md">
          📊 Статистика калорий
        </Title>
        <Grid>
          <Grid.Col span={4}>
            <Card withBorder p="sm" style={{ textAlign: 'center' }}>
              <Text size="lg" fw={600} c="indigo">
                {caloriesStats.totalCalendar.toFixed(0)}
              </Text>
              <Text size="sm" c="dimmed">
                Калорий в календаре
              </Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={4}>
            <Card withBorder p="sm" style={{ textAlign: 'center' }}>
              <Text size="lg" fw={600} c="sage">
                {caloriesStats.avgRecipe.toFixed(0)}
              </Text>
              <Text size="sm" c="dimmed">
                Средние калории рецепта
              </Text>
            </Card>
          </Grid.Col>
        </Grid>
      </Card>

      {/* Статистика ингредиентов */}
      <Card withBorder p="md">
        <Title order={3} mb="md">
          📦 Статистика ингредиентов
        </Title>
        <Grid>
          <Grid.Col span={4}>
            <Card withBorder p="sm" style={{ textAlign: 'center' }}>
              <Text size="lg" fw={600} c="teal">
                {ingredientsStats.totalUnique}
              </Text>
              <Text size="sm" c="dimmed">
                Уникальных ингредиентов
              </Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={4}>
            <Card withBorder p="sm" style={{ textAlign: 'center' }}>
              <Text size="lg" fw={600} c="rose">
                {ingredientsStats.lowStock}
              </Text>
              <Text size="sm" c="dimmed">
                Заканчиваются
              </Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={4}>
            <Card withBorder p="sm" style={{ textAlign: 'center' }}>
              <Text size="lg" fw={600} c="sage">
                {ingredientsStats.totalStock}
              </Text>
              <Text size="sm" c="dimmed">
                Общее количество
              </Text>
            </Card>
          </Grid.Col>
        </Grid>
      </Card>

      {/* Популярные рецепты */}
      <Card withBorder p="md">
        <Title order={3} mb="md">
          🏆 Популярные рецепты
        </Title>
        {popularRecipes.length > 0 ? (
          <Stack gap="sm">
            {popularRecipes.map((recipe: any, index: number) => (
              <Group
                key={recipe.id}
                justify="space-between"
                p="sm"
                style={{
                  backgroundColor: 'var(--mantine-color-gray-0)',
                  borderRadius: '8px',
                }}
              >
                <Group gap="sm">
                  <Text fw={600} size="lg" c="teal">
                    #{index + 1}
                  </Text>
                  <div>
                    <Text fw={500}>{recipe.name}</Text>
                    <Text size="sm" c="dimmed">
                      {recipe.calories} ккал
                    </Text>
                  </div>
                </Group>
                <Text size="sm" c="indigo">
                  📅 {recipe.inCalendarCount}
                </Text>
              </Group>
            ))}
          </Stack>
        ) : (
          <Text c="dimmed" ta="center" py="xl">
            Нет данных для отображения популярных рецептов
          </Text>
        )}
      </Card>

      {/* Дополнительная информация */}
      <Card withBorder p="md" style={{ backgroundColor: 'var(--mantine-color-teal-0)' }}>
        <Group gap="md" align="flex-start">
          <div style={{ fontSize: '24px' }}>💡</div>
          <div style={{ flex: 1 }}>
            <Text fw={500} mb="xs">
              Информация о статистике:
            </Text>
            <Text size="sm" c="dimmed">
              • Статистика обновляется в реальном времени
              <br />
              • Популярность рецептов рассчитывается по использованию в календаре
              <br />
              • Ингредиенты с количеством менее 10 считаются заканчивающимися
              <br />• Уникальные ингредиенты - это все разные ингредиенты во всех рецептах
            </Text>
          </div>
        </Group>
      </Card>
    </Stack>
  )
}
