import React from 'react';
import {
  Title,
  Card,
  Text,
  Group,
  Badge,
  Stack,
  Button,
  ActionIcon,
  Box,
  Grid,
  Paper,
  Divider,
  Select,
  TextInput,
  Flex,
  Alert,
  ThemeIcon,
} from '@mantine/core';
import {
  HeartIcon,
  HeartFillIcon,
  PlusIcon,
  TrashIcon,
  CalendarIcon,
} from '@primer/octicons-react';
import { useStore } from '@nanostores/react';
import {
  $favoriteRecipes,
  $cartItems,
  $user,
  toggleFavoriteRecipe,
  openAddToCalendarModal,
  getIngredientStock,
} from '../app.js';
import { UserMenu } from '../components/UserMenu.js';
import { Breadcrumbs } from '../components/Breadcrumbs.js';
import { QuickActions } from '../components/QuickActions.js';
import { Link } from 'react-router-dom';
import type { Recipe } from '../api-client.js';

export function FavoritesPage() {
  const favoriteRecipes = useStore($favoriteRecipes);
  const cartItems = useStore($cartItems);
  const user = useStore($user);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'name' | 'calories' | 'proteins'>(
    'name'
  );

  const onCartClick = () => {
    // Перенаправляем на страницу корзины
    window.location.href = '/cart';
  };

  // Фильтрация и сортировка любимых рецептов
  const filteredAndSortedRecipes = React.useMemo(() => {
    const filtered = favoriteRecipes.filter(recipe =>
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'calories':
          return a.calories - b.calories;
        case 'proteins':
          return b.proteins - a.proteins;
        default:
          return 0;
      }
    });

    return filtered;
  }, [favoriteRecipes, searchQuery, sortBy]);

  const handleToggleFavorite = (recipe: Recipe) => {
    toggleFavoriteRecipe(recipe);
  };

  const handleAddToCalendar = (recipe: Recipe) => {
    openAddToCalendarModal(recipe);
  };

  const handleAddAllToCalendar = () => {
    filteredAndSortedRecipes.forEach(recipe => {
      openAddToCalendarModal(recipe);
    });
  };

  const getIngredientStockValue = (ingredientName: string): number => {
    return getIngredientStock(ingredientName);
  };

  if (favoriteRecipes.length === 0) {
    return (
      <div>
        {user && (
          <UserMenu
            user={user}
            onLogout={() => {}}
            cartItems={cartItems}
            onCartClick={onCartClick}
          />
        )}
        <Breadcrumbs />
        <QuickActions />

        <Box mt="xl" ta="center">
          <ThemeIcon size={80} radius="xl" color="pink" mb="lg">
            <HeartIcon size={40} />
          </ThemeIcon>
          <Title order={2} mb="md" c="dimmed">
            ❤️ Сохраненные рецепты
          </Title>
          <Text size="lg" c="dimmed" mb="md">
            У вас пока нет сохраненных рецептов
          </Text>
          <Text size="sm" c="dimmed" mb="xl" maw={400} mx="auto">
            Отмечайте рецепты сердечком на странице рецептов, чтобы они
            появились здесь
          </Text>
          <Button
            component={Link}
            to="/recipes"
            leftSection={<PlusIcon size={16} />}
            variant="filled"
            color="teal"
            size="lg"
          >
            Найти рецепты
          </Button>
        </Box>
      </div>
    );
  }

  return (
    <div>
      {user && (
        <UserMenu
          user={user}
          onLogout={() => {}}
          cartItems={cartItems}
          onCartClick={onCartClick}
        />
      )}
      <Breadcrumbs />
      <QuickActions />

      <Title order={2} mb="lg">
        ❤️ Сохраненные рецепты ({favoriteRecipes.length})
      </Title>

      {/* Панель поиска и фильтрации */}
      <Card withBorder p="md" mb="lg">
        <Flex gap="md" align="flex-end" wrap="wrap">
          <TextInput
            placeholder="Поиск по названию рецепта..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            leftSection={<span>🔍</span>}
            style={{ flex: 1, minWidth: 250 }}
          />
          <Select
            placeholder="Сортировка"
            value={sortBy}
            onChange={value => setSortBy(value as any)}
            data={[
              { value: 'name', label: 'По названию' },
              { value: 'calories', label: 'По калориям' },
              { value: 'proteins', label: 'По белкам' },
            ]}
            w={150}
          />
          {filteredAndSortedRecipes.length > 0 && (
            <Button
              leftSection={<CalendarIcon size={16} />}
              onClick={handleAddAllToCalendar}
              variant="light"
              color="teal"
            >
              Добавить все в календарь ({filteredAndSortedRecipes.length})
            </Button>
          )}
        </Flex>

        {searchQuery && (
          <Text size="sm" c="dimmed" mt="sm">
            Найдено рецептов: {filteredAndSortedRecipes.length}
          </Text>
        )}
      </Card>

      {/* Статистика любимых рецептов */}
      <Grid mb="lg">
        <Grid.Col span={3}>
          <Card withBorder p="md" style={{ textAlign: 'center' }}>
            <Text size="xl" fw={700} c="pink">
              {favoriteRecipes.length}
            </Text>
            <Text size="sm" c="dimmed">
              Всего любимых
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder p="md" style={{ textAlign: 'center' }}>
            <Text size="xl" fw={700} c="teal">
              {favoriteRecipes.length > 0
                ? Math.round(
                    favoriteRecipes.reduce((sum, r) => sum + r.calories, 0) /
                      favoriteRecipes.length
                  )
                : 0}
            </Text>
            <Text size="sm" c="dimmed">
              Средние калории
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder p="md" style={{ textAlign: 'center' }}>
            <Text size="xl" fw={700} c="blue">
              {favoriteRecipes.length > 0
                ? Math.round(
                    favoriteRecipes.reduce((sum, r) => sum + r.proteins, 0) /
                      favoriteRecipes.length
                  )
                : 0}
            </Text>
            <Text size="sm" c="dimmed">
              Средние белки
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder p="md" style={{ textAlign: 'center' }}>
            <Text size="xl" fw={700} c="orange">
              {favoriteRecipes.reduce(
                (sum, r) => sum + r.ingredients.length,
                0
              )}
            </Text>
            <Text size="sm" c="dimmed">
              Ингредиентов
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      {filteredAndSortedRecipes.length === 0 && searchQuery ? (
        <Alert
          icon={<span>🔍</span>}
          title="Рецепты не найдены"
          color="blue"
          mb="lg"
        >
          По запросу "{searchQuery}" не найдено любимых рецептов. Попробуйте
          изменить поисковый запрос или очистить фильтр.
        </Alert>
      ) : (
        <Grid>
          {filteredAndSortedRecipes.map(recipe => (
            <Grid.Col key={recipe.id} span={{ base: 12, sm: 6, lg: 4 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Card.Section>
                  <Box
                    p="md"
                    style={{
                      backgroundColor: 'var(--mantine-color-teal-0)',
                      borderBottom: '1px solid var(--mantine-color-gray-2)',
                    }}
                  >
                    <Group justify="space-between" align="flex-start">
                      <Title order={3} size="h4" lineClamp={2}>
                        {recipe.name}
                      </Title>
                      <ActionIcon
                        variant="subtle"
                        color="pink"
                        onClick={() => handleToggleFavorite(recipe)}
                        style={{ flexShrink: 0 }}
                      >
                        <HeartFillIcon size={20} />
                      </ActionIcon>
                    </Group>
                  </Box>
                </Card.Section>

                <Stack gap="sm" mt="md">
                  <Group gap="xs">
                    <Badge color="teal" variant="light">
                      {recipe.calories} ккал
                    </Badge>
                    <Badge color="blue" variant="light">
                      Б: {recipe.proteins}г
                    </Badge>
                    <Badge color="orange" variant="light">
                      Ж: {recipe.fats}г
                    </Badge>
                    <Badge color="green" variant="light">
                      У: {recipe.carbohydrates}г
                    </Badge>
                  </Group>

                  {recipe.cookingTime && (
                    <Text size="sm" c="dimmed">
                      ⏱️ Время приготовления: {recipe.cookingTime} мин
                    </Text>
                  )}

                  {recipe.difficulty && (
                    <Text size="sm" c="dimmed">
                      📊 Сложность: {recipe.difficulty}
                    </Text>
                  )}

                  <Divider />

                  <Text size="sm" fw={500} mb="xs">
                    Ингредиенты:
                  </Text>
                  <Stack gap="xs">
                    {recipe.ingredients.map((ingredient, index) => {
                      const stock = getIngredientStockValue(ingredient.name);
                      const hasStock = stock >= ingredient.amount;

                      return (
                        <Group key={index} justify="space-between" gap="xs">
                          <Text size="sm" style={{ flex: 1 }}>
                            {ingredient.name}
                          </Text>
                          <Group gap="xs">
                            <Text size="sm" c="dimmed">
                              {ingredient.amount} {ingredient.amountType}
                            </Text>
                            <Badge
                              size="xs"
                              color={hasStock ? 'green' : 'red'}
                              variant="light"
                            >
                              {hasStock ? '✓' : '✗'} {stock}
                            </Badge>
                          </Group>
                        </Group>
                      );
                    })}
                  </Stack>

                  <Divider />

                  <Group justify="space-between" mt="md">
                    <Button
                      component={Link}
                      to={`/recipe/${recipe.id}`}
                      variant="light"
                      color="teal"
                      size="sm"
                    >
                      Подробнее
                    </Button>
                    <Button
                      onClick={() => handleAddToCalendar(recipe)}
                      leftSection={<CalendarIcon size={16} />}
                      variant="filled"
                      color="teal"
                      size="sm"
                    >
                      В календарь
                    </Button>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}
    </div>
  );
}
