import { describe, expect, it } from 'vitest'
import {
  calculateTotalCalories,
  findRecipeById,
  findRecipesByCalorieRange,
  findRecipesByName,
  getAllIngredients,
} from '../../utils/recipe-utils.js'

describe('Recipe Utils', () => {
  describe('findRecipeById', () => {
    it('должен найти рецепт по существующему ID', () => {
      const recipe = findRecipeById(1)

      expect(recipe).toBeDefined()
      expect(recipe?.name).toBe('Сырники')
      expect(recipe?.calories).toBe(164)
    })

    it('должен вернуть undefined для несуществующего ID', () => {
      const recipe = findRecipeById(999)

      expect(recipe).toBeUndefined()
    })

    it('должен найти рецепт с ID 2', () => {
      const recipe = findRecipeById(2)

      expect(recipe).toBeDefined()
      expect(recipe?.name).toBe('Блины')
    })
  })

  describe('findRecipesByName', () => {
    it('должен найти рецепты по точному названию', () => {
      const recipes = findRecipesByName('Сырники')

      expect(recipes).toHaveLength(1)
      expect(recipes[0].name).toBe('Сырники')
    })

    it('должен найти рецепты по частичному названию', () => {
      const recipes = findRecipesByName('салат')

      expect(recipes.length).toBeGreaterThan(0)
      recipes.forEach((recipe) => {
        expect(recipe?.name.toLowerCase()).toContain('салат')
      })
    })

    it('должен быть нечувствителен к регистру', () => {
      const recipes1 = findRecipesByName('СЫРНИКИ')
      const recipes2 = findRecipesByName('сырники')

      expect(recipes1).toEqual(recipes2)
      expect(recipes1).toHaveLength(1)
    })

    it('должен вернуть пустой массив для несуществующего названия', () => {
      const recipes = findRecipesByName('НесуществующийРецепт')

      expect(recipes).toHaveLength(0)
    })
  })

  describe('calculateTotalCalories', () => {
    it('должен вычислить общую калорийность для одного рецепта', () => {
      const total = calculateTotalCalories([1])

      expect(total).toBe(164) // Калорийность сырников
    })

    it('должен вычислить общую калорийность для нескольких рецептов', () => {
      const total = calculateTotalCalories([1, 2])

      expect(total).toBe(164 + 147) // Сырники + Блины
    })

    it('должен игнорировать несуществующие ID', () => {
      const total = calculateTotalCalories([1, 999, 2])

      expect(total).toBe(164 + 147) // Только существующие рецепты
    })

    it('должен вернуть 0 для пустого массива', () => {
      const total = calculateTotalCalories([])

      expect(total).toBe(0)
    })
  })

  describe('findRecipesByCalorieRange', () => {
    it('должен найти рецепты в заданном диапазоне калорий', () => {
      const recipes = findRecipesByCalorieRange(100, 200)

      expect(recipes.length).toBeGreaterThan(0)
      recipes.forEach((recipe) => {
        expect(recipe.calories).toBeGreaterThanOrEqual(100)
        expect(recipe.calories).toBeLessThanOrEqual(200)
      })
    })

    it('должен включить граничные значения', () => {
      const recipes = findRecipesByCalorieRange(164, 164)

      expect(recipes.length).toBeGreaterThan(0)
      recipes.forEach((recipe) => {
        expect(recipe.calories).toBe(164)
      })
    })

    it('должен вернуть пустой массив для диапазона без рецептов', () => {
      const recipes = findRecipesByCalorieRange(1000, 2000)

      expect(recipes).toHaveLength(0)
    })
  })

  describe('getAllIngredients', () => {
    it('должен вернуть список всех уникальных ингредиентов', () => {
      const ingredients = getAllIngredients()

      expect(ingredients.length).toBeGreaterThan(0)
      expect(ingredients).toEqual([...new Set(ingredients)]) // Все элементы уникальны
    })

    it('должен вернуть отсортированный список', () => {
      const ingredients = getAllIngredients()

      const sortedIngredients = [...ingredients].sort()
      expect(ingredients).toEqual(sortedIngredients)
    })

    it('должен содержать основные ингредиенты', () => {
      const ingredients = getAllIngredients()

      expect(ingredients).toContain('Яйцо')
      expect(ingredients).toContain('Соль')
      expect(ingredients).toContain('Творог 5%')
    })
  })
})
