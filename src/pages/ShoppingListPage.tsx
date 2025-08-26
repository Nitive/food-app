import React from 'react';
import {
  Stack,
  Title,
  Text,
  Group,
  Card,
  Paper,
  List,
  LoadingOverlay,
  Button,
} from '@mantine/core';
import { CheckCircleFillIcon } from '@primer/octicons-react';
import { Link } from 'react-router-dom';
import { useStore } from '@nanostores/react';
import { $shoppingList, $loading, $user } from '../app.js';
import { UserMenu } from '../components/UserMenu.js';
import { Breadcrumbs } from '../components/Breadcrumbs.js';
import { QuickActions } from '../components/QuickActions.js';
import { exportShoppingListToPDF } from '../app.js';

export function ShoppingListPage() {
  const shoppingList = useStore($shoppingList);
  const loading = useStore($loading);
  const user = useStore($user);

  const handleLogout = () => {
    // Функция будет передана из основного компонента
  };

  return (
    <Stack gap="lg" pos="relative">
      <LoadingOverlay visible={loading} />

      {/* Заголовок и навигация */}
      <Group justify="space-between" align="center">
        <div>
          <Title>Список покупок</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Автоматически сгенерированный список ингредиентов
          </Text>
        </div>
        <Group gap="xs">
          <QuickActions
            showExport={shoppingList.length > 0}
            onExportPDF={() => exportShoppingListToPDF(shoppingList)}
            exportLabel="Экспорт списка"
          />
          {user && (
            <UserMenu
              user={user}
              cartItems={[]}
              onLogout={handleLogout}
              onCartClick={() => {}}
            />
          )}
        </Group>
      </Group>

      <Breadcrumbs />

      {shoppingList.length === 0 ? (
        <Card withBorder p="xl" style={{ textAlign: 'center' }}>
          <Text size="xl" c="dimmed" mb="md">
            📋 Список покупок пуст
          </Text>
          <Text c="dimmed" mb="lg">
            Добавьте рецепты в корзину, чтобы автоматически сгенерировать список
            покупок
          </Text>
          <Button component={Link} to="/recipes" color="teal">
            Перейти к рецептам
          </Button>
        </Card>
      ) : (
        <>
          {/* Информация о списке */}
          <Card
            withBorder
            p="md"
            style={{ backgroundColor: 'var(--mantine-color-amber-0)' }}
          >
            <Group gap="md" align="flex-start">
              <div style={{ fontSize: '24px' }}>💡</div>
              <div style={{ flex: 1 }}>
                <Text fw={500} mb="xs">
                  Как использовать список покупок:
                </Text>
                <Text size="sm" c="dimmed">
                  • Этот список автоматически генерируется на основе рецептов в
                  корзине
                  <br />
                  • Отметьте купленные товары, кликнув на них
                  <br />
                  • Экспортируйте список в PDF для удобства
                  <br />• Список обновляется при изменении корзины
                </Text>
              </div>
            </Group>
          </Card>

          {/* Список покупок */}
          <Paper p="md" withBorder>
            <Group justify="space-between" align="center" mb="md">
              <Text fw={500} size="lg">
                Товары для покупки ({shoppingList.length})
              </Text>
            </Group>

            <List
              icon={
                <CheckCircleFillIcon
                  size={16}
                  fill="var(--mantine-color-sage-8)"
                />
              }
              spacing="sm"
            >
              {shoppingList.map((item: any) => (
                <List.Item
                  key={item.name}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor =
                      'var(--mantine-color-gray-0)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Group justify="space-between" align="center">
                    <Text fw={500} style={{ flex: 1 }}>
                      {item.name}
                    </Text>
                    <Text
                      size="sm"
                      c="dimmed"
                      style={{ fontFamily: 'monospace' }}
                    >
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
                Всего товаров: {shoppingList.length}
              </Text>
              <Group gap="xs">
                <Button
                  variant="light"
                  color="teal"
                  component={Link}
                  to="/cart"
                >
                  Перейти к корзине
                </Button>
                <Button
                  variant="light"
                  color="indigo"
                  component={Link}
                  to="/recipes"
                >
                  Добавить рецепты
                </Button>
              </Group>
            </Group>
          </Card>
        </>
      )}
    </Stack>
  );
}
