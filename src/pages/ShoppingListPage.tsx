import { Badge, Button, Card, Group, List, LoadingOverlay, Paper, Stack, Text, Title } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useStore } from '@nanostores/react'
import { CheckCircleFillIcon } from '@primer/octicons-react'
import React from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../api-client.js'
import { $loading, $shoppingList, $user, exportShoppingListToPDF } from '../app.js'
import { Breadcrumbs } from '../components/Breadcrumbs.js'
import { QuickActions } from '../components/QuickActions.js'
import { UserMenu } from '../components/UserMenu.js'

export function ShoppingListPage() {
  const shoppingList = useStore($shoppingList)
  const loading = useStore($loading)
  const user = useStore($user)
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(new Date())

  const handleLogout = () => {
    // Функция будет передана из основного компонента
  }

  const handleDateChange = async (dateString: string | null) => {
    if (dateString) {
      const date = new Date(dateString)
      setSelectedDate(date)
      try {
        const newShoppingList = await apiClient.getShoppingList(dateString)
        $shoppingList.set(newShoppingList)
      } catch (error) {
        console.error('Ошибка загрузки списка покупок:', error)
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
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

  return (
    <Stack gap="lg" pos="relative">
      <LoadingOverlay visible={loading} />

      {/* Заголовок и навигация */}
      <Group justify="space-between" align="center">
        <div>
          <Title>Список покупок</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Список ингредиентов для выбранной даты
          </Text>
        </div>
        <Group gap="xs">
          <QuickActions
            showExport={shoppingList.items.length > 0}
            onExportPDF={() => exportShoppingListToPDF(shoppingList.items)}
            exportLabel="Экспорт списка"
          />
          {user && <UserMenu user={user} onLogout={handleLogout} onOpenProfile={() => alert('Профиль пользователя')} />}
        </Group>
      </Group>

      <Breadcrumbs />

      {/* Выбор даты */}
      <Card withBorder p="md">
        <Group gap="md" align="flex-end">
          <div>
            <Text size="sm" fw={500} mb="xs">
              Выберите дату:
            </Text>
            <DateInput value={selectedDate} onChange={handleDateChange} placeholder="Выберите дату" clearable w={200} />
          </div>
          {shoppingList.date && (
            <Text size="sm" c="dimmed">
              Список для: {formatDate(shoppingList.date || '')}
            </Text>
          )}
        </Group>
      </Card>

      {shoppingList.items.length === 0 ? (
        <Card withBorder p="xl" style={{ textAlign: 'center' }}>
          <Text size="xl" c="dimmed" mb="md">
            📋 Список покупок пуст
          </Text>
          <Text c="dimmed" mb="lg">
            {selectedDate
              ? `На ${formatDate(selectedDate.toISOString().split('T')[0] || '')} нет запланированных рецептов`
              : 'Выберите дату для просмотра списка покупок'}
          </Text>
          <Button component={Link} to="/calendar" color="teal">
            Перейти к календарю
          </Button>
        </Card>
      ) : (
        <>
          {/* Информация о рецептах */}
          {shoppingList.recipes.length > 0 && (
            <Card withBorder p="md" style={{ backgroundColor: 'var(--mantine-color-teal-0)' }}>
              <Text fw={500} mb="sm">
                📅 Запланированные рецепты на {formatDate(shoppingList.date || '')}:
              </Text>
              <Group gap="xs">
                {shoppingList.recipes.map((recipe, index) => (
                  <Badge key={index} color="teal" variant="light">
                    {getMealTypeEmoji(recipe.mealType)} {recipe.name}
                  </Badge>
                ))}
              </Group>
            </Card>
          )}

          {/* Информация о списке */}
          <Card withBorder p="md" style={{ backgroundColor: 'var(--mantine-color-amber-0)' }}>
            <Group gap="md" align="flex-start">
              <div style={{ fontSize: '24px' }}>💡</div>
              <div style={{ flex: 1 }}>
                <Text fw={500} mb="xs">
                  Как использовать список покупок:
                </Text>
                <Text size="sm" c="dimmed">
                  • Этот список автоматически генерируется на основе рецептов в календаре
                  <br />
                  • Учитываются имеющиеся ингредиенты на складе
                  <br />
                  • Отметьте купленные товары, кликнув на них
                  <br />• Экспортируйте список в PDF для удобства
                </Text>
              </div>
            </Group>
          </Card>

          {/* Список покупок */}
          <Paper p="md" withBorder>
            <Group justify="space-between" align="center" mb="md">
              <Text fw={500} size="lg">
                Товары для покупки ({shoppingList.items.length})
              </Text>
            </Group>

            <List icon={<CheckCircleFillIcon size={16} fill="var(--mantine-color-sage-8)" />} spacing="sm">
              {shoppingList.items.map((item: any) => (
                <List.Item
                  key={item.name}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-0)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <Group justify="space-between" align="center">
                    <Text fw={500} style={{ flex: 1 }}>
                      {item.name}
                    </Text>
                    <Text size="sm" c="dimmed" style={{ fontFamily: 'monospace' }}>
                      {item.amount} {item.amountType}
                    </Text>
                  </Group>
                </List.Item>
              ))}
            </List>
          </Paper>

          {/* Дополнительные действия */}
          <Card withBorder p="md">
            <Group justify="space-between" align="center">
              <Text size="sm" c="dimmed">
                Всего товаров: {shoppingList.items.length}
              </Text>
              <Group gap="xs">
                <Button variant="light" color="indigo" component={Link} to="/calendar">
                  Планировать питание
                </Button>
              </Group>
            </Group>
          </Card>
        </>
      )}
    </Stack>
  )
}
