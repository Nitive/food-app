import {
  ActionIcon,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import { TrashIcon } from '@primer/octicons-react'
import React from 'react'
import type { Recipe } from '../api-client.js'

interface EditRecipeFormProps {
  opened: boolean
  onClose: () => void
  recipe: Recipe | null
  onSave: (recipeData: {
    name: string
    calories: number
    proteins: number
    fats: number
    carbohydrates: number
    instructions?: string
    cookingTime?: number
    difficulty?: string
    ingredients: { name: string; amount: number; amountType: string }[]
  }) => void
}

export function EditRecipeForm({ opened, onClose, recipe, onSave }: EditRecipeFormProps) {
  const [name, setName] = React.useState('')
  const [calories, setCalories] = React.useState(0)
  const [proteins, setProteins] = React.useState(0)
  const [fats, setFats] = React.useState(0)
  const [carbohydrates, setCarbohydrates] = React.useState(0)
  const [instructions, setInstructions] = React.useState('')
  const [cookingTime, setCookingTime] = React.useState<number | ''>('')
  const [difficulty, setDifficulty] = React.useState<string | null>(null)
  const [ingredients, setIngredients] = React.useState<{ name: string; amount: number; amountType: string }[]>([])

  // Инициализируем форму при открытии модального окна
  React.useEffect(() => {
    if (recipe && opened) {
      setName(recipe.name)
      setCalories(recipe.calories)
      setProteins(recipe.proteins)
      setFats(recipe.fats)
      setCarbohydrates(recipe.carbohydrates)
      setInstructions(recipe.instructions || '')
      setCookingTime(recipe.cookingTime || '')
      setDifficulty(recipe.difficulty || null)
      setIngredients(recipe.ingredients)
    }
  }, [recipe, opened])

  const handleSave = () => {
    if (!name.trim()) {
      alert('Введите название рецепта')
      return
    }

    if (ingredients.length === 0) {
      alert('Добавьте хотя бы один ингредиент')
      return
    }

    const recipeData = {
      name: name.trim(),
      calories,
      proteins,
      fats,
      carbohydrates,
      ingredients: ingredients.filter((ing) => ing.name.trim() && ing.amount > 0),
    }

    if (instructions.trim()) {
      ;(recipeData as any).instructions = instructions.trim()
    }
    if (cookingTime) {
      ;(recipeData as any).cookingTime = cookingTime
    }
    if (difficulty) {
      ;(recipeData as any).difficulty = difficulty
    }

    onSave(recipeData)
  }

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: 0, amountType: 'г' }])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: 'name' | 'amount' | 'amountType', value: string | number) => {
    const newIngredients = [...ingredients]
    newIngredients[index] = {
      ...newIngredients[index],
      [field]: value,
    } as { name: string; amount: number; amountType: string }
    setIngredients(newIngredients)
  }

  const amountTypes = [
    { value: 'г', label: 'грамм' },
    { value: 'гр', label: 'грамм' },
    { value: 'кг', label: 'килограмм' },
    { value: 'мл', label: 'миллилитр' },
    { value: 'л', label: 'литр' },
    { value: 'шт', label: 'штука' },
    { value: 'ст.л', label: 'столовая ложка' },
    { value: 'ч.л', label: 'чайная ложка' },
    { value: 'по вкусу', label: 'по вкусу' },
  ]

  const difficultyOptions = [
    { value: 'easy', label: 'Легкий' },
    { value: 'medium', label: 'Средний' },
    { value: 'hard', label: 'Сложный' },
  ]

  return (
    <Modal opened={opened} onClose={onClose} title="Редактировать рецепт" size="lg">
      <Stack gap="md">
        {/* Основная информация */}
        <TextInput
          label="Название рецепта"
          placeholder="Введите название"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Group grow>
          <NumberInput
            label="Калории"
            placeholder="0"
            value={calories}
            onChange={(value) => setCalories(typeof value === 'number' ? value : 0)}
            min={0}
            required
          />
          <NumberInput
            label="Белки (г)"
            placeholder="0"
            value={proteins}
            onChange={(value) => setProteins(typeof value === 'number' ? value : 0)}
            min={0}
            required
          />
        </Group>

        <Group grow>
          <NumberInput
            label="Жиры (г)"
            placeholder="0"
            value={fats}
            onChange={(value) => setFats(typeof value === 'number' ? value : 0)}
            min={0}
            required
          />
          <NumberInput
            label="Углеводы (г)"
            placeholder="0"
            value={carbohydrates}
            onChange={(value) => setCarbohydrates(typeof value === 'number' ? value : 0)}
            min={0}
            required
          />
        </Group>

        <Group grow>
          <NumberInput
            label="Время приготовления (мин)"
            placeholder="0"
            value={cookingTime}
            onChange={(value) => setCookingTime(typeof value === 'number' ? value : '')}
            min={0}
          />
          <Select
            label="Сложность"
            placeholder="Выберите сложность"
            value={difficulty}
            onChange={setDifficulty}
            data={difficultyOptions}
            clearable
          />
        </Group>

        <Textarea
          label="Инструкции по приготовлению"
          placeholder="Опишите процесс приготовления..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          minRows={3}
        />

        {/* Ингредиенты */}
        <div>
          <Group justify="space-between" align="center" mb="sm">
            <Text fw={500}>Ингредиенты</Text>
            <Button size="sm" onClick={addIngredient}>
              Добавить ингредиент
            </Button>
          </Group>

          <Stack gap="sm">
            {ingredients.map((ingredient, index) => (
              <Card key={index} withBorder p="sm">
                <Group gap="sm" align="flex-end">
                  <TextInput
                    placeholder="Название ингредиента"
                    value={ingredient.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    style={{ flex: 1 }}
                    required
                  />
                  <NumberInput
                    placeholder="Количество"
                    value={ingredient.amount}
                    onChange={(value) => updateIngredient(index, 'amount', value || 0)}
                    min={0}
                    w={100}
                    required
                  />
                  <Select
                    placeholder="Ед.изм."
                    value={ingredient.amountType}
                    onChange={(value) => updateIngredient(index, 'amountType', value || 'г')}
                    data={amountTypes}
                    w={120}
                    required
                  />
                  <ActionIcon color="red" variant="subtle" onClick={() => removeIngredient(index)}>
                    <TrashIcon size={16} />
                  </ActionIcon>
                </Group>
              </Card>
            ))}
          </Stack>
        </div>

        {/* Кнопки */}
        <Group justify="flex-end" gap="sm">
          <Button variant="light" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSave} color="teal">
            Сохранить изменения
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
