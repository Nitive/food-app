import { Button, Group, Tooltip } from '@mantine/core'
import { useStore } from '@nanostores/react'
import { DownloadIcon, PlusIcon, TrashIcon } from '@primer/octicons-react'
import { $createIngredientModal, $createRecipeModal } from '../app.js'

interface QuickActionsProps {
  onExportPDF?: () => void
  onClearData?: () => void
  showCreateRecipe?: boolean
  showCreateIngredient?: boolean
  showExport?: boolean
  showClear?: boolean
  exportLabel?: string
  clearLabel?: string
}

export function QuickActions({
  onExportPDF,
  onClearData,
  showCreateRecipe = false,
  showCreateIngredient = false,
  showExport = false,
  showClear = false,
  exportLabel = 'Экспорт в PDF',
  clearLabel = 'Очистить',
}: QuickActionsProps) {
  const createRecipeModal = useStore($createRecipeModal)
  const createIngredientModal = useStore($createIngredientModal)

  return (
    <Group gap="xs">
      {showCreateRecipe && (
        <Tooltip label="Создать новый рецепт">
          <Button
            variant="light"
            color="sage"
            leftSection={<PlusIcon size={16} />}
            onClick={() => $createRecipeModal.set(true)}
            size="sm"
          >
            Создать рецепт
          </Button>
        </Tooltip>
      )}

      {showCreateIngredient && (
        <Tooltip label="Создать новый ингредиент">
          <Button
            variant="light"
            color="sage"
            leftSection={<PlusIcon size={16} />}
            onClick={() => $createIngredientModal.set(true)}
            size="sm"
          >
            Создать ингредиент
          </Button>
        </Tooltip>
      )}

      {showExport && onExportPDF && (
        <Tooltip label={exportLabel}>
          <Button variant="light" color="teal" leftSection={<DownloadIcon size={16} />} onClick={onExportPDF} size="sm">
            {exportLabel}
          </Button>
        </Tooltip>
      )}

      {showClear && onClearData && (
        <Tooltip label={clearLabel}>
          <Button variant="light" color="rose" leftSection={<TrashIcon size={16} />} onClick={onClearData} size="sm">
            {clearLabel}
          </Button>
        </Tooltip>
      )}
    </Group>
  )
}
