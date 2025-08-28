import { describe, it } from 'vitest'
import { Providers } from '../../src/app.js'
import { Login } from '../../src/components/Login.js'

// Wrapper компонент с MantineProvider
const LoginWrapper = () => (
  <Providers>
    <Login />
  </Providers>
)

describe('Login Component', () => {
  it('должен отображать все основные элементы', () => {
    cy.mount(<LoginWrapper />)

    // Проверяем основной контейнер
    cy.get('[data-testid="login-page"]').should('be.visible')

    // Проверяем заголовок
    cy.get('[data-testid="login-title"]').should('be.visible').and('contain.text', 'Добро пожаловать в Food App')

    // Проверяем описание
    cy.get('[data-testid="login-description"]')
      .should('be.visible')
      .and('contain.text', 'Войдите в систему, чтобы управлять своими рецептами')

    // Проверяем кнопку
    cy.get('[data-testid="google-login-button"]').should('be.visible').and('contain.text', 'Войти через Google')
  })

  it('должен отображать иконку Google в кнопке', () => {
    cy.mount(<LoginWrapper />)

    cy.get('[data-testid="google-login-button"]')
      .find('svg')
      .should('be.visible')
      .and('have.attr', 'viewBox', '0 0 24 24')
  })

  it('должен иметь правильную структуру Mantine компонентов', () => {
    cy.mount(<LoginWrapper />)

    // Проверяем Container
    cy.get('[data-testid="login-page"]').should('have.class', 'mantine-Container-root')

    // Проверяем Paper
    cy.get('[data-testid="login-page"]').find('.mantine-Paper-root').should('be.visible')

    // Проверяем Button
    cy.get('[data-testid="google-login-button"]').should('have.class', 'mantine-Button-root')
  })

  it('должен быть доступен для клавиатурной навигации', () => {
    cy.mount(<LoginWrapper />)

    // Проверяем, что кнопка может получить фокус
    cy.get('[data-testid="google-login-button"]')
      .should('be.visible')
      .and('not.be.disabled')
      .focus()
      .should('be.focused')
  })

  it('должен иметь правильную семантику для скринридеров', () => {
    cy.mount(<LoginWrapper />)

    // Проверяем, что заголовок имеет правильный тег
    cy.get('[data-testid="login-title"]').should('have.prop', 'tagName', 'H1')

    // Проверяем, что кнопка является элементом button
    cy.get('[data-testid="google-login-button"]').should('have.prop', 'tagName', 'BUTTON')
  })
})
