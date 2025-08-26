import React from 'react'
import { Stack, Title, Table, Text, Group, ActionIcon, NumberInput, Button, Card, LoadingOverlay } from '@mantine/core'
import { DashIcon, TrashIcon } from '@primer/octicons-react'
import { Link } from 'react-router-dom'
import { useStore } from '@nanostores/react'
import { $cartItems, $loading, $user } from '../app.js'
import { UserMenu } from '../components/UserMenu.js'
import { Breadcrumbs } from '../components/Breadcrumbs.js'
import { QuickActions } from '../components/QuickActions.js'
import { exportCartToPDF } from '../app.js'

export function CartPage() {
  const cartItems = useStore($cartItems)
  const loading = useStore($loading)
  const user = useStore($user)

  const stats = {
    calories: cartItems.reduce((sum: number, item: any) => sum + (item.recipe.calories * item.quantity), 0).toFixed(1),
    proteins: cartItems.reduce((sum: number, item: any) => sum + (item.recipe.proteins * item.quantity), 0).toFixed(1),
    fats: cartItems.reduce((sum: number, item: any) => sum + (item.recipe.fats * item.quantity), 0).toFixed(1),
    carbohydrates: cartItems.reduce((sum: number, item: any) => sum + (item.recipe.carbohydrates * item.quantity), 0).toFixed(1),
  }

  const handleLogout = () => {
    // Функция будет передана из основного компонента
  }

  const clearCart = () => {
    // Функция будет передана из основного компонента
  }

  const updateCartQuantity = (id: number, quantity: number) => {
    // Функция будет передана из основного компонента
  }

  const removeFromCart = (id: number) => {
    // Функция будет передана из основного компонента
  }

  return (
    <Stack gap="lg" pos="relative">
      <LoadingOverlay visible={loading} />

      {/* Заголовок и навигация */}
      <Group justify="space-between" align="center">
        <div>
          <Title>Корзина покупок</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Управляйте выбранными рецептами
          </Text>
        </div>
        <Group gap="xs">
          <QuickActions
            showExport={cartItems.length > 0}
            onExportPDF={() => exportCartToPDF(cartItems)}
            exportLabel="Экспорт корзины"
            showClear={cartItems.length > 0}
            onClearData={clearCart}
            clearLabel="Очистить корзину"
          />
          {user && (
            <UserMenu 
              user={user} 
              cartItems={cartItems}
              onLogout={handleLogout} 
              onCartClick={() => {}}
            />
          )}
        </Group>
      </Group>

      <Breadcrumbs />

      {cartItems.length === 0 ? (
        <Card withBorder p="xl" style={{ textAlign: 'center' }}>
          <Text size="xl" c="dimmed" mb="md">
            🛒 Корзина пуста
          </Text>
          <Text c="dimmed" mb="lg">
            Добавьте рецепты в корзину, чтобы начать планирование покупок
          </Text>
          <Button component={Link} to="/recipes" color="teal">
            Перейти к рецептам
          </Button>
        </Card>
      ) : (
        <>
          {/* Таблица корзины */}
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
              {cartItems.map((item: any) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Link
                      to={`/recipe/${item.recipe.id}`}
                      style={{ color: 'var(--mantine-color-teal-6)', textDecoration: 'none' }}
                    >
                      {item.recipe.name}
                    </Link>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        variant="light"
                        color="rose"
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
                    <ActionIcon variant="light" color="rose" onClick={() => removeFromCart(item.id)}>
                      <TrashIcon size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {/* Статистика */}
          <Card withBorder p="md">
            <Group justify="space-between" align="center">
              <Text fw={500}>
                Общий КБЖУ: {stats.calories}/{stats.proteins}/{stats.fats}/{stats.carbohydrates}
              </Text>
              <Button variant="light" color="rose" onClick={clearCart}>
                Очистить корзину
              </Button>
            </Group>
          </Card>
        </>
      )}
    </Stack>
  )
}
