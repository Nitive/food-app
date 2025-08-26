import { PrismaClient } from '@prisma/client'
import { recipes } from '../src/data.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Начинаем заполнение базы данных...')

  // Очищаем существующие данные
  await prisma.cartItem.deleteMany()
  await prisma.recipeIngredient.deleteMany()
  await prisma.stockItem.deleteMany()
  await prisma.recipe.deleteMany()
  await prisma.ingredient.deleteMany()

  console.log('🗑️ Существующие данные очищены')

  // Создаем уникальные ингредиенты
  const allIngredients = new Map<string, { name: string; amountType: string }>()

  recipes.forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      if (!allIngredients.has(ingredient.name)) {
        allIngredients.set(ingredient.name, {
          name: ingredient.name,
          amountType: ingredient.amountType,
        })
      }
    })
  })

  const ingredients = Array.from(allIngredients.values())

  // Сохраняем ингредиенты в базу
  for (const ingredient of ingredients) {
    await prisma.ingredient.create({
      data: {
        name: ingredient.name,
        amountType: ingredient.amountType,
      },
    })
  }

  console.log(`✅ Создано ${ingredients.length} ингредиентов`)

  // Создаем рецепты с ингредиентами
  for (const recipe of recipes) {
    const createdRecipe = await prisma.recipe.create({
      data: {
        name: recipe.name,
        calories: recipe.calories,
        proteins: recipe.proteins,
        fats: recipe.fats,
        carbohydrates: recipe.carbohydrates,
      },
    })

    // Добавляем ингредиенты к рецепту
    for (const ingredient of recipe.ingredients) {
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { name: ingredient.name },
      })

      if (dbIngredient) {
        try {
          await prisma.recipeIngredient.create({
            data: {
              recipeId: createdRecipe.id,
              ingredientId: dbIngredient.id,
              amount: ingredient.amount,
            },
          })
        } catch (error) {
          // Игнорируем ошибки дублирования
          console.log(`⚠️ Игнорируем дублирование: ${ingredient.name} в рецепте ${recipe.name}`)
        }
      }
    }
  }

  console.log(`✅ Создано ${recipes.length} рецептов`)

  console.log('🎉 База данных успешно заполнена!')
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при заполнении базы данных:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
