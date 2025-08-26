import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useStore } from '@nanostores/react'
import React from 'react'
import { apiClient } from '../api-client.js'
import { $user } from '../app.js'

// Функция для проверки полноты профиля пользователя
const isProfileComplete = (user: any) => {
  if (!user) return false

  const requiredFields = [
    user.name,
    user.age,
    user.weight,
    user.height,
    user.gender,
    user.activityLevel,
    user.goal,
    user.dailyCalories,
  ]

  // Проверяем, что все обязательные поля заполнены
  return requiredFields.every((field) => field !== null && field !== undefined && field !== '')
}

interface UserProfileModalProps {
  opened: boolean
  onClose: () => void
}

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Сидячий образ жизни (мало движения)' },
  { value: 'lightly_active', label: 'Легкая активность (1-3 раза в неделю)' },
  { value: 'moderately_active', label: 'Умеренная активность (3-5 раз в неделю)' },
  { value: 'very_active', label: 'Высокая активность (6-7 раз в неделю)' },
  { value: 'extremely_active', label: 'Очень высокая активность (спортсмен)' },
]

const GOALS = [
  { value: 'lose_weight', label: 'Похудение' },
  { value: 'maintain_weight', label: 'Поддержание веса' },
  { value: 'gain_weight', label: 'Набор веса' },
]

const GENDERS = [
  { value: 'male', label: 'Мужской' },
  { value: 'female', label: 'Женский' },
  { value: 'other', label: 'Другой' },
]

export function UserProfileModal({ opened, onClose }: UserProfileModalProps) {
  const user = useStore($user)
  const [loading, setLoading] = React.useState(false)

  const form = useForm({
    initialValues: {
      name: user?.name || '',
      height: user?.height || null,
      weight: user?.weight || null,
      targetWeight: user?.targetWeight || null,
      dailyCalories: user?.dailyCalories || null,
      age: user?.age || null,
      gender: user?.gender || '',
      activityLevel: user?.activityLevel || '',
      goal: user?.goal || '',
    },
    validate: {
      height: (value: number | null) =>
        value && (value < 100 || value > 250) ? 'Рост должен быть от 100 до 250 см' : null,
      weight: (value: number | null) =>
        value && (value < 30 || value > 300) ? 'Вес должен быть от 30 до 300 кг' : null,
      targetWeight: (value: number | null) =>
        value && (value < 30 || value > 300) ? 'Целевой вес должен быть от 30 до 300 кг' : null,
      dailyCalories: (value: number | null) =>
        value && (value < 800 || value > 5000) ? 'Калории должны быть от 800 до 5000' : null,
      age: (value: number | null) =>
        value && (value < 10 || value > 120) ? 'Возраст должен быть от 10 до 120 лет' : null,
    },
  })

  React.useEffect(() => {
    if (user) {
      form.setValues({
        name: user.name || '',
        height: user.height || null,
        weight: user.weight || null,
        targetWeight: user.targetWeight || null,
        dailyCalories: user.dailyCalories || null,
        age: user.age || null,
        gender: user.gender || '',
        activityLevel: user.activityLevel || '',
        goal: user.goal || '',
      })
    }
  }, [user])

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true)
    try {
      const updatedUser = await apiClient.updateUserProfile({
        name: values.name || undefined,
        height: values.height || undefined,
        weight: values.weight || undefined,
        targetWeight: values.targetWeight || undefined,
        dailyCalories: values.dailyCalories || undefined,
        age: values.age || undefined,
        gender: values.gender || undefined,
        activityLevel: values.activityLevel || undefined,
        goal: values.goal || undefined,
      })

      // Обновляем глобальное состояние пользователя
      $user.set(updatedUser)

      // Проверяем, стал ли профиль полным
      if (isProfileComplete(updatedUser)) {
        // Показываем уведомление о завершении профиля
        alert(
          '🎉 Отлично! Ваш профиль заполнен. Теперь вы будете получать персонализированные рекомендации по питанию!'
        )
      }

      onClose()
    } catch (error) {
      console.error('Ошибка обновления профиля:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateBMI = () => {
    const weight = form.values.weight
    const height = form.values.height
    if (weight && height) {
      const heightInMeters = height / 100
      return (weight / (heightInMeters * heightInMeters)).toFixed(1)
    }
    return null
  }

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Недостаточный вес', color: 'blue' }
    if (bmi < 25) return { label: 'Нормальный вес', color: 'green' }
    if (bmi < 30) return { label: 'Избыточный вес', color: 'yellow' }
    return { label: 'Ожирение', color: 'red' }
  }

  const bmi = calculateBMI()

  return (
    <Modal opened={opened} onClose={onClose} title="Профиль пользователя" size="lg">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="lg">
          {/* Аватар и основная информация */}
          <Card withBorder p="md">
            <Group>
              <Avatar src={user?.picture || null} size="xl" radius="xl" alt={user?.name || 'Пользователь'} />
              <div>
                <Title order={4}>{user?.name || 'Пользователь'}</Title>
                <Text size="sm" c="dimmed">
                  {user?.email}
                </Text>
              </div>
            </Group>
          </Card>

          {/* Основная информация */}
          <Card withBorder p="md">
            <Title order={5} mb="md">
              Основная информация
            </Title>
            <Stack gap="md">
              <TextInput label="Имя" placeholder="Введите ваше имя" {...form.getInputProps('name')} />

              <Group grow>
                <NumberInput label="Возраст (лет)" placeholder="25" min={10} max={120} {...form.getInputProps('age')} />
                <Select label="Пол" placeholder="Выберите пол" data={GENDERS} {...form.getInputProps('gender')} />
              </Group>
            </Stack>
          </Card>

          {/* Физические параметры */}
          <Card withBorder p="md">
            <Title order={5} mb="md">
              Физические параметры
            </Title>
            <Stack gap="md">
              <Group grow>
                <NumberInput
                  label="Рост (см)"
                  placeholder="175"
                  min={100}
                  max={250}
                  {...form.getInputProps('height')}
                />
                <NumberInput
                  label="Текущий вес (кг)"
                  placeholder="70"
                  min={30}
                  max={300}
                  decimalScale={1}
                  {...form.getInputProps('weight')}
                />
              </Group>

              <NumberInput
                label="Желаемый вес (кг)"
                placeholder="65"
                min={30}
                max={300}
                decimalScale={1}
                {...form.getInputProps('targetWeight')}
              />

              {/* BMI информация */}
              {bmi && (
                <Card withBorder p="sm" bg="gray.0">
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>
                      Индекс массы тела (ИМТ):
                    </Text>
                    <Badge color={getBMICategory(parseFloat(bmi)).color} variant="light">
                      {bmi} - {getBMICategory(parseFloat(bmi)).label}
                    </Badge>
                  </Group>
                </Card>
              )}
            </Stack>
          </Card>

          {/* Цели и активность */}
          <Card withBorder p="md">
            <Title order={5} mb="md">
              Цели и активность
            </Title>
            <Stack gap="md">
              <Select
                label="Уровень активности"
                placeholder="Выберите уровень активности"
                data={ACTIVITY_LEVELS}
                {...form.getInputProps('activityLevel')}
              />

              <Select label="Цель" placeholder="Выберите цель" data={GOALS} {...form.getInputProps('goal')} />

              <NumberInput
                label="Цель по калориям на день"
                placeholder="2000"
                min={800}
                max={5000}
                {...form.getInputProps('dailyCalories')}
              />
            </Stack>
          </Card>

          {/* Рекомендации по калориям */}
          {form.values.age &&
            form.values.weight &&
            form.values.height &&
            form.values.gender &&
            form.values.activityLevel && (
              <Card withBorder p="md" bg="blue.0">
                <Title order={6} mb="sm" c="blue">
                  💡 Рекомендации
                </Title>
                <Text size="sm">
                  На основе ваших параметров рекомендуемое количество калорий: ~
                  {(() => {
                    // Простая формула расчета BMR (базовый обмен веществ)
                    let bmr = 0
                    if (form.values.gender === 'male') {
                      bmr =
                        88.362 +
                        13.397 * (form.values.weight || 0) +
                        4.799 * (form.values.height || 0) -
                        5.677 * (form.values.age || 0)
                    } else {
                      bmr =
                        447.593 +
                        9.247 * (form.values.weight || 0) +
                        3.098 * (form.values.height || 0) -
                        4.33 * (form.values.age || 0)
                    }

                    // Множители активности
                    const activityMultipliers = {
                      sedentary: 1.2,
                      lightly_active: 1.375,
                      moderately_active: 1.55,
                      very_active: 1.725,
                      extremely_active: 1.9,
                    }

                    const tdee =
                      bmr * (activityMultipliers[form.values.activityLevel as keyof typeof activityMultipliers] || 1.2)

                    // Корректировка по цели
                    let recommended = tdee
                    if (form.values.goal === 'lose_weight') {
                      recommended = tdee - 500 // Дефицит 500 калорий для похудения
                    } else if (form.values.goal === 'gain_weight') {
                      recommended = tdee + 300 // Профицит 300 калорий для набора веса
                    }

                    return Math.round(recommended)
                  })()}{' '}
                  ккал
                </Text>
              </Card>
            )}

          <Divider />

          <Group justify="flex-end" gap="xs">
            <Button variant="light" onClick={onClose} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" loading={loading}>
              Сохранить профиль
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
