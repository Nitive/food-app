interface Ingredients {
  name: string
  amount: number
  amountType: 'гр'
}

interface Recipe {
  id: number
  name: string
  calories: number
  proteins: number
  fats: number
  carbohydrates: number
  ingredients: Ingredients[]
}

export const recipes: Recipe[] = [
  {
    id: 1,
    name: 'Сырники',
    calories: 164,
    proteins: 14,
    fats: 4.6,
    carbohydrates: 16.9,
    ingredients: [
      { name: 'Творог 5%', amount: 720, amountType: 'гр' as const },
      { name: 'Яйцо', amount: 60, amountType: 'гр' as const },
      { name: 'Сахар', amount: 80, amountType: 'гр' as const },
      { name: 'Ванилин', amount: 1, amountType: 'гр' as const },
      { name: 'Манная крупа', amount: 65, amountType: 'гр' as const },
    ],
  },

  {
    id: 2,
    name: 'Блины',
    calories: 147,
    proteins: 5.5,
    fats: 3.8,
    carbohydrates: 22,
    ingredients: [
      { name: 'Молоко 3,2%', amount: 1000, amountType: 'гр' },
      { name: 'Яйцо', amount: 120, amountType: 'гр' },
      { name: 'Мука', amount: 380, amountType: 'гр' },
      { name: 'Соль', amount: 0, amountType: 'гр' }, // TODO
      { name: 'Подсолнечное масло', amount: 10, amountType: 'гр' },
    ],
  },
]
