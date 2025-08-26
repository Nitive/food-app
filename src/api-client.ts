import { treaty } from '@elysiajs/eden'
import type { App } from './api.js'

const client = treaty<App>('http://localhost:3000')

export interface Recipe {
  id: number
  name: string
  calories: number
  proteins: number
  fats: number
  carbohydrates: number
  instructions?: string | null
  cookingTime?: number | null
  difficulty?: string | null
  ingredients: {
    name: string
    amount: number
    amountType: string
  }[]
}

export interface CartItem {
  id: number
  recipeId: number
  quantity: number
  recipe: Recipe
}

export interface Ingredient {
  id: number
  name: string
  amountType: string
}

export interface StockItem {
  id: number
  ingredientId: number
  amount: number
  ingredient: Ingredient
}

export interface ShoppingListItem {
  name: string
  amount: number
  amountType: string
}

export interface CalendarItem {
  id: number
  date: Date
  recipeId: number
  recipe: {
    id: number
    name: string
    calories: number
    proteins: number
    fats: number
    carbohydrates: number
  }
}

export interface User {
  id: number
  email: string
  name?: string | null
  picture?: string | null
}

export interface AuthResponse {
  success: boolean
  token?: string
  user?: User
  error?: string
}

export interface AuthMeResponse {
  authenticated: boolean
  user?: User
}

export const apiClient = {
  async getRecipes(): Promise<Recipe[]> {
    const { data } = await client.api.recipes.get()
    return data || []
  },

  async getRecipe(id: number): Promise<Recipe> {
    const { data } = await client.api.recipes({ id }).get()
    if (!data) throw new Error('Recipe not found')
    return data
  },

  async createRecipe(recipeData: {
    name: string
    calories: number
    proteins: number
    fats: number
    carbohydrates: number
    ingredients: { name: string; amount: number; amountType: string }[]
  }): Promise<Recipe> {
    const { data } = await client.api.recipes.post(recipeData)
    if (!data) throw new Error('Failed to create recipe')
    return data as unknown as Recipe
  },

  async getIngredients(): Promise<Ingredient[]> {
    const { data } = await client.api.ingredients.get()
    return data || []
  },

  async createIngredient(ingredientData: { name: string; amountType: string }): Promise<Ingredient> {
    const { data } = await client.api.ingredients.post(ingredientData)
    if (!data) throw new Error('Failed to create ingredient')
    return data as unknown as Ingredient
  },

  async deleteIngredient(id: number): Promise<{ deleted: boolean }> {
    const { data } = await client.api.ingredients({ id }).delete()
    if (!data) throw new Error('Failed to delete ingredient')
    return data as unknown as { deleted: boolean }
  },

  async getCart(): Promise<CartItem[]> {
    const { data } = await client.api.cart.get()
    return data || []
  },

  async addToCart(recipeId: number): Promise<CartItem> {
    const { data } = await client.api.cart.post({ recipeId })
    if (!data) throw new Error('Failed to add to cart')
    return data as unknown as CartItem
  },

  async updateCartItem(id: number, quantity: number): Promise<CartItem | { deleted: boolean }> {
    const { data } = await client.api.cart({ id }).put({ quantity })
    if (!data) throw new Error('Failed to update cart item')
    return data as unknown as CartItem | { deleted: boolean }
  },

  async removeFromCart(id: number): Promise<{ deleted: boolean }> {
    const { data } = await client.api.cart({ id }).delete()
    if (!data) throw new Error('Failed to remove from cart')
    return data as unknown as { deleted: boolean }
  },

  async clearCart(): Promise<{ deleted: boolean }> {
    const { data } = await client.api.cart.delete()
    if (!data) throw new Error('Failed to clear cart')
    return data as unknown as { deleted: boolean }
  },

  async getStock(): Promise<StockItem[]> {
    const { data } = await client.api.stock.get()
    return data || []
  },

  async updateStock(ingredientId: number, amount: number): Promise<StockItem | { deleted: boolean }> {
    const { data } = await client.api.stock({ ingredientId }).put({ amount })
    if (!data) throw new Error('Failed to update stock')
    return data as unknown as StockItem | { deleted: boolean }
  },

  async getShoppingList(): Promise<ShoppingListItem[]> {
    const { data } = await client.api['shopping-list'].get()
    return data || []
  },

  async getCalendar(): Promise<CalendarItem[]> {
    const { data } = await client.api.calendar.get()
    return data || []
  },

  async addToCalendar(date: string, recipeId: number): Promise<CalendarItem> {
    const { data } = await client.api.calendar.post({ date, recipeId })
    if (!data) throw new Error('Failed to add to calendar')
    return data as unknown as CalendarItem
  },

  async removeFromCalendar(id: number): Promise<{ deleted: boolean }> {
    const { data } = await client.api.calendar({ id }).delete()
    if (!data) throw new Error('Failed to remove from calendar')
    return data as unknown as { deleted: boolean }
  },

  async addCalendarToCart(): Promise<CartItem[]> {
    const { data } = await client.api.calendar['add-to-cart'].post()
    if (!data) throw new Error('Failed to add calendar to cart')
    return data as unknown as CartItem[]
  },

  // Auth functions
  async getGoogleAuthUrl(): Promise<{ authUrl: string }> {
    const { data } = await client.api.auth.google.url.get()
    if (!data) throw new Error('Failed to get auth URL')
    return data
  },

  async googleAuthCallback(code: string): Promise<AuthResponse> {
    const { data } = await client.api.auth.google.callback.post({ code })
    if (!data) throw new Error('Failed to authenticate')
    return data as unknown as AuthResponse
  },

  async getMe(): Promise<AuthMeResponse> {
    const token = localStorage.getItem('authToken')
    if (!token) {
      return { authenticated: false }
    }

    const { data } = await client.api.auth.me.get({
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    return data || { authenticated: false }
  },

  async logout(): Promise<{ success: boolean }> {
    const { data } = await client.api.auth.logout.post()
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    return data || { success: true }
  },
}
