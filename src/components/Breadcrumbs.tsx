import React from 'react'
import { Breadcrumbs as MantineBreadcrumbs, Anchor, Text } from '@mantine/core'
import { Link, useLocation } from 'react-router-dom'

interface BreadcrumbItem {
  label: string
  path?: string
  icon?: string
}

export function Breadcrumbs() {
  const location = useLocation()

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    
    if (pathSegments.length === 0) {
      return [{ label: 'Главная', icon: '🏠' }]
    }

    const breadcrumbs: BreadcrumbItem[] = []
    let currentPath = ''

    // Добавляем главную страницу
    breadcrumbs.push({ label: 'Главная', path: '/', icon: '🏠' })

    pathSegments.forEach((segment: string, index: number) => {
      currentPath += `/${segment}`
      
      // Определяем метку для сегмента
      let label = segment
      let icon = ''

      switch (segment) {
        case 'recipes':
          label = 'Рецепты'
          icon = '🏠'
          break
        case 'cart':
          label = 'Корзина'
          icon = '🛒'
          break
        case 'shopping-list':
          label = 'Список покупок'
          icon = '📋'
          break
        case 'calendar':
          label = 'Календарь'
          icon = '📅'
          break
        case 'ingredients':
          label = 'Ингредиенты'
          icon = '📦'
          break
        case 'stats':
          label = 'Статистика'
          icon = '📊'
          break
        case 'recipe':
          label = 'Рецепт'
          icon = '🍽️'
          break
        default:
          // Если это ID рецепта, показываем "Рецепт"
          if (pathSegments[index - 1] === 'recipe') {
            label = 'Детали рецепта'
            icon = '🍽️'
          }
          break
      }

      // Последний элемент не является ссылкой
      const isLast = index === pathSegments.length - 1
      
      breadcrumbs.push({
        label: `${icon} ${label}`,
        ...(isLast ? {} : { path: currentPath })
      })
    })

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  const items = breadcrumbs.map((item, index) => {
    if (item.path) {
      return (
        <Anchor
          key={index}
          component={Link}
          to={item.path}
          size="sm"
          c="teal"
          style={{ textDecoration: 'none' }}
        >
          {item.label}
        </Anchor>
      )
    }

    return (
      <Text key={index} size="sm" c="dimmed">
        {item.label}
      </Text>
    )
  })

  return (
    <MantineBreadcrumbs separator="→" mb="md">
      {items}
    </MantineBreadcrumbs>
  )
}
