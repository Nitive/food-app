import { recipes } from '../data.js'

export interface Recipe {
  id: number
  name: string
  calories: number
  proteins: number
  fats: number
  carbohydrates: number
  ingredients: {
    name: string
    amount: number
    amountType: 'гр' | 'мл' | 'шт' | 'по вкусу' | 'г' | 'л'
  }[]
}

/**
 * Находит рецепт по ID
 */
export function findRecipeById(id: number): Recipe | undefined {
  return recipes.find((recipe) => recipe.id === id)
}

/**
 * Находит рецепты по названию (поиск без учета регистра)
 */
export function findRecipesByName(name: string): Recipe[] {
  const searchTerm = name.toLowerCase()
  return recipes.filter((recipe) => recipe.name.toLowerCase().includes(searchTerm))
}

/**
 * Вычисляет общую калорийность для списка рецептов
 */
export function calculateTotalCalories(recipeIds: number[]): number {
  return recipeIds.reduce((total, id) => {
    const recipe = findRecipeById(id)
    return total + (recipe?.calories || 0)
  }, 0)
}

/**
 * Находит рецепты с калорийностью в заданном диапазоне
 */
export function findRecipesByCalorieRange(min: number, max: number): Recipe[] {
  return recipes.filter((recipe) => recipe.calories >= min && recipe.calories <= max)
}

/**
 * Получает список всех уникальных ингредиентов
 */
export function getAllIngredients(): string[] {
  const ingredients = new Set<string>()

  recipes.forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      ingredients.add(ingredient.name)
    })
  })

  return Array.from(ingredients).sort()
}
