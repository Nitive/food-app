import 'dotenv/config'

import { cookie } from '@elysiajs/cookie'
import { cors } from '@elysiajs/cors'
import { node } from '@elysiajs/node'
import { PrismaClient } from '@prisma/client'
import { Elysia, t } from 'elysia'
import * as mime from 'mime-types'
import fsp from 'node:fs/promises'
import { URL } from 'node:url'
import { createJWT, findOrCreateUser, getGoogleUserInfo, getUserFromToken } from './auth.js'
import { requireAuth } from './middleware.js'

const prisma = new PrismaClient()

// Функция проверки прав доступа для редактирования общедоступных рецептов
async function checkPublicRecipeEditAccess({ cookie }: { cookie: any }) {
  const user = await requireAuth({ cookie })
  
  // Проверяем, является ли пользователь Elizaveta Smirnova
  if (user.user.email !== 'elizasmi20@gmail.com') {
    throw new Error('Доступ запрещен. Только Elizaveta Smirnova может редактировать общедоступные рецепты.')
  }
  
  return user
}

function getRedirectUri(request: Request) {
  const redirectUri = new URL('/api/auth/google/callback', request.url)
  if (request.headers.get('x-forwarded-proto') === 'https') {
    redirectUri.protocol = 'https:'
  }
  return redirectUri
}

const app = new Elysia({ adapter: node() as any })
  .get('/*', async () => {
    const indexFile = await fsp.readFile('./dist/client/index.html', 'utf-8')
    return new Response(indexFile, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })
  })
  .get('/assets/*', async ({ path }) => {
    const assetFile = await fsp.readFile(`./dist/client${path}`, 'utf-8')

    return new Response(assetFile, {
      status: 200,
      headers: {
        'Content-Type': mime.lookup(path) || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  })
  .use(cookie())
  .use(
    cors({
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
      exposeHeaders: ['Set-Cookie'],
    })
  )
  // Получить все рецепты (личные + публичные)
  .get('/api/recipes', async ({ cookie }) => {
    const user = await requireAuth({ cookie })

    const recipes = await prisma.recipe.findMany({
      where: {
        OR: [
          { authorId: user.user.id }, // Личные рецепты пользователя
          { authorId: null }, // Публичные рецепты
        ],
      },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
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
      instructions: recipe.instructions,
      cookingTime: recipe.cookingTime,
      difficulty: recipe.difficulty,
      authorId: recipe.authorId,
      author: recipe.author,
      ingredients: recipe.ingredients.map((ri) => ({
        name: ri.ingredient.name,
        amount: ri.amount,
        amountType: ri.ingredient.amountType,
      })),
    }))
  })

  // Получить рецепт по ID
  .get('/api/recipes/:id', async ({ params, cookie }) => {
    const user = await requireAuth({ cookie })
    const recipe = await prisma.recipe.findUnique({
      where: { 
        id: parseInt(params.id),
        OR: [
          { authorId: user.user.id }, // Личные рецепты пользователя
          { authorId: null }, // Публичные рецепты
        ],
      },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
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
      instructions: recipe.instructions,
      cookingTime: recipe.cookingTime,
      difficulty: recipe.difficulty,
      authorId: recipe.authorId,
      author: recipe.author,
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
    async ({ body, cookie }) => {
      const user = await requireAuth({ cookie })
      const { name, calories, proteins, fats, carbohydrates, instructions, cookingTime, difficulty, ingredients } = body

      // Создаем рецепт с автором
      const recipe = await prisma.recipe.create({
        data: {
          name,
          calories,
          proteins,
          fats,
          carbohydrates,
          instructions: instructions || null,
          cookingTime: cookingTime || null,
          difficulty: difficulty || null,
          authorId: user.user.id,
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
        instructions: createdRecipe!.instructions,
        cookingTime: createdRecipe!.cookingTime,
        difficulty: createdRecipe!.difficulty,
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
        instructions: t.Optional(t.String()),
        cookingTime: t.Optional(t.Number()),
        difficulty: t.Optional(t.String()),
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

  // Обновить рецепт
  .put(
    '/api/recipes/:id',
    async ({ params, body, cookie }) => {
      const user = await requireAuth({ cookie })
      const id = parseInt(params.id)
      const { name, calories, proteins, fats, carbohydrates, instructions, cookingTime, difficulty, ingredients } = body

      // Проверяем, существует ли рецепт и принадлежит ли он пользователю
      const existingRecipe = await prisma.recipe.findUnique({
        where: { 
          id,
          authorId: user.user.id, // Только рецепты пользователя
        },
      })

      if (!existingRecipe) {
        throw new Error('Recipe not found')
      }

      // Обновляем рецепт
      await prisma.recipe.update({
        where: { id },
        data: {
          name,
          calories,
          proteins,
          fats,
          carbohydrates,
          instructions: instructions || null,
          cookingTime: cookingTime || null,
          difficulty: difficulty || null,
        },
      })

      // Получаем текущие связи с ингредиентами
      const existingRecipeIngredients = await prisma.recipeIngredient.findMany({
        where: { recipeId: id },
        include: { ingredient: true },
      })

      // Создаем или обновляем ингредиенты и их связи
      for (const ing of ingredients) {
        // Создаем или находим ингредиент
        const ingredient = await prisma.ingredient.upsert({
          where: { name: ing.name },
          update: {
            amountType: ing.amountType, // Обновляем единицы измерения если изменились
          },
          create: {
            name: ing.name,
            amountType: ing.amountType,
          },
        })

        // Ищем существующую связь
        const existingLink = existingRecipeIngredients.find((link) => link.ingredient.name === ing.name)

        if (existingLink) {
          // Обновляем существующую связь
          await prisma.recipeIngredient.update({
            where: { id: existingLink.id },
            data: {
              amount: ing.amount,
            },
          })
        } else {
          // Создаем новую связь
          await prisma.recipeIngredient.create({
            data: {
              recipeId: id,
              ingredientId: ingredient.id,
              amount: ing.amount,
            },
          })
        }
      }

      // Удаляем связи с ингредиентами, которых больше нет в рецепте
      const currentIngredientNames = ingredients.map((ing) => ing.name)
      const ingredientsToRemove = existingRecipeIngredients.filter(
        (link) => !currentIngredientNames.includes(link.ingredient.name)
      )

      if (ingredientsToRemove.length > 0) {
        await prisma.recipeIngredient.deleteMany({
          where: {
            id: { in: ingredientsToRemove.map((link) => link.id) },
          },
        })
      }

      // Возвращаем обновленный рецепт с ингредиентами
      const updatedRecipe = await prisma.recipe.findUnique({
        where: { id },
        include: {
          ingredients: {
            include: {
              ingredient: true,
            },
          },
        },
      })

      return {
        id: updatedRecipe!.id,
        name: updatedRecipe!.name,
        calories: updatedRecipe!.calories,
        proteins: updatedRecipe!.proteins,
        fats: updatedRecipe!.fats,
        carbohydrates: updatedRecipe!.carbohydrates,
        instructions: updatedRecipe!.instructions,
        cookingTime: updatedRecipe!.cookingTime,
        difficulty: updatedRecipe!.difficulty,
        ingredients: updatedRecipe!.ingredients.map((ri) => ({
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
        instructions: t.Optional(t.String()),
        cookingTime: t.Optional(t.Number()),
        difficulty: t.Optional(t.String()),
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

  // Удалить рецепт
  .delete('/api/recipes/:id', async ({ params, cookie }) => {
    const user = await requireAuth({ cookie })
    const id = parseInt(params.id)

    // Проверяем, существует ли рецепт и принадлежит ли он пользователю
    const existingRecipe = await prisma.recipe.findUnique({
      where: { 
        id,
        authorId: user.user.id, // Только рецепты пользователя
      },
    })

    if (!existingRecipe) {
      throw new Error('Recipe not found')
    }

    // Удаляем связи с ингредиентами
    await prisma.recipeIngredient.deleteMany({
      where: { recipeId: id },
    })

    // Удаляем рецепт из календаря
    await prisma.calendarItem.deleteMany({
      where: { recipeId: id },
    })

    // Удаляем рецепт
    await prisma.recipe.delete({
      where: { id },
    })

    return { deleted: true }
  })

  // Получить все ингредиенты
  .get('/api/ingredients', async ({ cookie }) => {
    const user = await requireAuth({ cookie })
    
    // Получаем только ингредиенты, которые используются в рецептах пользователя
    const userRecipeIngredients = await prisma.recipeIngredient.findMany({
      where: {
        recipe: {
          authorId: user.user.id, // Только из рецептов пользователя
        },
      },
      include: {
        ingredient: true,
      },
      distinct: ['ingredientId'], // Убираем дубликаты
    })

    return userRecipeIngredients.map(ri => ri.ingredient)
  })

  // Создать новый ингредиент
  .post(
    '/api/ingredients',
    async ({ body, cookie }) => {
      const user = await requireAuth({ cookie })
      const { name, amountType } = body

      // Создаем ингредиент (ингредиенты общие, но создаются пользователем)
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

  // Удалить ингредиент
  .delete('/api/ingredients/:id', async ({ params, cookie }) => {
    const user = await requireAuth({ cookie })
    const id = parseInt(params.id)

    // Проверяем, используется ли ингредиент в рецептах пользователя
    const userRecipeIngredients = await prisma.recipeIngredient.findMany({
      where: { 
        ingredientId: id,
        recipe: {
          authorId: user.user.id,
        },
      },
    })

    if (userRecipeIngredients.length > 0) {
      throw new Error('Нельзя удалить ингредиент, который используется в ваших рецептах')
    }

    // Удаляем ингредиент и связанные записи о наличии
    await prisma.stockItem.deleteMany({
      where: { ingredientId: id },
    })

    await prisma.ingredient.delete({
      where: { id },
    })

    return { deleted: true }
  })

  // Получить корзину
  .get('/api/cart', async ({ cookie }) => {
    await requireAuth({ cookie })
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
    async ({ body, cookie }) => {
      await requireAuth({ cookie })
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
    async ({ params, body, cookie }) => {
      await requireAuth({ cookie })
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
  .delete('/api/cart/:id', async ({ params, cookie }) => {
    await requireAuth({ cookie })
    await prisma.cartItem.delete({
      where: { id: parseInt(params.id) },
    })
    return { deleted: true }
  })

  // Очистить корзину
  .delete('/api/cart', async ({ cookie }) => {
    await requireAuth({ cookie })
    await prisma.cartItem.deleteMany()
    return { deleted: true }
  })

  // Получить наличие ингредиентов
  .get('/api/stock', async ({ cookie }) => {
    const user = await requireAuth({ cookie })
    
    // Получаем только ингредиенты, которые используются в рецептах пользователя
    const userRecipeIngredients = await prisma.recipeIngredient.findMany({
      where: {
        recipe: {
          authorId: user.user.id, // Только из рецептов пользователя
        },
      },
      select: {
        ingredientId: true,
      },
      distinct: ['ingredientId'], // Убираем дубликаты
    })

    const userIngredientIds = userRecipeIngredients.map(ri => ri.ingredientId)

    // Получаем наличие только для этих ингредиентов
    return await prisma.stockItem.findMany({
      where: {
        ingredientId: {
          in: userIngredientIds,
        },
      },
      include: {
        ingredient: true,
      },
    })
  })

  // Обновить наличие ингредиента
  .put(
    '/api/stock/:ingredientId',
    async ({ params, body, cookie }) => {
      const user = await requireAuth({ cookie })
      const { amount } = body
      const ingredientId = parseInt(params.ingredientId)

      // Проверяем, что ингредиент используется в рецептах пользователя
      const userRecipeIngredient = await prisma.recipeIngredient.findFirst({
        where: {
          ingredientId,
          recipe: {
            authorId: user.user.id,
          },
        },
      })

      if (!userRecipeIngredient) {
        throw new Error('Ингредиент не найден в ваших рецептах')
      }

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

  // Получить список покупок для конкретной даты
  .get('/api/shopping-list', async ({ query, cookie }) => {
    const user = await requireAuth({ cookie })

    // Получаем дату из query параметров, по умолчанию сегодня
    const dateParam = query.date
    const targetDate = dateParam ? new Date(dateParam) : new Date()
    const dateString = targetDate.toISOString().split('T')[0]

    // Получаем рецепты из календаря на указанную дату для конкретного пользователя
    const calendarItems = await prisma.calendarItem.findMany({
      where: {
        userId: user.user.id,
        date: {
          gte: new Date(dateString + 'T00:00:00Z'),
          lt: new Date(dateString + 'T23:59:59Z'),
        },
      },
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

    calendarItems.forEach((item) => {
      item.recipe.ingredients.forEach((ri) => {
        const key = ri.ingredient.name
        const current = neededIngredients.get(key) || {
          amount: 0,
          amountType: ri.ingredient.amountType,
        }
        neededIngredients.set(key, {
          amount: current.amount + ri.amount,
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
          neededIngredients.set(key, {
            amount: remaining,
            amountType: needed.amountType,
          })
        } else {
          neededIngredients.delete(key)
        }
      }
    })

    return {
      items: Array.from(neededIngredients.entries()).map(([name, data]) => ({
        name,
        amount: data.amount,
        amountType: data.amountType,
      })),
      date: dateString,
      recipes: calendarItems.map((item) => ({
        id: item.recipe.id,
        name: item.recipe.name,
        mealType: item.mealType,
      })),
    }
  })

  // Получить календарь планирования
  .get('/api/calendar', async ({ cookie }) => {
    const user = await requireAuth({ cookie })
    const calendarItems = await prisma.calendarItem.findMany({
      where: {
        userId: user.user.id,
      },
      include: {
        recipe: true,
      },
      orderBy: {
        date: 'asc',
      },
    })

    return calendarItems.map((item) => ({
      id: item.id,
      date: item.date,
      mealType: item.mealType,
      recipeId: item.recipeId,
      userId: item.userId,
      recipe: {
        id: item.recipe.id,
        name: item.recipe.name,
        calories: item.recipe.calories,
        proteins: item.recipe.proteins,
        fats: item.recipe.fats,
        carbohydrates: item.recipe.carbohydrates,
      },
    }))
  })

  // Добавить рецепт в календарь
  .post(
    '/api/calendar',
    async ({ body, cookie }) => {
      const user = await requireAuth({ cookie })
      const { date, recipeId, mealType } = body

      // Проверяем, есть ли уже рецепт на эту дату для этого приема пищи
      const existingItem = await prisma.calendarItem.findFirst({
        where: {
          date: new Date(date),
          recipeId,
          mealType,
          userId: user.user.id,
        },
      })

      if (existingItem) {
        throw new Error('Этот рецепт уже добавлен на эту дату для этого приема пищи')
      }

      const calendarItem = await prisma.calendarItem.create({
        data: {
          date: new Date(date),
          recipeId,
          mealType,
          userId: user.user.id,
        },
        include: {
          recipe: true,
        },
      })

      return {
        id: calendarItem.id,
        date: calendarItem.date,
        mealType: calendarItem.mealType,
        recipeId: calendarItem.recipeId,
        userId: calendarItem.userId,
        recipe: {
          id: calendarItem.recipe.id,
          name: calendarItem.recipe.name,
          calories: calendarItem.recipe.calories,
          proteins: calendarItem.recipe.proteins,
          fats: calendarItem.recipe.fats,
          carbohydrates: calendarItem.recipe.carbohydrates,
        },
      }
    },
    {
      body: t.Object({
        date: t.String(),
        recipeId: t.Number(),
        mealType: t.String(),
      }),
    }
  )

  // Удалить рецепт из календаря
  .delete('/api/calendar/:id', async ({ params, cookie }) => {
    const user = await requireAuth({ cookie })
    await prisma.calendarItem.delete({
      where: {
        id: parseInt(params.id),
        userId: user.user.id,
      },
    })
    return { deleted: true }
  })

  // Обновить элемент календаря (переместить на другую дату)
  .put(
    '/api/calendar/:id',
    async ({ params, body, cookie }) => {
      const user = await requireAuth({ cookie })
      const { date, mealType } = body
      const id = parseInt(params.id)

      // Проверяем, существует ли элемент календаря
      const existingItem = await prisma.calendarItem.findFirst({
        where: {
          id,
          userId: user.user.id,
        },
      })

      if (!existingItem) {
        throw new Error('Calendar item not found')
      }

      // Проверяем, есть ли уже рецепт на новую дату для этого приема пищи
      const conflictingItem = await prisma.calendarItem.findFirst({
        where: {
          date: new Date(date),
          recipeId: existingItem.recipeId,
          mealType: mealType || existingItem.mealType,
          userId: user.user.id,
          id: { not: id }, // Исключаем текущий элемент
        },
      })

      if (conflictingItem) {
        throw new Error('Этот рецепт уже добавлен на эту дату для этого приема пищи')
      }

      // Обновляем элемент календаря
      const updatedItem = await prisma.calendarItem.update({
        where: { id },
        data: {
          date: new Date(date),
          mealType: mealType || existingItem.mealType,
        },
        include: {
          recipe: true,
        },
      })

      return {
        id: updatedItem.id,
        date: updatedItem.date,
        mealType: updatedItem.mealType,
        recipeId: updatedItem.recipeId,
        userId: updatedItem.userId,
        recipe: {
          id: updatedItem.recipe.id,
          name: updatedItem.recipe.name,
          calories: updatedItem.recipe.calories,
          proteins: updatedItem.recipe.proteins,
          fats: updatedItem.recipe.fats,
          carbohydrates: updatedItem.recipe.carbohydrates,
        },
      }
    },
    {
      body: t.Object({
        date: t.String(),
        mealType: t.Optional(t.String()),
      }),
    }
  )

  // Добавить все рецепты из календаря в корзину
  .post('/api/calendar/add-to-cart', async ({ cookie }) => {
    const user = await requireAuth({ cookie })
    const calendarItems = await prisma.calendarItem.findMany({
      where: {
        userId: user.user.id,
      },
      include: {
        recipe: true,
      },
    })

    const results = []

    for (const item of calendarItems) {
      // Проверяем, есть ли уже этот рецепт в корзине
      const existingCartItem = await prisma.cartItem.findFirst({
        where: { recipeId: item.recipeId },
      })

      if (existingCartItem) {
        // Увеличиваем количество
        const updatedItem = await prisma.cartItem.update({
          where: { id: existingCartItem.id },
          data: { quantity: existingCartItem.quantity + 1 },
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
        results.push(updatedItem)
      } else {
        // Добавляем новый элемент
        const newItem = await prisma.cartItem.create({
          data: { recipeId: item.recipeId, quantity: 1 },
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
        results.push(newItem)
      }
    }

    return results
  })

  // Food Diary endpoints
  .get('/api/food-diary', async ({ cookie, query }) => {
    const user = await requireAuth({ cookie })
    const date = query.date

    const where: {
      userId: number
      date?: {
        gte: Date
        lt: Date
      }
    } = {
      userId: user.user.id,
    }

    if (date) {
      const startDate = new Date(date as string)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 1)

      where.date = {
        gte: startDate,
        lt: endDate,
      }
    }

    const foodDiaryEntries = await prisma.foodDiaryEntry.findMany({
      where,
      include: {
        recipe: true,
      },
      orderBy: {
        date: 'asc',
      },
    })

    return foodDiaryEntries.map((entry) => ({
      id: entry.id,
      date: entry.date,
      mealType: entry.mealType,
      recipeId: entry.recipeId,
      userId: entry.userId,
      servingSize: entry.servingSize,
      calories: entry.calories,
      proteins: entry.proteins,
      fats: entry.fats,
      carbohydrates: entry.carbohydrates,
      recipe: {
        id: entry.recipe.id,
        name: entry.recipe.name,
        calories: entry.recipe.calories,
        proteins: entry.recipe.proteins,
        fats: entry.recipe.fats,
        carbohydrates: entry.recipe.carbohydrates,
      },
    }))
  })

  .post(
    '/api/food-diary',
    async ({ body, cookie }) => {
      const user = await requireAuth({ cookie })
      const { date, recipeId, mealType, servingSize } = body

      // Получаем рецепт для расчета КБЖУ
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
      })

      if (!recipe) {
        throw new Error('Recipe not found')
      }

      const foodDiaryEntry = await prisma.foodDiaryEntry.create({
        data: {
          date: new Date(date),
          recipeId,
          mealType,
          servingSize,
          userId: user.user.id,
          calories: recipe.calories * servingSize,
          proteins: recipe.proteins * servingSize,
          fats: recipe.fats * servingSize,
          carbohydrates: recipe.carbohydrates * servingSize,
        },
        include: {
          recipe: true,
        },
      })

      return {
        id: foodDiaryEntry.id,
        date: foodDiaryEntry.date,
        mealType: foodDiaryEntry.mealType,
        recipeId: foodDiaryEntry.recipeId,
        userId: foodDiaryEntry.userId,
        servingSize: foodDiaryEntry.servingSize,
        calories: foodDiaryEntry.calories,
        proteins: foodDiaryEntry.proteins,
        fats: foodDiaryEntry.fats,
        carbohydrates: foodDiaryEntry.carbohydrates,
        recipe: {
          id: foodDiaryEntry.recipe.id,
          name: foodDiaryEntry.recipe.name,
          calories: foodDiaryEntry.recipe.calories,
          proteins: foodDiaryEntry.recipe.proteins,
          fats: foodDiaryEntry.recipe.fats,
          carbohydrates: foodDiaryEntry.recipe.carbohydrates,
        },
      }
    },
    {
      body: t.Object({
        date: t.String(),
        recipeId: t.Number(),
        mealType: t.String(),
        servingSize: t.Number(),
      }),
    }
  )

  .delete('/api/food-diary/:id', async ({ params, cookie }) => {
    const user = await requireAuth({ cookie })
    await prisma.foodDiaryEntry.delete({
      where: {
        id: parseInt(params.id),
        userId: user.user.id,
      },
    })
    return { deleted: true }
  })

  // Google OAuth endpoints
  .get('/api/auth/google/url', ({ request }) => {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = getRedirectUri(request)
    const scope = 'email profile'

    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID is not set')
    }

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri.toString())
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scope)
    authUrl.searchParams.set('access_type', 'offline')

    return { authUrl: authUrl.toString() }
  })

  .get('/api/auth/google/callback', async ({ query, request }) => {
    const { code } = query

    if (!code || typeof code !== 'string') {
      return new Response('Authorization code is required', { status: 400 })
    }
    const redirectUri = getRedirectUri(request)

    try {
      // Обмениваем код на access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri.toString(),
        }),
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token')
      }

      const tokenData = await tokenResponse.json()
      const { access_token } = tokenData

      // Получаем информацию о пользователе
      const userInfo = await getGoogleUserInfo(access_token)

      // Создаем или находим пользователя в базе данных
      const user = await findOrCreateUser(userInfo)

      // Создаем JWT токен
      const jwtToken = createJWT(user)

      // Делаем редирект на фронтенд с куками
      const cookieValue = `authToken=${jwtToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`

      const mainPageUrl = getRedirectUri(request)
      mainPageUrl.pathname = '/'
      if (mainPageUrl.hostname === 'localhost') {
        mainPageUrl.port = '5173'
      }

      return new Response(null, {
        status: 302,
        headers: {
          Location: mainPageUrl.toString(),
          'Set-Cookie': cookieValue,
        },
      })
    } catch (error) {
      console.error('OAuth error:', error)

      // Делаем редирект на фронтенд с ошибкой
      return new Response(null, {
        status: 302,
        headers: {
          Location: 'http://localhost:5173?auth=error',
        },
      })
    }
  })

  .get('/api/auth/me', async ({ cookie }) => {
    const token = cookie.authToken?.value

    if (!token || typeof token !== 'string') {
      return { authenticated: false }
    }

    const user = await getUserFromToken(token)

    if (!user) {
      return { authenticated: false }
    }

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    }
  })

  .post('/api/auth/logout', () => {
    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'authToken=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
      },
    })
  })

  // User Profile endpoints
  .get('/api/profile', async ({ cookie }) => {
    const user = await requireAuth({ cookie })

    const userProfile = await prisma.user.findUnique({
      where: { id: user.user.id },
    })

    if (!userProfile) {
      throw new Error('User not found')
    }

    return {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      picture: userProfile.picture,
      height: userProfile.height,
      weight: userProfile.weight,
      targetWeight: userProfile.targetWeight,
      dailyCalories: userProfile.dailyCalories,
      age: userProfile.age,
      gender: userProfile.gender,
      activityLevel: userProfile.activityLevel,
      goal: userProfile.goal,
    }
  })

  .put(
    '/api/profile',
    async ({ body, cookie }) => {
      const user = await requireAuth({ cookie })
      const { name, height, weight, targetWeight, dailyCalories, age, gender, activityLevel, goal } = body

      const updatedUser = await prisma.user.update({
        where: { id: user.user.id },
        data: {
          name: name || null,
          height: height || null,
          weight: weight || null,
          targetWeight: targetWeight || null,
          dailyCalories: dailyCalories || null,
          age: age || null,
          gender: gender || null,
          activityLevel: activityLevel || null,
          goal: goal || null,
        },
      })

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        picture: updatedUser.picture,
        height: updatedUser.height,
        weight: updatedUser.weight,
        targetWeight: updatedUser.targetWeight,
        dailyCalories: updatedUser.dailyCalories,
        age: updatedUser.age,
        gender: updatedUser.gender,
        activityLevel: updatedUser.activityLevel,
        goal: updatedUser.goal,
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        height: t.Optional(t.Number()),
        weight: t.Optional(t.Number()),
        targetWeight: t.Optional(t.Number()),
        dailyCalories: t.Optional(t.Number()),
        age: t.Optional(t.Number()),
        gender: t.Optional(t.String()),
        activityLevel: t.Optional(t.String()),
        goal: t.Optional(t.String()),
      }),
    }
  )

  // Получить общедоступные рецепты (без авторизации)
  .get('/api/public/recipes', async ({ query }) => {
    const { 
      search, 
      category, 
      maxCalories, 
      minCalories, 
      difficulty, 
      maxCookingTime,
      sortBy = 'name',
      sortOrder = 'asc'
    } = query

    // Построение условий фильтрации
    const where: any = {
      OR: [
        { authorId: null }, // Публичные рецепты
        { authorId: 1 }, // Рецепты Elizaveta Smirnova (ID: 1)
      ],
    }

    // Поиск по названию
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive'
      }
    }

    // Фильтр по калориям
    if (minCalories || maxCalories) {
      where.calories = {}
      if (minCalories) where.calories.gte = parseFloat(minCalories)
      if (maxCalories) where.calories.lte = parseFloat(maxCalories)
    }

    // Фильтр по сложности
    if (difficulty) {
      where.difficulty = difficulty
    }

    // Фильтр по времени приготовления
    if (maxCookingTime) {
      where.cookingTime = {
        lte: parseInt(maxCookingTime)
      }
    }

    // Определение сортировки
    const orderBy: any = {}
    if (sortBy === 'name') orderBy.name = sortOrder
    if (sortBy === 'calories') orderBy.calories = sortOrder
    if (sortBy === 'cookingTime') orderBy.cookingTime = sortOrder
    if (sortBy === 'difficulty') orderBy.difficulty = sortOrder

    const recipes = await prisma.recipe.findMany({
      where,
      orderBy,
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Фильтрация по категории (на основе калорий)
    let filteredRecipes = recipes
    if (category) {
      filteredRecipes = recipes.filter(recipe => {
        const calories = recipe.calories
        switch (category) {
          case 'low':
            return calories < 300
          case 'medium':
            return calories >= 300 && calories <= 600
          case 'high':
            return calories > 600
          default:
            return true
        }
      })
    }

    return filteredRecipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      calories: recipe.calories,
      proteins: recipe.proteins,
      fats: recipe.fats,
      carbohydrates: recipe.carbohydrates,
      instructions: recipe.instructions,
      cookingTime: recipe.cookingTime,
      difficulty: recipe.difficulty,
      authorId: recipe.authorId,
      author: recipe.author,
      ingredients: recipe.ingredients.map((ri) => ({
        name: ri.ingredient.name,
        amount: ri.amount,
        amountType: ri.ingredient.amountType,
      })),
    }))
  })

  // Обновить общедоступный рецепт (только для Elizaveta Smirnova)
  .put(
    '/api/public/recipes/:id',
    async ({ params, body, cookie }) => {
      const user = await checkPublicRecipeEditAccess({ cookie })
      const id = parseInt(params.id)

      // Проверяем, что рецепт существует и является общедоступным
      const existingRecipe = await prisma.recipe.findUnique({
        where: { id },
      })

      if (!existingRecipe) {
        throw new Error('Рецепт не найден')
      }

      // Разрешаем редактирование общедоступных рецептов и рецептов Elizaveta Smirnova
      if (existingRecipe.authorId !== null && existingRecipe.authorId !== 1) {
        throw new Error('Можно редактировать только общедоступные рецепты и рецепты Elizaveta Smirnova')
      }

      const { name, calories, proteins, fats, carbohydrates, instructions, cookingTime, difficulty } = body

      const updateData: any = {
        name,
        calories,
        proteins,
        fats,
        carbohydrates,
      }

      if (instructions !== undefined) updateData.instructions = instructions
      if (cookingTime !== undefined) updateData.cookingTime = cookingTime
      if (difficulty !== undefined) updateData.difficulty = difficulty

      const updatedRecipe = await prisma.recipe.update({
        where: { id },
        data: updateData,
        include: {
          ingredients: {
            include: {
              ingredient: true,
            },
          },
        },
      })

      return {
        id: updatedRecipe.id,
        name: updatedRecipe.name,
        calories: updatedRecipe.calories,
        proteins: updatedRecipe.proteins,
        fats: updatedRecipe.fats,
        carbohydrates: updatedRecipe.carbohydrates,
        instructions: updatedRecipe.instructions,
        cookingTime: updatedRecipe.cookingTime,
        difficulty: updatedRecipe.difficulty,
        authorId: updatedRecipe.authorId,
        ingredients: (updatedRecipe as any).ingredients.map((ri: any) => ({
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
        instructions: t.Optional(t.String()),
        cookingTime: t.Optional(t.Number()),
        difficulty: t.Optional(t.String()),
      }),
    }
  )

  // Удалить общедоступный рецепт (только для Elizaveta Smirnova)
  .delete('/api/public/recipes/:id', async ({ params, cookie }) => {
    const user = await checkPublicRecipeEditAccess({ cookie })
    const id = parseInt(params.id)

    // Проверяем, что рецепт существует и является общедоступным
    const existingRecipe = await prisma.recipe.findUnique({
      where: { id },
    })

    if (!existingRecipe) {
      throw new Error('Рецепт не найден')
    }

    // Разрешаем удаление общедоступных рецептов и рецептов Elizaveta Smirnova
    if (existingRecipe.authorId !== null && existingRecipe.authorId !== 1) {
      throw new Error('Можно удалять только общедоступные рецепты и рецепты Elizaveta Smirnova')
    }

    // Удаляем рецепт (каскадное удаление ингредиентов произойдет автоматически)
    await prisma.recipe.delete({
      where: { id },
    })

    return { deleted: true }
  })

  .listen(3000, ({ hostname, port }) => {
    console.log(`🦊 API сервер запущен на ${hostname}:${port}`)

    process.on('SIGINT', () => app.stop())
    process.on('SIGTERM', () => app.stop())
  })

// Экспортируем тип для Eden
export type App = typeof app

export default app
