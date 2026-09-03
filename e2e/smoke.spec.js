/**
 * E2E — Smoke tests
 * Verify the app loads and the basic shell is visible.
 */
import { test, expect } from '@playwright/test'

const APP = 'http://localhost:5174/testCraft/'

test.describe('Smoke — carga inicial', () => {
  test('la app arranca y muestra el logo TestCraft', async ({ page }) => {
    await page.goto(APP)
    await expect(page.locator('.logo')).toBeVisible()
    await expect(page.locator('.logo')).toContainText('TestCraft')
  })

  test('la barra nav es visible en modo dev (modo profesor)', async ({ page }) => {
    await page.goto(APP)
    await expect(page.locator('nav')).toBeVisible()
    // In dev mode isTeacher=true — both teacher buttons must render
    await expect(page.getByRole('button', { name: /Estadísticas/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Alumnos/i })).toBeVisible()
  })

  test('no hay errores JS en la consola al cargar home', async ({ page }) => {
    const jsErrors = []
    page.on('pageerror', err => jsErrors.push(err.message))

    await page.goto(APP)
    await page.waitForSelector('nav')

    expect(jsErrors).toHaveLength(0)
  })

  test('el contenido principal se renderiza (no pantalla en blanco)', async ({ page }) => {
    await page.goto(APP)
    // #app must have children — not a blank page
    const childCount = await page.locator('#app > *').count()
    expect(childCount).toBeGreaterThan(0)
  })
})
