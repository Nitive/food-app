import React from 'react'
import {
  Container,
  Title,
  Card,
  Text,
  Badge,
  Group,
  Stack,
  Button,
  TextInput,
  Select,
  NumberInput,
  Grid,
  ActionIcon,
  Tooltip,
  Box,
  Divider,
  Flex,
  Modal,
  Textarea,
  List,
  ThemeIcon,
} from '@mantine/core'
import { IconSearch, IconFilter, IconSortAZ, IconSortZA, IconEye, IconPlus, IconEdit, IconTrash } from '@tabler/icons-react'
import { apiClient, type Recipe } from '../api-client.js'
import { atom } from 'nanostores'
import { useStore } from '@nanostores/react'
import { $calendarItems, addToCalendar, $user } from '../app.js'
import { EditRecipeForm } from '../components/EditRecipeForm.js'

// Атомы для состояния
const $publicRecipes = atom<Recipe[]>([])
const $filteredRecipes = atom<Recipe[]>([])
const $loading = atom(false)
const $searchQuery = atom('')
const $selectedCategory = atom<string | null>(null)
const $minCalories = atom<number | null>(null)
const $maxCalories = atom<number | null>(null)
const $selectedDifficulty = atom<string | null>(null)
const $maxCookingTime = atom<number | null>(null)
const $sortBy = atom<'name' | 'calories' | 'cookingTime' | 'difficulty'>('name')
const $sortOrder = atom<'asc' | 'desc'>('asc')
const $selectedRecipe = atom<Recipe | null>(null)
const $showRecipeModal = atom(false)
const $showEditModal = atom(false)
const $editingRecipe = atom<Recipe | null>(null)
const $editLoading = atom(false)
const $deleteLoading = atom(false)

export function PublicRecipesPage() {
  const publicRecipes = useStore($publicRecipes)
  const filteredRecipes = useStore($filteredRecipes)
  const loading = useStore($loading)
  const searchQuery = useStore($searchQuery)
  const selectedCategory = useStore($selectedCategory)
  const minCalories = useStore($minCalories)
  const maxCalories = useStore($maxCalories)
  const selectedDifficulty = useStore($selectedDifficulty)
  const maxCookingTime = useStore($maxCookingTime)
  const sortBy = useStore($sortBy)
  const sortOrder = useStore($sortOrder)
  const selectedRecipe = useStore($selectedRecipe)
  const showRecipeModal = useStore($showRecipeModal)
  const showEditModal = useStore($showEditModal)
  const editingRecipe = useStore($editingRecipe)
  const editLoading = useStore($editLoading)
  const deleteLoading = useStore($deleteLoading)
  const user = useStore($user)

  // Загрузка рецептов
  const loadPublicRecipes = React.useCallback(async () => {
    $loading.set(true)
    try {
      const params: any = {}
      
      if (searchQuery) params.search = searchQuery
      if (selectedCategory) params.category = selectedCategory
      if (minCalories) params.minCalories = minCalories
      if (maxCalories) params.maxCalories = maxCalories
      if (selectedDifficulty) params.difficulty = selectedDifficulty
      if (maxCookingTime) params.maxCookingTime = maxCookingTime
      if (sortBy) params.sortBy = sortBy
      if (sortOrder) params.sortOrder = sortOrder

      const recipes = await apiClient.getPublicRecipes(params)
      $publicRecipes.set(recipes)
      $filteredRecipes.set(recipes)
    } catch (error) {
      console.error('Ошибка загрузки рецептов:', error)
    } finally {
      $loading.set(false)
    }
  }, [searchQuery, selectedCategory, minCalories, maxCalories, selectedDifficulty, maxCookingTime, sortBy, sortOrder])

  // Загрузка при монтировании
  React.useEffect(() => {
    loadPublicRecipes()
  }, [loadPublicRecipes])

  // Обработчики фильтров
  const handleSearchChange = (value: string) => {
    $searchQuery.set(value)
  }

  const handleCategoryChange = (value: string | null) => {
    $selectedCategory.set(value)
  }

  const handleDifficultyChange = (value: string | null) => {
    $selectedDifficulty.set(value)
  }

  const handleSortChange = (value: string | null) => {
    if (value) {
      const [field, order] = value.split('-')
      $sortBy.set(field as any)
      $sortOrder.set(order as any)
    }
  }

  const clearFilters = () => {
    $searchQuery.set('')
    $selectedCategory.set(null)
    $minCalories.set(null)
    $maxCalories.set(null)
    $selectedDifficulty.set(null)
    $maxCookingTime.set(null)
    $sortBy.set('name')
    $sortOrder.set('asc')
  }

  // Проверка прав доступа для редактирования
  const canEditPublicRecipes = user?.email === 'elizasmi20@gmail.com'

  // Обработчики редактирования
  const openEditModal = (recipe: Recipe) => {
    $editingRecipe.set(recipe)
    $showEditModal.set(true)
  }

  const closeEditModal = () => {
    $editingRecipe.set(null)
    $showEditModal.set(false)
  }

  const handleEditRecipe = async (recipeData: any) => {
    if (!editingRecipe) return

    $editLoading.set(true)
    try {
      await apiClient.updatePublicRecipe(editingRecipe.id, recipeData)
      closeEditModal()
      loadPublicRecipes() // Перезагружаем список
    } catch (error) {
      console.error('Ошибка редактирования рецепта:', error)
    } finally {
      $editLoading.set(false)
    }
  }

  const handleDeleteRecipe = async (recipe: Recipe) => {
    if (!confirm(`Вы уверены, что хотите удалить рецепт "${recipe.name}"?`)) {
      return
    }

    $deleteLoading.set(true)
    try {
      await apiClient.deletePublicRecipe(recipe.id)
      loadPublicRecipes() // Перезагружаем список
    } catch (error) {
      console.error('Ошибка удаления рецепта:', error)
    } finally {
      $deleteLoading.set(false)
    }
  }

  const openRecipeModal = (recipe: Recipe) => {
    $selectedRecipe.set(recipe)
    $showRecipeModal.set(true)
  }

  const closeRecipeModal = () => {
    $selectedRecipe.set(null)
    $showRecipeModal.set(false)
  }

  const addToCalendarHandler = async (recipe: Recipe) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      if (today) {
        await addToCalendar(today, recipe.id, 'lunch')
      }
      closeRecipeModal()
    } catch (error) {
      console.error('Ошибка добавления в календарь:', error)
    }
  }



  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty?.toLowerCase()) {
      case 'легко':
        return 'green'
      case 'средне':
        return 'yellow'
      case 'сложно':
        return 'red'
      default:
        return 'gray'
    }
  }

  const getCategoryColor = (calories: number) => {
    if (calories < 300) return 'green'
    if (calories <= 600) return 'yellow'
    return 'red'
  }

  const getCategoryLabel = (calories: number) => {
    if (calories < 300) return 'Низкая калорийность'
    if (calories <= 600) return 'Средняя калорийность'
    return 'Высокая калорийность'
  }

  return (
    <Container size="xl" py="md">
      <Title order={1} mb="lg">
        🍽️ Все рецепты
      </Title>

      {/* Фильтры */}
      <Card mb="lg" withBorder>
        <Title order={3} mb="md">
          <IconFilter size={20} style={{ marginRight: 8 }} />
          Фильтры и поиск
        </Title>
        
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              placeholder="Поиск по названию..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              leftSection={<IconSearch size={16} />}
              mb="sm"
            />
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Select
              placeholder="Категория по калорийности"
              value={selectedCategory}
              onChange={handleCategoryChange}
              data={[
                { value: 'low', label: 'Низкая калорийность (< 300 ккал)' },
                { value: 'medium', label: 'Средняя калорийность (300-600 ккал)' },
                { value: 'high', label: 'Высокая калорийность (> 600 ккал)' },
              ]}
              mb="sm"
            />
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 3 }}>
            <NumberInput
              placeholder="Мин. калории"
              value={minCalories || ''}
              onChange={(value) => $minCalories.set(value as number | null)}
              min={0}
              mb="sm"
            />
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 3 }}>
            <NumberInput
              placeholder="Макс. калории"
              value={maxCalories || ''}
              onChange={(value) => $maxCalories.set(value as number | null)}
              min={0}
              mb="sm"
            />
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Select
              placeholder="Сложность"
              value={selectedDifficulty}
              onChange={handleDifficultyChange}
              data={[
                { value: 'легко', label: 'Легко' },
                { value: 'средне', label: 'Средне' },
                { value: 'сложно', label: 'Сложно' },
              ]}
              mb="sm"
            />
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 3 }}>
            <NumberInput
              placeholder="Макс. время (мин)"
              value={maxCookingTime || ''}
              onChange={(value) => $maxCookingTime.set(value as number | null)}
              min={0}
              mb="sm"
            />
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Select
              placeholder="Сортировка"
              value={`${sortBy}-${sortOrder}`}
              onChange={handleSortChange}
              data={[
                { value: 'name-asc', label: 'По названию (А-Я)' },
                { value: 'name-desc', label: 'По названию (Я-А)' },
                { value: 'calories-asc', label: 'По калориям (по возрастанию)' },
                { value: 'calories-desc', label: 'По калориям (по убыванию)' },
                { value: 'cookingTime-asc', label: 'По времени (быстрые)' },
                { value: 'cookingTime-desc', label: 'По времени (медленные)' },
                { value: 'difficulty-asc', label: 'По сложности' },
              ]}
              mb="sm"
            />
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Button
              variant="outline"
              onClick={clearFilters}
              fullWidth
              mb="sm"
            >
              Очистить фильтры
            </Button>
          </Grid.Col>
        </Grid>
      </Card>

      {/* Результаты */}
      <Group justify="space-between" mb="md">
        <Text size="lg" fw={500}>
          Найдено рецептов: {filteredRecipes.length}
        </Text>
        <Button
          variant="light"
          onClick={loadPublicRecipes}
          loading={loading}
        >
          Обновить
        </Button>
      </Group>

      {/* Список рецептов */}
      <Grid>
        {filteredRecipes.map((recipe: Recipe) => (
          <Grid.Col key={recipe.id} span={{ base: 12, md: 6, lg: 4 }}>
            <Card withBorder shadow="sm">
              <Card.Section p="md">
                <Group justify="space-between" align="flex-start">
                  <Title order={4} lineClamp={2}>
                    {recipe.name}
                  </Title>
                  <Group gap="xs">
                    <Tooltip label="Просмотреть рецепт">
                      <ActionIcon
                        variant="light"
                        onClick={() => openRecipeModal(recipe)}
                      >
                        <IconEye size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Добавить в календарь">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => addToCalendarHandler(recipe)}
                      >
                        <IconPlus size={16} />
                      </ActionIcon>
                    </Tooltip>

                    {canEditPublicRecipes && (
                      <>
                        <Tooltip label="Редактировать рецепт">
                          <ActionIcon
                            variant="light"
                            color="yellow"
                            onClick={() => openEditModal(recipe)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Удалить рецепт">
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => handleDeleteRecipe(recipe)}
                            loading={deleteLoading}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </>
                    )}
                  </Group>
                </Group>
              </Card.Section>

              <Card.Section p="md" pt={0}>
                <Stack gap="xs">
                  <Group gap="xs">
                    <Badge color={getCategoryColor(recipe.calories)}>
                      {recipe.calories} ккал
                    </Badge>
                    <Badge color={getDifficultyColor(recipe.difficulty || null)}>
                      {recipe.difficulty || 'Не указано'}
                    </Badge>
                    {recipe.cookingTime && (
                      <Badge color="blue">
                        {recipe.cookingTime} мин
                      </Badge>
                    )}
                  </Group>

                  {/* Информация об авторе */}
                  {recipe.author && (
                    <Text size="xs" c="dimmed">
                      👤 Автор: {recipe.author.name || recipe.author.email}
                    </Text>
                  )}

                  <Group gap="xs">
                    <Text size="sm" c="dimmed">
                      Б: {recipe.proteins}g
                    </Text>
                    <Text size="sm" c="dimmed">
                      Ж: {recipe.fats}g
                    </Text>
                    <Text size="sm" c="dimmed">
                      У: {recipe.carbohydrates}g
                    </Text>
                  </Group>

                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {recipe.instructions || 'Описание отсутствует'}
                  </Text>
                </Stack>
              </Card.Section>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      {/* Модальное окно с деталями рецепта */}
      <Modal
        opened={showRecipeModal}
        onClose={closeRecipeModal}
        title={selectedRecipe?.name}
        size="lg"
      >
        {selectedRecipe && (
          <Stack gap="md">
            <Group>
              <Badge color={getCategoryColor(selectedRecipe.calories)}>
                {selectedRecipe.calories} ккал
              </Badge>
                             <Badge color={getDifficultyColor(selectedRecipe.difficulty || null)}>
                {selectedRecipe.difficulty || 'Не указано'}
              </Badge>
              {selectedRecipe.cookingTime && (
                <Badge color="blue">
                  {selectedRecipe.cookingTime} мин
                </Badge>
              )}
            </Group>

            <Box>
              <Title order={5} mb="sm">Пищевая ценность:</Title>
              <Group>
                <Text>Белки: {selectedRecipe.proteins}g</Text>
                <Text>Жиры: {selectedRecipe.fats}g</Text>
                <Text>Углеводы: {selectedRecipe.carbohydrates}g</Text>
              </Group>
            </Box>

            {selectedRecipe.instructions && (
              <Box>
                <Title order={5} mb="sm">Инструкция:</Title>
                <Text>{selectedRecipe.instructions}</Text>
              </Box>
            )}

            <Box>
              <Title order={5} mb="sm">Ингредиенты:</Title>
              <List>
                {selectedRecipe.ingredients.map((ingredient: any, index: number) => (
                  <List.Item key={index}>
                    {ingredient.name} - {ingredient.amount} {ingredient.amountType}
                  </List.Item>
                ))}
              </List>
            </Box>

            {/* Информация об авторе */}
            {selectedRecipe.author && (
              <Box>
                <Title order={5} mb="sm">Автор:</Title>
                <Text>
                  {selectedRecipe.author.name || selectedRecipe.author.email}
                </Text>
              </Box>
            )}

            <Divider />

            <Group justify="center">
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => addToCalendarHandler(selectedRecipe)}
              >
                Добавить в календарь
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Модальное окно для редактирования рецепта */}
      <Modal
        opened={showEditModal}
        onClose={closeEditModal}
        title={`Редактировать рецепт: ${editingRecipe?.name}`}
        size="lg"
      >
        {editingRecipe && (
          <EditRecipeForm
            opened={showEditModal}
            onClose={closeEditModal}
            recipe={editingRecipe}
            onSave={handleEditRecipe}
          />
        )}
      </Modal>
    </Container>
  )
}
