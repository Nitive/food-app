// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Кастомные команды для тестирования авторизации
Cypress.Commands.add('visitLoginPage', () => {
  cy.visit('/login')
})

// Команда для проверки элементов страницы авторизации
Cypress.Commands.add('checkLoginPageElements', () => {
  // Проверяем наличие основных элементов
  cy.get('[data-testid="login-page"]').should('be.visible')
  cy.get('[data-testid="google-login-button"]').should('be.visible')
  cy.get('[data-testid="login-title"]').should('be.visible')
})
