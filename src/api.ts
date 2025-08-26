import { node } from '@elysiajs/node';
import { cors } from '@elysiajs/cors';
import { cookie } from '@elysiajs/cookie';
import { staticPlugin } from '@elysiajs/static';
import { Elysia, t } from 'elysia';
import { PrismaClient } from '@prisma/client';
import {
  getGoogleUserInfo,
  findOrCreateUser,
  createJWT,
  getUserFromToken,
  verifyJWT,
} from './auth.js';
import { requireAuth, type AuthenticatedContext } from './middleware.js';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { compress } from 'hono/compress';
import fsp from 'node:fs/promises';
import * as mime from 'mime-types';

const prisma = new PrismaClient();

const app = new Elysia({ adapter: node() as any })
  .get('/*', async () => {
    const indexFile = await fsp.readFile('./dist/client/index.html', 'utf-8');
    return new Response(indexFile, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  })
  .get('/assets/*', async ({ path }) => {
    const assetFile = await fsp.readFile(`./dist/client${path}`, 'utf-8');

    return new Response(assetFile, {
      status: 200,
      headers: {
        'Content-Type': mime.lookup(path) || 'application/octet-stream',
      },
    });
  })
  .use(cookie())
  .use(
    cors({
      origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
      exposeHeaders: ['Set-Cookie'],
    })
  )
  // Получить все рецепты
  .get('/api/recipes', async ({ cookie }) => {
    await requireAuth({ cookie });

    const recipes = await prisma.recipe.findMany({
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    return recipes.map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      calories: recipe.calories,
      proteins: recipe.proteins,
      fats: recipe.fats,
      carbohydrates: recipe.carbohydrates,
      instructions: recipe.instructions,
      cookingTime: recipe.cookingTime,
      difficulty: recipe.difficulty,
      ingredients: recipe.ingredients.map(ri => ({
        name: ri.ingredient.name,
        amount: ri.amount,
        amountType: ri.ingredient.amountType,
      })),
    }));
  })

  // Получить рецепт по ID
  .get('/api/recipes/:id', async ({ params, cookie }) => {
    await requireAuth({ cookie });
    const recipe = await prisma.recipe.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!recipe) {
      throw new Error('Recipe not found');
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
      ingredients: recipe.ingredients.map(ri => ({
        name: ri.ingredient.name,
        amount: ri.amount,
        amountType: ri.ingredient.amountType,
      })),
    };
  })

  // Создать новый рецепт
  .post(
    '/api/recipes',
    async ({ body, cookie }) => {
      await requireAuth({ cookie });
      const {
        name,
        calories,
        proteins,
        fats,
        carbohydrates,
        instructions,
        cookingTime,
        difficulty,
        ingredients,
      } = body;

      // Создаем рецепт
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
        },
      });

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
        });

        // Связываем ингредиент с рецептом
        await prisma.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            ingredientId: ingredient.id,
            amount: ing.amount,
          },
        });
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
      });

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
        ingredients: createdRecipe!.ingredients.map(ri => ({
          name: ri.ingredient.name,
          amount: ri.amount,
          amountType: ri.ingredient.amountType,
        })),
      };
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

  // Получить все ингредиенты
  .get('/api/ingredients', async ({ cookie }) => {
    await requireAuth({ cookie });
    return await prisma.ingredient.findMany();
  })

  // Создать новый ингредиент
  .post(
    '/api/ingredients',
    async ({ body, cookie }) => {
      await requireAuth({ cookie });
      const { name, amountType } = body;

      const ingredient = await prisma.ingredient.create({
        data: {
          name,
          amountType,
        },
      });

      return ingredient;
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
    await requireAuth({ cookie });
    const id = parseInt(params.id);

    // Проверяем, используется ли ингредиент в рецептах
    const recipeIngredients = await prisma.recipeIngredient.findMany({
      where: { ingredientId: id },
    });

    if (recipeIngredients.length > 0) {
      throw new Error(
        'Нельзя удалить ингредиент, который используется в рецептах'
      );
    }

    // Удаляем ингредиент и связанные записи о наличии
    await prisma.stockItem.deleteMany({
      where: { ingredientId: id },
    });

    await prisma.ingredient.delete({
      where: { id },
    });

    return { deleted: true };
  })

  // Получить корзину
  .get('/api/cart', async ({ cookie }) => {
    await requireAuth({ cookie });
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
    });

    return cartItems.map(item => ({
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
        ingredients: item.recipe.ingredients.map(ri => ({
          name: ri.ingredient.name,
          amount: ri.amount,
          amountType: ri.ingredient.amountType,
        })),
      },
    }));
  })

  // Добавить в корзину
  .post(
    '/api/cart',
    async ({ body, cookie }) => {
      await requireAuth({ cookie });
      const { recipeId } = body;

      // Проверяем, есть ли уже этот рецепт в корзине
      const existingItem = await prisma.cartItem.findFirst({
        where: { recipeId },
      });

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
        });
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
        });
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
      await requireAuth({ cookie });
      const { quantity } = body;

      if (quantity <= 0) {
        // Удаляем элемент
        await prisma.cartItem.delete({
          where: { id: parseInt(params.id) },
        });
        return { deleted: true };
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
        });
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
    await requireAuth({ cookie });
    await prisma.cartItem.delete({
      where: { id: parseInt(params.id) },
    });
    return { deleted: true };
  })

  // Очистить корзину
  .delete('/api/cart', async ({ cookie }) => {
    await requireAuth({ cookie });
    await prisma.cartItem.deleteMany();
    return { deleted: true };
  })

  // Получить наличие ингредиентов
  .get('/api/stock', async ({ cookie }) => {
    await requireAuth({ cookie });
    return await prisma.stockItem.findMany({
      include: {
        ingredient: true,
      },
    });
  })

  // Обновить наличие ингредиента
  .put(
    '/api/stock/:ingredientId',
    async ({ params, body, cookie }) => {
      await requireAuth({ cookie });
      const { amount } = body;
      const ingredientId = parseInt(params.ingredientId);

      if (amount <= 0) {
        // Удаляем запись о наличии
        await prisma.stockItem.deleteMany({
          where: { ingredientId },
        });
        return { deleted: true };
      } else {
        // Обновляем или создаем запись
        return await prisma.stockItem.upsert({
          where: { ingredientId },
          update: { amount },
          create: { ingredientId, amount },
          include: {
            ingredient: true,
          },
        });
      }
    },
    {
      body: t.Object({
        amount: t.Number(),
      }),
    }
  )

  // Получить список покупок
  .get('/api/shopping-list', async ({ cookie }) => {
    await requireAuth({ cookie });
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
    });

    const stockItems = await prisma.stockItem.findMany({
      include: {
        ingredient: true,
      },
    });

    // Собираем все необходимые ингредиенты
    const neededIngredients = new Map<
      string,
      { amount: number; amountType: string }
    >();

    cartItems.forEach(item => {
      item.recipe.ingredients.forEach(ri => {
        const key = ri.ingredient.name;
        const current = neededIngredients.get(key) || {
          amount: 0,
          amountType: ri.ingredient.amountType,
        };
        neededIngredients.set(key, {
          amount: current.amount + ri.amount * item.quantity,
          amountType: ri.ingredient.amountType,
        });
      });
    });

    // Вычитаем имеющиеся ингредиенты
    stockItems.forEach(stock => {
      const key = stock.ingredient.name;
      const needed = neededIngredients.get(key);
      if (needed) {
        const remaining = Math.max(0, needed.amount - stock.amount);
        if (remaining > 0) {
          neededIngredients.set(key, {
            amount: remaining,
            amountType: needed.amountType,
          });
        } else {
          neededIngredients.delete(key);
        }
      }
    });

    return Array.from(neededIngredients.entries()).map(([name, data]) => ({
      name,
      amount: data.amount,
      amountType: data.amountType,
    }));
  })

  // Получить календарь планирования
  .get('/api/calendar', async ({ cookie }) => {
    await requireAuth({ cookie });
    const calendarItems = await prisma.calendarItem.findMany({
      include: {
        recipe: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    return calendarItems.map(item => ({
      id: item.id,
      date: item.date,
      mealType: item.mealType,
      recipeId: item.recipeId,
      recipe: {
        id: item.recipe.id,
        name: item.recipe.name,
        calories: item.recipe.calories,
        proteins: item.recipe.proteins,
        fats: item.recipe.fats,
        carbohydrates: item.recipe.carbohydrates,
      },
    }));
  })

  // Добавить рецепт в календарь
  .post(
    '/api/calendar',
    async ({ body, cookie }) => {
      await requireAuth({ cookie });
      const { date, recipeId, mealType } = body;

      // Проверяем, есть ли уже рецепт на эту дату для этого приема пищи
      const existingItem = await prisma.calendarItem.findFirst({
        where: {
          date: new Date(date),
          recipeId,
          mealType,
        },
      });

      if (existingItem) {
        throw new Error(
          'Этот рецепт уже добавлен на эту дату для этого приема пищи'
        );
      }

      const calendarItem = await prisma.calendarItem.create({
        data: {
          date: new Date(date),
          recipeId,
          mealType,
        },
        include: {
          recipe: true,
        },
      });

      return {
        id: calendarItem.id,
        date: calendarItem.date,
        mealType: calendarItem.mealType,
        recipeId: calendarItem.recipeId,
        recipe: {
          id: calendarItem.recipe.id,
          name: calendarItem.recipe.name,
          calories: calendarItem.recipe.calories,
          proteins: calendarItem.recipe.proteins,
          fats: calendarItem.recipe.fats,
          carbohydrates: calendarItem.recipe.carbohydrates,
        },
      };
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
    await requireAuth({ cookie });
    await prisma.calendarItem.delete({
      where: { id: parseInt(params.id) },
    });
    return { deleted: true };
  })

  // Добавить все рецепты из календаря в корзину
  .post('/api/calendar/add-to-cart', async ({ cookie }) => {
    await requireAuth({ cookie });
    const calendarItems = await prisma.calendarItem.findMany({
      include: {
        recipe: true,
      },
    });

    const results = [];

    for (const item of calendarItems) {
      // Проверяем, есть ли уже этот рецепт в корзине
      const existingCartItem = await prisma.cartItem.findFirst({
        where: { recipeId: item.recipeId },
      });

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
        });
        results.push(updatedItem);
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
        });
        results.push(newItem);
      }
    }

    return results;
  })

  // Google OAuth endpoints
  .get('/api/auth/google/url', () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = 'http://localhost:3000/api/auth/google/callback';
    const scope = 'email profile';

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline`;

    return { authUrl };
  })

  .get('/api/auth/google/callback', async ({ query }) => {
    const { code } = query;

    if (!code || typeof code !== 'string') {
      return new Response('Authorization code is required', { status: 400 });
    }

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
          redirect_uri: 'http://localhost:3000/api/auth/google/callback',
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const tokenData = await tokenResponse.json();
      const { access_token } = tokenData;

      // Получаем информацию о пользователе
      const userInfo = await getGoogleUserInfo(access_token);

      // Создаем или находим пользователя в базе данных
      const user = await findOrCreateUser(userInfo);

      // Создаем JWT токен
      const jwtToken = createJWT(user);

      // Делаем редирект на фронтенд с куками
      const cookieValue = `authToken=${jwtToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`;

      return new Response(null, {
        status: 302,
        headers: {
          Location: 'http://localhost:5173?auth=success',
          'Set-Cookie': cookieValue,
        },
      });
    } catch (error) {
      console.error('OAuth error:', error);

      // Делаем редирект на фронтенд с ошибкой
      return new Response(null, {
        status: 302,
        headers: {
          Location: 'http://localhost:5173?auth=error',
        },
      });
    }
  })

  .get('/api/auth/me', async ({ headers, cookie }) => {
    const token = cookie.authToken?.value;

    if (!token || typeof token !== 'string') {
      return { authenticated: false };
    }

    const user = await getUserFromToken(token);

    if (!user) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    };
  })

  .post('/api/auth/logout', () => {
    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'authToken=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
      },
    });
  })
  .listen(3000, ({ hostname, port }) => {
    console.log(`🦊 API сервер запущен на ${hostname}:${port}`);

    process.on('SIGINT', () => app.stop());
    process.on('SIGTERM', () => app.stop());
  });

// Экспортируем тип для Eden
export type App = typeof app;

export default app;
