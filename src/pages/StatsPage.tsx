import { 
  Badge, 
  Card, 
  Grid, 
  Group, 
  LoadingOverlay, 
  Progress, 
  Stack, 
  Text, 
  Title,
  Button,
  Divider,
  List,
  RingProgress,
  Box,
  Select
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useStore } from '@nanostores/react'
import React from 'react'
import {
  $calendarItems,
  $ingredients,
  $loading,
  $recipes,
  $shoppingList,
  $stockItems,
  $user,
  openProfileModal,
} from '../app.js'
import { Breadcrumbs } from '../components/Breadcrumbs.js'
import { QuickActions } from '../components/QuickActions.js'
import { UserMenu } from '../components/UserMenu.js'

// Функция для расчета рекомендуемых калорий
const getRecommendedCalories = (user: any) => {
  if (!user || !user.age || !user.weight || !user.height || !user.gender || !user.activityLevel) {
    return null
  }

  // Формула Миффлина-Сан Жеора для расчета BMR
  let bmr = 0
  if (user.gender === 'male') {
    bmr = 88.362 + 13.397 * user.weight + 4.799 * user.height - 5.677 * user.age
  } else {
    bmr = 447.593 + 9.247 * user.weight + 3.098 * user.height - 4.33 * user.age
  }

  // Множители активности
  const activityMultipliers = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extremely_active: 1.9,
  }

  const tdee = bmr * (activityMultipliers[user.activityLevel as keyof typeof activityMultipliers] || 1.2)

  // Корректировка по цели
  let recommended = tdee
  if (user.goal === 'lose_weight') {
    recommended = tdee - 500 // Дефицит 500 калорий для похудения
  } else if (user.goal === 'gain_weight') {
    recommended = tdee + 300 // Профицит 300 калорий для набора веса
  }

  return Math.round(recommended)
}

// Функция для определения категории рецепта
const getRecipeCategory = (recipe: any): string => {
  const name = recipe.name.toLowerCase()
  const calories = recipe.calories

  if (calories < 300) return 'low_calorie'
  if (calories < 600) return 'medium_calorie'
  return 'high_calorie'
}

  // Функция для получения статистики по дням недели
  const getWeeklyStats = (calendarItems: any[]) => {
    const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    const stats = daysOfWeek.map(() => ({ count: 0, calories: 0 }))

    calendarItems.forEach(item => {
      const date = new Date(item.date)
      const dayIndex = (date.getDay() + 6) % 7 // Понедельник = 0
      if (stats[dayIndex]) {
        stats[dayIndex].count++
        stats[dayIndex].calories += item.recipe.calories
      }
    })

    return { days: daysOfWeek, stats }
  }

export function StatsPage() {
  const recipes = useStore($recipes)
  const shoppingList = useStore($shoppingList)
  const calendarItems = useStore($calendarItems)
  const ingredients = useStore($ingredients)
  const stockItems = useStore($stockItems)
  const loading = useStore($loading)
  const user = useStore($user)

  // Состояние для фильтров
  const [timeRange, setTimeRange] = React.useState<'week' | 'month' | 'all'>('week')
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(new Date())

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

  // Персональная статистика
  const recommendedCalories = getRecommendedCalories(user)
  const personalStats = {
    recommendedCalories,
    currentCalories: caloriesStats.totalCalendar,
    progress: recommendedCalories ? (caloriesStats.totalCalendar / recommendedCalories) * 100 : 0,
    bmi: user?.weight && user?.height ? (user.weight / Math.pow(user.height / 100, 2)).toFixed(1) : null,
    weightStatus: user?.weight && user?.targetWeight ? {
      current: user.weight,
      target: user.targetWeight,
      difference: user.weight - user.targetWeight,
      progress: user.targetWeight > user.weight ? 
        ((user.weight - 50) / (user.targetWeight - 50)) * 100 : 
        ((100 - user.weight) / (100 - user.targetWeight)) * 100
    } : null
  }

  // Статистика по категориям
  const categoryStats = recipes.reduce((acc: any, recipe: any) => {
    const category = getRecipeCategory(recipe)
    if (!acc[category]) {
      acc[category] = { count: 0, totalCalories: 0, avgCalories: 0 }
    }
    acc[category].count++
    acc[category].totalCalories += recipe.calories
    acc[category].avgCalories = acc[category].totalCalories / acc[category].count
    return acc
  }, {})

  // Статистика по типам приемов пищи
  const mealTypeStats = calendarItems.reduce((acc: any, item: any) => {
    if (!acc[item.mealType]) {
      acc[item.mealType] = { count: 0, totalCalories: 0 }
    }
    acc[item.mealType].count++
    acc[item.mealType].totalCalories += item.recipe.calories
    return acc
  }, {})

  // Недельная статистика
  const weeklyStats = getWeeklyStats(calendarItems)

  // Рекомендации
  const getRecommendations = () => {
    const recommendations = []
    
    if (personalStats.progress > 120) {
      recommendations.push('⚠️ Вы превышаете рекомендуемую норму калорий. Рассмотрите более легкие рецепты.')
    } else if (personalStats.progress < 80) {
      recommendations.push('💡 Вы потребляете меньше калорий, чем рекомендуется. Добавьте больше питательных блюд.')
    }

    if (ingredientsStats.lowStock > 5) {
      recommendations.push('🛒 У вас много заканчивающихся ингредиентов. Обновите список покупок.')
    }

    if (popularRecipes.length > 0 && popularRecipes[0].inCalendarCount > 10) {
      recommendations.push('🍽️ Попробуйте разнообразить рацион - у вас есть любимые рецепты, которые используются очень часто.')
    }

    if (recipes.length < 10) {
      recommendations.push('📝 Добавьте больше рецептов для разнообразия рациона.')
    }

    return recommendations
  }

  const recommendations = getRecommendations()

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
          <QuickActions showExport={true} exportLabel="Экспорт статистики" />
          {user && <UserMenu user={user} onLogout={handleLogout} onOpenProfile={openProfileModal} />}
        </Group>
      </Group>

      <Breadcrumbs />

      {/* Фильтры */}
      <Card withBorder p="md">
        <Group gap="md" align="flex-end">
          <Select
            label="Период"
            value={timeRange}
            onChange={(value) => setTimeRange(value as any)}
            data={[
              { value: 'week', label: 'Неделя' },
              { value: 'month', label: 'Месяц' },
              { value: 'all', label: 'Все время' },
            ]}
            w={150}
          />
          <DateInput
            label="Дата"
            value={selectedDate}
            onChange={(value) => setSelectedDate(value ? new Date(value) : null)}
            placeholder="Выберите дату"
            clearable
            w={200}
          />
        </Group>
      </Card>

      {/* Персональная статистика */}
      {user && (user.weight || user.height || user.dailyCalories) && (
        <Card withBorder p="md" style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}>
          <Title order={3} mb="md">
            👤 Персональная статистика
          </Title>
          <Grid>
            {personalStats.recommendedCalories && (
              <Grid.Col span={4}>
                <Card withBorder p="sm" style={{ textAlign: 'center' }}>
                  <Text size="lg" fw={600} c="indigo">
                    {personalStats.currentCalories.toFixed(0)} / {personalStats.recommendedCalories}
                  </Text>
                  <Text size="sm" c="dimmed" mb="xs">
                    Калории (текущие / рекомендуемые)
                  </Text>
                  <Progress 
                    value={Math.min(personalStats.progress, 100)} 
                    color={personalStats.progress > 100 ? 'red' : 'green'}
                    size="sm"
                  />
                </Card>
              </Grid.Col>
            )}
            {personalStats.bmi && (
              <Grid.Col span={4}>
                <Card withBorder p="sm" style={{ textAlign: 'center' }}>
                  <Text size="lg" fw={600} c="teal">
                    {personalStats.bmi}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Индекс массы тела (ИМТ)
                  </Text>
                </Card>
              </Grid.Col>
            )}
            {personalStats.weightStatus && (
              <Grid.Col span={4}>
                <Card withBorder p="sm" style={{ textAlign: 'center' }}>
                  <Text size="lg" fw={600} c="sage">
                    {personalStats.weightStatus.current} кг
                  </Text>
                  <Text size="sm" c="dimmed">
                    Текущий вес (цель: {personalStats.weightStatus.target} кг)
                  </Text>
                </Card>
              </Grid.Col>
            )}
          </Grid>
        </Card>
      )}

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
          <Card withBorder p="md" style={{ textAlign: 'center' }}>
            <Text size="xl" fw={700} c="sage">
              {totalStats.ingredients}
            </Text>
            <Text size="sm" c="dimmed">
              Всего ингредиентов
            </Text>
          </Card>
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

      {/* Статистика по категориям калорийности */}
      <Card withBorder p="md">
        <Title order={3} mb="md">
          📊 Статистика по калорийности
        </Title>
        <Grid>
          <Grid.Col span={4}>
            <Card withBorder p="sm" style={{ textAlign: 'center' }}>
              <RingProgress
                size={80}
                thickness={8}
                sections={[
                  { value: (categoryStats.low_calorie?.count || 0) / recipes.length * 100, color: 'green' }
                ]}
                label={
                  <Text size="xs" ta="center">
                    {categoryStats.low_calorie?.count || 0}
                  </Text>
                }
              />
              <Text size="sm" fw={500} mt="xs">
                Низкокалорийные
              </Text>
              <Text size="xs" c="dimmed">
                &lt; 300 ккал
              </Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={4}>
            <Card withBorder p="sm" style={{ textAlign: 'center' }}>
              <RingProgress
                size={80}
                thickness={8}
                sections={[
                  { value: (categoryStats.medium_calorie?.count || 0) / recipes.length * 100, color: 'yellow' }
                ]}
                label={
                  <Text size="xs" ta="center">
                    {categoryStats.medium_calorie?.count || 0}
                  </Text>
                }
              />
              <Text size="sm" fw={500} mt="xs">
                Среднекалорийные
              </Text>
              <Text size="xs" c="dimmed">
                300-600 ккал
              </Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={4}>
            <Card withBorder p="sm" style={{ textAlign: 'center' }}>
              <RingProgress
                size={80}
                thickness={8}
                sections={[
                  { value: (categoryStats.high_calorie?.count || 0) / recipes.length * 100, color: 'red' }
                ]}
                label={
                  <Text size="xs" ta="center">
                    {categoryStats.high_calorie?.count || 0}
                  </Text>
                }
              />
              <Text size="sm" fw={500} mt="xs">
                Высококалорийные
              </Text>
              <Text size="xs" c="dimmed">
                &gt; 600 ккал
              </Text>
            </Card>
          </Grid.Col>
        </Grid>
      </Card>

      {/* Статистика по типам приемов пищи */}
      <Card withBorder p="md">
        <Title order={3} mb="md">
          🍽️ Статистика по приемам пищи
        </Title>
        <Grid>
          {Object.entries(mealTypeStats).map(([mealType, stats]: [string, any]) => (
            <Grid.Col key={mealType} span={3}>
              <Card withBorder p="sm" style={{ textAlign: 'center' }}>
                <Text size="lg" fw={600} c="indigo">
                  {stats.count}
                </Text>
                <Text size="sm" c="dimmed">
                  {mealType === 'breakfast' ? 'Завтраки' :
                   mealType === 'lunch' ? 'Обеды' :
                   mealType === 'dinner' ? 'Ужины' : 'Перекусы'}
                </Text>
                <Text size="xs" c="dimmed">
                  {stats.totalCalories.toFixed(0)} ккал
                </Text>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      </Card>

      {/* Недельная активность */}
      <Card withBorder p="md">
        <Title order={3} mb="md">
          📅 Недельная активность
        </Title>
        <Grid>
          {weeklyStats.days.map((day, index) => (
            <Grid.Col key={day} span={1}>
              <Card withBorder p="sm" style={{ textAlign: 'center' }}>
                <Text size="sm" fw={500} c="dimmed">
                  {day}
                </Text>
                <Text size="lg" fw={600} c="teal">
                  {weeklyStats.stats[index]?.count || 0}
                </Text>
                <Text size="xs" c="dimmed">
                  {(weeklyStats.stats[index]?.calories || 0).toFixed(0)} ккал
                </Text>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      </Card>

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
          <Grid.Col span={4}>
            <Card withBorder p="sm" style={{ textAlign: 'center' }}>
              <Text size="lg" fw={600} c="amber">
                {caloriesStats.totalCalendar / Math.max(calendarItems.length, 1)}
              </Text>
              <Text size="sm" c="dimmed">
                Средние калории в день
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
                  <Badge size="lg" variant="light" color="teal">
                    #{index + 1}
                  </Badge>
                  <div>
                    <Text fw={500}>{recipe.name}</Text>
                    <Text size="sm" c="dimmed">
                      {recipe.calories} ккал • {recipe.proteins}г белков
                    </Text>
                  </div>
                </Group>
                <Group gap="xs">
                  <Badge color="indigo" variant="light">
                    📅 {recipe.inCalendarCount}
                  </Badge>
                  <Badge color="gray" variant="light">
                    {((recipe.inCalendarCount / Math.max(calendarItems.length, 1)) * 100).toFixed(1)}%
                  </Badge>
                </Group>
              </Group>
            ))}
          </Stack>
        ) : (
          <Text c="dimmed" ta="center" py="xl">
            Нет данных для отображения популярных рецептов
          </Text>
        )}
      </Card>

      {/* Рекомендации */}
      {recommendations.length > 0 && (
        <Card withBorder p="md" style={{ backgroundColor: 'var(--mantine-color-green-0)' }}>
          <Title order={3} mb="md">
            💡 Рекомендации
          </Title>
          <List spacing="sm">
            {recommendations.map((recommendation, index) => (
              <List.Item key={index}>
                <Text size="sm">{recommendation}</Text>
              </List.Item>
            ))}
          </List>
        </Card>
      )}

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
              <br />
              • Уникальные ингредиенты - это все разные ингредиенты во всех рецептах
              <br />
              • Персональная статистика доступна при заполненном профиле
            </Text>
          </div>
        </Group>
      </Card>
    </Stack>
  )
}
