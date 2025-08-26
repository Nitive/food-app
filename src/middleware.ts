import { getUserFromToken } from './auth.js'

export interface AuthenticatedContext {
  user: {
    id: number
    email: string
    name?: string | null
    picture?: string | null
  }
}

// Middleware для проверки авторизации
export async function requireAuth({ cookie }: { cookie: any }): Promise<AuthenticatedContext> {
  const token = cookie.authToken?.value
  
  if (!token || typeof token !== 'string') {
    throw new Error('Unauthorized: No token provided')
  }

  const user = await getUserFromToken(token)
  
  if (!user) {
    throw new Error('Unauthorized: Invalid token')
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    }
  }
}
