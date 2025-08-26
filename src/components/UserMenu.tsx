import React from 'react';
import { Menu, Avatar, Text, Group, ActionIcon, Badge } from '@mantine/core';
import { SignOutIcon } from '@primer/octicons-react';
import { apiClient, type User, type CartItem } from '../api-client.js';

interface UserMenuProps {
  user: User;
  cartItems: CartItem[];
  onLogout: () => void;
  onCartClick: () => void;
}

export function UserMenu({
  user,
  cartItems,
  onLogout,
  onCartClick,
}: UserMenuProps) {
  const handleLogout = async () => {
    try {
      await apiClient.logout();
      onLogout();
    } catch (error) {
      console.error('Logout error:', error);
      // Даже если запрос не прошел, очищаем локальное хранилище
      onLogout();
    }
  };

  // Вычисляем статистику корзины
  const cartStats = {
    totalItems: cartItems.length,
    totalCalories: cartItems.reduce(
      (sum, item) => sum + item.recipe.calories * item.quantity,
      0
    ),
  };

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <ActionIcon size="lg" variant="subtle" style={{ position: 'relative' }}>
          <Avatar
            src={user.picture || null}
            alt={user.name || user.email}
            size="sm"
            radius="xl"
          />
          {cartItems.length > 0 && (
            <Badge
              size="xs"
              color="teal"
              variant="filled"
              style={{
                position: 'absolute',
                top: -5,
                right: -5,
                minWidth: '18px',
                height: '18px',
                fontSize: '10px',
                padding: '0 4px',
              }}
            >
              {cartItems.length}
            </Badge>
          )}
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item>
          <Group>
            <Avatar
              src={user.picture || null}
              alt={user.name || user.email}
              size="sm"
              radius="xl"
            />
            <div>
              <Text size="sm" fw={500}>
                {user.name || 'Пользователь'}
              </Text>
              <Text size="xs" c="dimmed">
                {user.email}
              </Text>
            </div>
          </Group>
        </Menu.Item>

        <Menu.Divider />

        {/* Информация о корзине */}
        <Menu.Item
          leftSection={<span style={{ fontSize: '14px' }}>🛒</span>}
          onClick={onCartClick}
          style={{ cursor: 'pointer' }}
        >
          <Group justify="space-between" w="100%">
            <Text size="sm">Корзина</Text>
            {cartItems.length > 0 && (
              <Badge size="xs" color="teal" variant="light">
                {cartItems.length} ({cartStats.totalCalories.toFixed(0)} ккал)
              </Badge>
            )}
          </Group>
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          color="rose"
          leftSection={<SignOutIcon size={14} />}
          onClick={handleLogout}
        >
          Выйти
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
