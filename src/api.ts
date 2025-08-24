import { node } from '@elysiajs/node'
import { PrismaClient } from '@prisma/client'
import { Elysia, t } from 'elysia'

const prisma = new PrismaClient()

const app = new Elysia({ adapter: node() as any })
  // Получить все рецепты
  .get('/api/recipes', async () => {
    const recipes = await prisma.recipe.findMany({
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    })

    return recipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      calories: recipe.calories,
      proteins: recipe.proteins,
      fats: recipe.fats,
      carbohydrates: recipe.carbohydrates,
      ingredients: recipe.ingredients.map((ri) => ({
        name: ri.ingredient.name,
        amount: ri.amount,
        amountType: ri.ingredient.amountType,
      })),
    }))
  })

  // Получить рецепт по ID
  .get('/api/recipes/:id', async ({ params }) => {
    const recipe = await prisma.recipe.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    })

    if (!recipe) {
      throw new Error('Recipe not found')
    }

    return {
      id: recipe.id,
      name: recipe.name,
      calories: recipe.calories,
      proteins: recipe.proteins,
      fats: recipe.fats,
      carbohydrates: recipe.carbohydrates,
      ingredients: recipe.ingredients.map((ri) => ({
        name: ri.ingredient.name,
        amount: ri.amount,
        amountType: ri.ingredient.amountType,
      })),
    }
  })

  // Создать новый рецепт
  .post(
    '/api/recipes',
    async ({ body }) => {
      const { name, calories, proteins, fats, carbohydrates, ingredients } = body

      // Создаем рецепт
      const recipe = await prisma.recipe.create({
        data: {
          name,
          calories,
          proteins,
          fats,
          carbohydrates,
        },
      })

      // Создаем или находим ингредиенты и связываем их с рецептом
      for (const ing of ingredients) {
        // Создаем или находим ингредиент
        const ingredient = await prisma.ingredient.upsert({
          where: { name: ing.name },
          update: {},
          create: {
            name: ing.name,
            amountType: ing.amountType,
          },
        })

        // Связываем ингредиент с рецептом
        await prisma.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            ingredientId: ingredient.id,
            amount: ing.amount,
          },
        })
      }

      // Возвращаем созданный рецепт с ингредиентами
      const createdRecipe = await prisma.recipe.findUnique({
        where: { id: recipe.id },
        include: {
          ingredients: {
            include: {
              ingredient: true,
            },
          },
        },
      })

      return {
        id: createdRecipe!.id,
        name: createdRecipe!.name,
        calories: createdRecipe!.calories,
        proteins: createdRecipe!.proteins,
        fats: createdRecipe!.fats,
        carbohydrates: createdRecipe!.carbohydrates,
        ingredients: createdRecipe!.ingredients.map((ri) => ({
          name: ri.ingredient.name,
          amount: ri.amount,
          amountType: ri.ingredient.amountType,
        })),
      }
    },
    {
      body: t.Object({
        name: t.String(),
        calories: t.Number(),
        proteins: t.Number(),
        fats: t.Number(),
        carbohydrates: t.Number(),
        ingredients: t.Array(
          t.Object({
            name: t.String(),
            amount: t.Number(),
            amountType: t.String(),
          })
        ),
      }),
    }
  )

  // Получить все ингредиенты
  .get('/api/ingredients', async () => {
    return await prisma.ingredient.findMany()
  })

  // Создать новый ингредиент
  .post(
    '/api/ingredients',
    async ({ body }) => {
      const { name, amountType } = body

      const ingredient = await prisma.ingredient.create({
        data: {
          name,
          amountType,
        },
      })

      return ingredient
    },
    {
      body: t.Object({
        name: t.String(),
        amountType: t.String(),
      }),
    }
  )

  // Получить корзину
  .get('/api/cart', async () => {
    const cartItems = await prisma.cartItem.findMany({
      include: {
        recipe: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
    })

    return cartItems.map((item) => ({
      id: item.id,
      recipeId: item.recipeId,
      quantity: item.quantity,
      recipe: {
        id: item.recipe.id,
        name: item.recipe.name,
        calories: item.recipe.calories,
        proteins: item.recipe.proteins,
        fats: item.recipe.fats,
        carbohydrates: item.recipe.carbohydrates,
        ingredients: item.recipe.ingredients.map((ri) => ({
          name: ri.ingredient.name,
          amount: ri.amount,
          amountType: ri.ingredient.amountType,
        })),
      },
    }))
  })

  // Добавить в корзину
  .post(
    '/api/cart',
    async ({ body }) => {
      const { recipeId } = body

      // Проверяем, есть ли уже этот рецепт в корзине
      const existingItem = await prisma.cartItem.findFirst({
        where: { recipeId },
      })

      if (existingItem) {
        // Увеличиваем количество
        return await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + 1 },
          include: {
            recipe: {
              include: {
                ingredients: {
                  include: {
                    ingredient: true,
                  },
                },
              },
            },
          },
        })
      } else {
        // Добавляем новый элемент
        return await prisma.cartItem.create({
          data: { recipeId, quantity: 1 },
          include: {
            recipe: {
              include: {
                ingredients: {
                  include: {
                    ingredient: true,
                  },
                },
              },
            },
          },
        })
      }
    },
    {
      body: t.Object({
        recipeId: t.Number(),
      }),
    }
  )

  // Обновить количество в корзине
  .put(
    '/api/cart/:id',
    async ({ params, body }) => {
      const { quantity } = body

      if (quantity <= 0) {
        // Удаляем элемент
        await prisma.cartItem.delete({
          where: { id: parseInt(params.id) },
        })
        return { deleted: true }
      } else {
        // Обновляем количество
        return await prisma.cartItem.update({
          where: { id: parseInt(params.id) },
          data: { quantity },
          include: {
            recipe: {
              include: {
                ingredients: {
                  include: {
                    ingredient: true,
                  },
                },
              },
            },
          },
        })
      }
    },
    {
      body: t.Object({
        quantity: t.Number(),
      }),
    }
  )

  // Удалить из корзины
  .delete('/api/cart/:id', async ({ params }) => {
    await prisma.cartItem.delete({
      where: { id: parseInt(params.id) },
    })
    return { deleted: true }
  })

  // Очистить корзину
  .delete('/api/cart', async () => {
    await prisma.cartItem.deleteMany()
    return { deleted: true }
  })

  // Получить наличие ингредиентов
  .get('/api/stock', async () => {
    return await prisma.stockItem.findMany({
      include: {
        ingredient: true,
      },
    })
  })

  // Обновить наличие ингредиента
  .put(
    '/api/stock/:ingredientId',
    async ({ params, body }) => {
      const { amount } = body
      const ingredientId = parseInt(params.ingredientId)

      if (amount <= 0) {
        // Удаляем запись о наличии
        await prisma.stockItem.deleteMany({
          where: { ingredientId },
        })
        return { deleted: true }
      } else {
        // Обновляем или создаем запись
        return await prisma.stockItem.upsert({
          where: { ingredientId },
          update: { amount },
          create: { ingredientId, amount },
          include: {
            ingredient: true,
          },
        })
      }
    },
    {
      body: t.Object({
        amount: t.Number(),
      }),
    }
  )

  // Получить список покупок
  .get('/api/shopping-list', async () => {
    const cartItems = await prisma.cartItem.findMany({
      include: {
        recipe: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
    })

    const stockItems = await prisma.stockItem.findMany({
      include: {
        ingredient: true,
      },
    })

    // Собираем все необходимые ингредиенты
    const neededIngredients = new Map<string, { amount: number; amountType: string }>()

    cartItems.forEach((item) => {
      item.recipe.ingredients.forEach((ri) => {
        const key = ri.ingredient.name
        const current = neededIngredients.get(key) || { amount: 0, amountType: ri.ingredient.amountType }
        neededIngredients.set(key, {
          amount: current.amount + ri.amount * item.quantity,
          amountType: ri.ingredient.amountType,
        })
      })
    })

    // Вычитаем имеющиеся ингредиенты
    stockItems.forEach((stock) => {
      const key = stock.ingredient.name
      const needed = neededIngredients.get(key)
      if (needed) {
        const remaining = Math.max(0, needed.amount - stock.amount)
        if (remaining > 0) {
          neededIngredients.set(key, { amount: remaining, amountType: needed.amountType })
        } else {
          neededIngredients.delete(key)
        }
      }
    })

    return Array.from(neededIngredients.entries()).map(([name, data]) => ({
      name,
      amount: data.amount,
      amountType: data.amountType,
    }))
  })

  .listen(3000, ({ hostname, port }) => {
    console.log(`🦊 API сервер запущен на ${hostname}:${port}`)
  })

// Экспортируем тип для Eden
export type App = typeof app

export default app
