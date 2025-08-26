import { Button, Group, Modal, Select, Stack, Title } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { CalendarIcon } from '@primer/octicons-react'
import React from 'react'

interface AddToCalendarModalProps {
  opened: boolean
  onClose: () => void
  onConfirm: (date: string, mealType: string) => void
  recipeName: string
}

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Завтрак' },
  { value: 'lunch', label: 'Обед' },
  { value: 'dinner', label: 'Ужин' },
  { value: 'snack', label: 'Перекус' },
]

export function AddToCalendarModal({ opened, onClose, onConfirm, recipeName }: AddToCalendarModalProps) {
  const [selectedDate, setSelectedDate] = React.useState<string | null>(new Date().toISOString().split('T')[0] || null)
  const [selectedMealType, setSelectedMealType] = React.useState<string>('lunch')

  const handleConfirm = () => {
    if (selectedDate && selectedMealType) {
      onConfirm(selectedDate, selectedMealType)
      onClose()
      // Сброс значений
      setSelectedDate(new Date().toISOString().split('T')[0] || null)
      setSelectedMealType('lunch')
    }
  }

  const handleClose = () => {
    onClose()
    // Сброс значений
    setSelectedDate(new Date().toISOString().split('T')[0] || null)
    setSelectedMealType('lunch')
  }

  return (
    <Modal opened={opened} onClose={handleClose} title="Добавить в календарь" size="md">
      <Stack gap="md">
        <Title order={4} ta="center">
          {recipeName}
        </Title>

        <DateInput
          label="Выберите дату"
          placeholder="Выберите дату"
          value={selectedDate}
          onChange={setSelectedDate}
          clearable={false}
          leftSection={<CalendarIcon size={16} />}
        />

        <Select
          label="Выберите прием пищи"
          placeholder="Выберите прием пищи"
          data={MEAL_TYPES}
          value={selectedMealType}
          onChange={(value) => setSelectedMealType(value || 'lunch')}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={handleClose}>
            Отмена
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedMealType}
            leftSection={<CalendarIcon size={16} />}
          >
            Добавить в календарь
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
