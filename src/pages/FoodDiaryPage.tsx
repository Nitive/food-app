import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  LoadingOverlay,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useStore } from '@nanostores/react'
import { PlusIcon, TrashIcon } from '@primer/octicons-react'
import React from 'react'
import { apiClient } from '../api-client.js'
import { $loading, $recipes, $user, exportFoodDiaryToPDF } from '../app.js'
import { Breadcrumbs } from '../components/Breadcrumbs.js'
import { QuickActions } from '../components/QuickActions.js'
import { UserMenu } from '../components/UserMenu.js'

// Функция для расчета рекомендуемых калорий на основе профиля пользователя
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

interface FoodEntry {
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

export function FoodDiaryPage() {
  const recipes = useStore($recipes)
  const loading = useStore($loading)
  const user = useStore($user)

  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date())
  const [foodEntries, setFoodEntries] = React.useState<FoodEntry[]>([])
  const [addEntryModalOpened, setAddEntryModalOpened] = React.useState(false)
  const [selectedRecipe, setSelectedRecipe] = React.useState<number | null>(null)
  const [selectedMealType, setSelectedMealType] = React.useState<string>('lunch')
  const [servingSize, setServingSize] = React.useState<number>(1)

  // Состояние для выбора периода экспорта
  const [exportStartDate, setExportStartDate] = React.useState<Date>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7) // По умолчанию неделя назад
    return date
  })
  const [exportEndDate, setExportEndDate] = React.useState<Date>(new Date())
  const [exportModalOpened, setExportModalOpened] = React.useState(false)

  // Загружаем записи для выбранной даты
  React.useEffect(() => {
    const loadFoodDiary = async () => {
      try {
        const dateString = selectedDate.toISOString().split('T')[0]
        const entries = await apiClient.getFoodDiary(dateString)

        // Преобразуем в локальный формат
        const localEntries: FoodEntry[] = entries.map((entry) => ({
          id: entry.id.toString(),
          recipeId: entry.recipeId,
          recipeName: entry.recipe.name,
          mealType: entry.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
          servingSize: entry.servingSize,
          calories: entry.calories,
          proteins: entry.proteins,
          fats: entry.fats,
          carbohydrates: entry.carbohydrates,
          timestamp: entry.date.toISOString(),
          date: entry.date.toISOString().split('T')[0] || '',
        }))

        setFoodEntries(localEntries)
      } catch (error) {
        console.error('Ошибка загрузки дневника питания:', error)
        setFoodEntries([])
      }
    }

    loadFoodDiary()
  }, [selectedDate])

  const handleAddEntry = async () => {
    if (!selectedRecipe || !selectedMealType) return

    try {
      const dateString = selectedDate.toISOString().split('T')[0] || ''
      const newEntry = await apiClient.addFoodDiaryEntry(
        dateString,
        selectedRecipe,
        selectedMealType || 'lunch',
        servingSize
      )

      // Преобразуем в локальный формат
      const localEntry: FoodEntry = {
        id: newEntry.id.toString(),
        recipeId: newEntry.recipeId,
        recipeName: newEntry.recipe.name,
        mealType: newEntry.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        servingSize: newEntry.servingSize,
        calories: newEntry.calories,
        proteins: newEntry.proteins,
        fats: newEntry.fats,
        carbohydrates: newEntry.carbohydrates,
        timestamp: newEntry.date.toISOString(),
        date: newEntry.date.toISOString().split('T')[0] || '',
      }

      setFoodEntries((prev) => [...prev, localEntry])
      setAddEntryModalOpened(false)
      setSelectedRecipe(null)
      setServingSize(1)
    } catch (error) {
      console.error('Ошибка добавления записи:', error)
      alert('Ошибка при добавлении записи')
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await apiClient.removeFoodDiaryEntry(parseInt(entryId))
      setFoodEntries((prev) => prev.filter((entry) => entry.id !== entryId))
    } catch (error) {
      console.error('Ошибка удаления записи:', error)
      alert('Ошибка при удалении записи')
    }
  }

  const getDailyStats = () => {
    const totalCalories = foodEntries.reduce((sum, entry) => sum + entry.calories, 0)
    const totalProteins = foodEntries.reduce((sum, entry) => sum + entry.proteins, 0)
    const totalFats = foodEntries.reduce((sum, entry) => sum + entry.fats, 0)
    const totalCarbohydrates = foodEntries.reduce((sum, entry) => sum + entry.carbohydrates, 0)

    return {
      totalCalories,
      totalProteins,
      totalFats,
      totalCarbohydrates,
      totalEntries: foodEntries.length,
    }
  }

  const getMealTypeEmoji = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return '🌅'
      case 'lunch':
        return '🍽️'
      case 'dinner':
        return '🌙'
      case 'snack':
        return '🍎'
      default:
        return '🍽️'
    }
  }

  const getMealTypeLabel = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return 'Завтрак'
      case 'lunch':
        return 'Обед'
      case 'dinner':
        return 'Ужин'
      case 'snack':
        return 'Перекус'
      default:
        return 'Прием пищи'
    }
  }

  const getMealTypeColor = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return 'orange'
      case 'lunch':
        return 'green'
      case 'dinner':
        return 'blue'
      case 'snack':
        return 'purple'
      default:
        return 'gray'
    }
  }

  const stats = getDailyStats()

  return (
    <Stack gap="lg" pos="relative">
      <LoadingOverlay visible={loading} />

      <Group justify="space-between" align="center">
        <div>
          <Title>Дневник питания</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Отслеживайте все, что вы съели за день
          </Text>
        </div>
        <Group gap="xs">
          <QuickActions
            showExport={foodEntries.length > 0}
            onExportPDF={() => setExportModalOpened(true)}
            exportLabel="Экспорт дневника"
          />

          {user && (
            <UserMenu
              user={user}
              onLogout={() => {
                // TODO: Реализовать logout
                alert('Logout в разработке')
              }}
              onOpenProfile={() => {
                alert('Профиль пользователя')
              }}
            />
          )}
        </Group>
      </Group>

      <Breadcrumbs />

      <Text c="dimmed">
        Записывайте все приемы пищи с указанием размера порции. КБЖУ рассчитывается автоматически на основе выбранных
        рецептов.
      </Text>

      <Grid>
        <Grid.Col span={9}>
          {/* Выбор даты */}
          <Card withBorder p="md" mb="md">
            <Group justify="space-between" align="center">
              <div>
                <Text fw={500} mb={4}>
                  Выбранная дата:
                </Text>
                <DateInput
                  value={selectedDate}
                  onChange={(date) => {
                    if (date && typeof date === 'object') {
                      setSelectedDate(date)
                    }
                  }}
                  placeholder="Выберите дату"
                  clearable={false}
                />
              </div>
              <Button leftSection={<PlusIcon size={16} />} onClick={() => setAddEntryModalOpened(true)} color="teal">
                Добавить прием пищи
              </Button>
            </Group>
          </Card>

          {/* Статистика дня */}
          <Card withBorder p="md" mb="md">
            <Title order={4} mb="md">
              📊 Статистика за день
            </Title>
            <Grid>
              <Grid.Col span={3}>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    Калории:
                  </Text>
                  <Badge size="lg" color="teal" variant="light">
                    {(() => {
                      const recommendedCalories = getRecommendedCalories(user)
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
              </Grid.Col>
              <Grid.Col span={3}>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    Белки:
                  </Text>
                  <Badge size="lg" color="green" variant="light">
                    {stats.totalProteins}г
                  </Badge>
                </Group>
              </Grid.Col>
              <Grid.Col span={3}>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    Жиры:
                  </Text>
                  <Badge size="lg" color="yellow" variant="light">
                    {stats.totalFats}г
                  </Badge>
                </Group>
              </Grid.Col>
              <Grid.Col span={3}>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    Углеводы:
                  </Text>
                  <Badge size="lg" color="blue" variant="light">
                    {stats.totalCarbohydrates}г
                  </Badge>
                </Group>
              </Grid.Col>
            </Grid>
          </Card>

          {/* Список записей */}
          <Card withBorder p="md">
            <Title order={4} mb="md">
              🍽️ Записи о питании
            </Title>

            {foodEntries.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                Нет записей о питании на выбранную дату. Добавьте первый прием пищи!
              </Text>
            ) : (
              <Stack gap="md">
                {foodEntries.map((entry) => (
                  <Card key={entry.id} withBorder p="md">
                    <Group justify="space-between" align="flex-start">
                      <div style={{ flex: 1 }}>
                        <Group gap="xs" mb="xs">
                          <Badge color={getMealTypeColor(entry.mealType)} variant="light" size="sm">
                            {getMealTypeEmoji(entry.mealType)} {getMealTypeLabel(entry.mealType)}
                          </Badge>
                          <Badge size="sm" color="gray" variant="light">
                            {entry.servingSize} порция
                            {entry.servingSize > 1 ? 'и' : ''}
                          </Badge>
                        </Group>

                        <Text fw={500} size="lg" mb="xs">
                          {entry.recipeName}
                        </Text>

                        <Group gap="md">
                          <Text size="sm" c="dimmed">
                            Калории: <strong>{entry.calories}</strong> ккал
                          </Text>
                          <Text size="sm" c="dimmed">
                            Белки: <strong>{entry.proteins}</strong>г
                          </Text>
                          <Text size="sm" c="dimmed">
                            Жиры: <strong>{entry.fats}</strong>г
                          </Text>
                          <Text size="sm" c="dimmed">
                            Углеводы: <strong>{entry.carbohydrates}</strong>г
                          </Text>
                        </Group>
                      </div>

                      <ActionIcon variant="light" color="red" onClick={() => handleDeleteEntry(entry.id)}>
                        <TrashIcon size={16} />
                      </ActionIcon>
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}
          </Card>
        </Grid.Col>

        <Grid.Col span={3}>
          <Stack gap="md">
            {/* Рекомендации */}
            <Card withBorder p="md">
              <Title order={5} mb="sm" c="teal">
                💡 Рекомендации
              </Title>
              <Stack gap="xs">
                <Text size="xs" c="dimmed">
                  • Записывайте все приемы пищи сразу после еды
                </Text>
                <Text size="xs" c="dimmed">
                  • Указывайте точный размер порции
                </Text>
                <Text size="xs" c="dimmed">
                  • Старайтесь не пропускать записи
                </Text>
                <Text size="xs" c="dimmed">
                  • Анализируйте статистику регулярно
                </Text>
              </Stack>
            </Card>

            {/* Быстрые действия */}
            <Card withBorder p="md">
              <Title order={5} mb="sm" c="blue">
                ⚡ Быстрые действия
              </Title>
              <Stack gap="xs">
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => {
                    setSelectedMealType('breakfast')
                    setAddEntryModalOpened(true)
                  }}
                  color="orange"
                >
                  🌅 Добавить завтрак
                </Button>
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => {
                    setSelectedMealType('lunch')
                    setAddEntryModalOpened(true)
                  }}
                  color="green"
                >
                  🍽️ Добавить обед
                </Button>
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => {
                    setSelectedMealType('dinner')
                    setAddEntryModalOpened(true)
                  }}
                  color="blue"
                >
                  🌙 Добавить ужин
                </Button>
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => {
                    setSelectedMealType('snack')
                    setAddEntryModalOpened(true)
                  }}
                  color="purple"
                >
                  🍎 Добавить перекус
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>

      {/* Модальное окно добавления записи */}
      <Modal
        opened={addEntryModalOpened}
        onClose={() => setAddEntryModalOpened(false)}
        title="Добавить прием пищи"
        size="md"
      >
        <Stack gap="md">
          <Select
            label="Тип приема пищи"
            placeholder="Выберите тип приема пищи"
            value={selectedMealType}
            onChange={(value) => value && setSelectedMealType(value)}
            data={[
              { value: 'breakfast', label: '🌅 Завтрак' },
              { value: 'lunch', label: '🍽️ Обед' },
              { value: 'dinner', label: '🌙 Ужин' },
              { value: 'snack', label: '🍎 Перекус' },
            ]}
          />

          <Select
            label="Рецепт"
            placeholder="Выберите рецепт"
            value={selectedRecipe?.toString() || ''}
            onChange={(value) => value && setSelectedRecipe(Number(value))}
            data={recipes.map((recipe) => ({
              value: recipe.id.toString(),
              label: `${recipe.name} (${recipe.calories} ккал)`,
            }))}
            searchable
          />

          <NumberInput
            label="Размер порции"
            placeholder="Введите размер порции"
            value={servingSize}
            onChange={(value) => setServingSize(typeof value === 'number' ? value : 1)}
            min={0.1}
            max={10}
            step={0.1}
            decimalScale={1}
          />

          {selectedRecipe && (
            <Card withBorder p="md">
              <Text size="sm" fw={500} mb="xs">
                Расчет КБЖУ:
              </Text>
              {(() => {
                const recipe = recipes.find((r) => r.id === selectedRecipe)
                if (!recipe) return null

                return (
                  <Group gap="md">
                    <Text size="xs" c="dimmed">
                      Калории: <strong>{recipe.calories * servingSize}</strong> ккал
                    </Text>
                    <Text size="xs" c="dimmed">
                      Белки: <strong>{recipe.proteins * servingSize}</strong>г
                    </Text>
                    <Text size="xs" c="dimmed">
                      Жиры: <strong>{recipe.fats * servingSize}</strong>г
                    </Text>
                    <Text size="xs" c="dimmed">
                      Углеводы: <strong>{recipe.carbohydrates * servingSize}</strong>г
                    </Text>
                  </Group>
                )
              })()}
            </Card>
          )}

          <Group justify="flex-end" gap="xs">
            <Button variant="light" onClick={() => setAddEntryModalOpened(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddEntry} disabled={!selectedRecipe} color="teal">
              Добавить
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Модальное окно выбора периода экспорта */}
      <Modal
        opened={exportModalOpened}
        onClose={() => setExportModalOpened(false)}
        title="Экспорт дневника питания"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Выберите период для экспорта данных из дневника питания
          </Text>

          <DateInput
            label="Начальная дата"
            placeholder="Выберите начальную дату"
            value={exportStartDate}
            onChange={(date) => {
              if (date && typeof date === 'object') {
                setExportStartDate(date)
              }
            }}
            clearable={false}
          />

          <DateInput
            label="Конечная дата"
            placeholder="Выберите конечную дату"
            value={exportEndDate}
            onChange={(date) => {
              if (date && typeof date === 'object') {
                setExportEndDate(date)
              }
            }}
            clearable={false}
          />

          {(() => {
            // Фильтруем записи по выбранному периоду
            const filteredEntries = foodEntries.filter((entry) => {
              const entryDate = new Date(entry.date)
              return entryDate >= exportStartDate && entryDate <= exportEndDate
            })

            const periodStats = filteredEntries.reduce(
              (stats, entry) => ({
                calories: stats.calories + entry.calories,
                proteins: stats.proteins + entry.proteins,
                fats: stats.fats + entry.fats,
                carbohydrates: stats.carbohydrates + entry.carbohydrates,
                count: stats.count + 1,
              }),
              { calories: 0, proteins: 0, fats: 0, carbohydrates: 0, count: 0 }
            )

            return (
              <Card withBorder p="md">
                <Text size="sm" fw={500} mb="xs">
                  Статистика за период:
                </Text>
                <Group gap="md">
                  <Text size="xs" c="dimmed">
                    Записей: <strong>{periodStats.count}</strong>
                  </Text>
                  <Text size="xs" c="dimmed">
                    Калории: <strong>{periodStats.calories.toFixed(1)}</strong> ккал
                  </Text>
                  <Text size="xs" c="dimmed">
                    Белки: <strong>{periodStats.proteins.toFixed(1)}</strong>г
                  </Text>
                  <Text size="xs" c="dimmed">
                    Жиры: <strong>{periodStats.fats.toFixed(1)}</strong>г
                  </Text>
                  <Text size="xs" c="dimmed">
                    Углеводы: <strong>{periodStats.carbohydrates.toFixed(1)}</strong>г
                  </Text>
                </Group>
              </Card>
            )
          })()}

          <Group justify="flex-end" gap="xs">
            <Button variant="light" onClick={() => setExportModalOpened(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                // Фильтруем записи по выбранному периоду
                const filteredEntries = foodEntries.filter((entry) => {
                  const entryDate = new Date(entry.date)
                  return entryDate >= exportStartDate && entryDate <= exportEndDate
                })

                // Добавляем поле date к записям для экспорта
                const entriesWithDate = filteredEntries.map((entry) => ({
                  ...entry,
                  date: new Date(entry.timestamp).toISOString().split('T')[0] || '',
                }))

                exportFoodDiaryToPDF(entriesWithDate, exportStartDate, exportEndDate)
                setExportModalOpened(false)
              }}
              color="teal"
            >
              Экспортировать в PDF
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
