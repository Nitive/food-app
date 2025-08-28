import { ActionIcon, Badge, Box, Drawer, Group, NavLink, Text } from '@mantine/core'
import { useStore } from '@nanostores/react'
import { ThreeBarsIcon } from '@primer/octicons-react'
import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { $calendarItems, $favoriteRecipes, $ingredients, $recipes, $shoppingList } from '../app.js'

interface NavigationItem {
  path: string
  icon: string
  label: string
  badge?: number
  color?: string
}

export function MainNavigation() {
  const location = useLocation()
  const recipes = useStore($recipes)
  const shoppingList = useStore($shoppingList)
  const calendarItems = useStore($calendarItems)
  const ingredients = useStore($ingredients)
  const favoriteRecipes = useStore($favoriteRecipes)
  const [mobileOpened, setMobileOpened] = React.useState(false)

  const navigationItems: NavigationItem[] = [
    {
      path: '/',
      icon: '📅',
      label: 'Календарь',
      badge: calendarItems.length,
      color: 'indigo',
    },
    {
      path: '/recipes',
      icon: '🏠',
      label: 'Рецепты',
      badge: recipes.length,
      color: 'teal',
    },
    {
      path: '/public-recipes',
      icon: '🌍',
      label: 'Общедоступные рецепты',
      color: 'blue',
    },
    {
      path: '/favorites',
      icon: '❤️',
      label: 'Сохраненные рецепты',
      badge: favoriteRecipes.length,
      color: 'pink',
    },
    {
      path: '/shopping-list',
      icon: '📋',
      label: 'Список покупок',
      badge: shoppingList.items.length,
      color: 'amber',
    },
    {
      path: '/food-diary',
      icon: '📝',
      label: 'Дневник питания',
      color: 'lime',
    },
    {
      path: '/ingredients',
      icon: '📦',
      label: 'Ингредиенты',
      badge: ingredients.length,
      color: 'slate',
    },
    {
      path: '/stats',
      icon: '📊',
      label: 'Статистика',
      color: 'rose',
    },
  ]

  const NavigationContent = () => (
    <>
      <Box mb="md">
        <Link to="/" style={{ textDecoration: 'none' }} onClick={() => setMobileOpened(false)}>
          <Text
            size="lg"
            fw={700}
            mb="md"
            c="teal"
            style={{
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                color: 'var(--mantine-color-teal-7)',
                transform: 'scale(1.02)',
              },
            }}
          >
            🍽️ Food App
          </Text>
        </Link>
      </Box>

      <Box style={{ flex: 1 }}>
        {navigationItems.map((item) => (
          <NavLink
            key={item.path}
            component={Link}
            to={item.path}
            label={
              <Group justify="space-between" w="100%">
                <Text size="sm">{item.label}</Text>
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge size="xs" color={item.color || 'teal'} variant="light">
                    {item.badge}
                  </Badge>
                )}
              </Group>
            }
            leftSection={<span style={{ fontSize: '16px' }}>{item.icon}</span>}
            active={location.pathname === item.path}
            variant="light"
            color={item.color || 'teal'}
            style={{
              marginBottom: '4px',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
            }}
            onClick={() => setMobileOpened(false)}
          />
        ))}
      </Box>

      <Box>
        <Box
          p="xs"
          style={{
            backgroundColor: 'var(--mantine-color-gray-0)',
            borderRadius: '8px',
            border: '1px solid var(--mantine-color-gray-2)',
          }}
        >
          <Text size="xs" c="dimmed" ta="center">
            Версия 1.0.0
          </Text>
        </Box>
      </Box>
    </>
  )

  return (
    <>
      {/* Десктопная навигация */}
      <Box
        w={240}
        p="md"
        style={{
          borderRight: '1px solid var(--mantine-color-gray-3)',
          display: 'none',
        }}
        className="desktop-navigation"
      >
        <NavigationContent />
      </Box>

      {/* Мобильная кнопка меню */}
      <Box
        className="mobile-menu-button"
        style={{
          position: 'fixed',
          top: '15px',
          left: '15px',
          zIndex: 1000,
        }}
      >
        <ActionIcon
          variant="filled"
          color="teal"
          size="xl"
          onClick={() => setMobileOpened(true)}
          style={{
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            width: '48px',
            height: '48px',
          }}
        >
          <ThreeBarsIcon size={24} />
        </ActionIcon>
      </Box>

      {/* Мобильная навигация в Drawer */}
      <Drawer
        opened={mobileOpened}
        onClose={() => setMobileOpened(false)}
        title={
          <Link to="/" style={{ textDecoration: 'none', color: 'white' }} onClick={() => setMobileOpened(false)}>
            🍽️ Food App
          </Link>
        }
        size="280px"
        overlayProps={{ opacity: 0.5, blur: 4 }}
        styles={{
          header: {
            backgroundColor: 'var(--mantine-color-teal-6)',
            color: 'white',
            cursor: 'pointer',
          },
        }}
      >
        <Box p="md">
          <NavigationContent />
        </Box>
      </Drawer>
    </>
  )
}
