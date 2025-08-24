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

  async getIngredients(): Promise<Ingredient[]> {
    const { data } = await client.api.ingredients.get()
    return data || []
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
  }
}
