import { Alert, Button, Group, List, Modal, Stack, Text, Title } from '@mantine/core'
import { AlertIcon, CheckIcon } from '@primer/octicons-react'

interface ProfileReminderModalProps {
  opened: boolean
  onClose: () => void
  onOpenProfile: () => void
}

export function ProfileReminderModal({ opened, onClose, onOpenProfile }: ProfileReminderModalProps) {
  const handleOpenProfile = () => {
    onClose()
    onOpenProfile()
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Добро пожаловать! 👋"
      size="md"
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <Stack gap="lg">
        <Alert icon={<AlertIcon size={16} />} title="Профиль не заполнен" color="blue" variant="light">
          Для получения персонализированных рекомендаций по питанию необходимо заполнить ваш профиль.
        </Alert>

        <div>
          <Title order={4} mb="md">
            Что вы получите после заполнения профиля:
          </Title>
          <List size="sm" spacing="xs">
            <List.Item>
              <Text size="sm">
                🎯 <strong>Персональные цели по калориям</strong> - рассчитанные специально для вас
              </Text>
            </List.Item>
            <List.Item>
              <Text size="sm">
                📊 <strong>Умные рекомендации</strong> - вместо общих фраз "мало калорий" вы увидите точные цифры
              </Text>
            </List.Item>
            <List.Item>
              <Text size="sm">
                📈 <strong>Прогресс в процентах</strong> - насколько вы близки к своей цели
              </Text>
            </List.Item>
            <List.Item>
              <Text size="sm">
                🎨 <strong>Цветовая индикация</strong> - зеленый/оранжевый/красный в зависимости от вашего прогресса
              </Text>
            </List.Item>
            <List.Item>
              <Text size="sm">
                💡 <strong>Советы по питанию</strong> - рекомендации с учетом вашего возраста, веса и активности
              </Text>
            </List.Item>
          </List>
        </div>

        <Text size="sm" c="dimmed">
          Заполнение профиля займет всего 2-3 минуты, но значительно улучшит ваш опыт использования приложения!
        </Text>

        <Group justify="flex-end" gap="xs">
          <Button variant="light" onClick={onClose}>
            Позже
          </Button>
          <Button onClick={handleOpenProfile} leftSection={<CheckIcon size={16} />}>
            Заполнить профиль
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
