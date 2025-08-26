import { ActionIcon, Avatar, Group, Menu, Text } from '@mantine/core'
import { SignOutIcon } from '@primer/octicons-react'
import { apiClient, type User } from '../api-client.js'

interface UserMenuProps {
  user: User
  onLogout: () => void
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const handleLogout = async () => {
    try {
      await apiClient.logout()
      onLogout()
    } catch (error) {
      console.error('Logout error:', error)
      // Даже если запрос не прошел, очищаем локальное хранилище
      onLogout()
    }
  }

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <ActionIcon size="lg" variant="subtle" style={{ position: 'relative' }}>
          <Avatar src={user.picture || null} alt={user.name || user.email} size="sm" radius="xl" />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item>
          <Group>
            <Avatar src={user.picture || null} alt={user.name || user.email} size="sm" radius="xl" />
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

        <Menu.Item color="rose" leftSection={<SignOutIcon size={14} />} onClick={handleLogout}>
          Выйти
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
