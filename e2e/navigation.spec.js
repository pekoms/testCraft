/**
 * E2E — Navigation tests
 * Validate that nav-bar buttons actually change the route.
 * These cover the exact bug that was fixed: clicking Alumnos / Estadísticas
 * silently did nothing when the PWA served a stale chunk.
 */
import { test, expect } from '@playwright/test'

const APP = 'http://localhost:5174/testCraft/'

test.describe('Navegación — botones del menú', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP)
    // Wait until nav-actions renders (auth unlocked in dev mode)
    await page.waitForSelector('.nav-actions')
  })

  test('Estadísticas cambia la URL a #/stats', async ({ page }) => {
    await page.click('button:has-text("Estadísticas")')
    await expect(page).toHaveURL(/\/testCraft\/#\/stats/)
  })

  test('Alumnos cambia la URL a #/users', async ({ page }) => {
    await page.click('button:has-text("Alumnos")')
    await expect(page).toHaveURL(/\/testCraft\/#\/users/)
  })

  test('Inicio regresa a la raíz desde /stats', async ({ page }) => {
    await page.click('button:has-text("Estadísticas")')
    await expect(page).toHaveURL(/\/testCraft\/#\/stats/)

    await page.click('button:has-text("Inicio")')
    // Hash must clear (root or empty hash)
    await expect(page).toHaveURL(/\/testCraft\/(#\/?)?$/)
  })

  test('hacer clic dos veces en el mismo botón no produce error de consola', async ({ page }) => {
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.click('button:has-text("Estadísticas")')
    // Second click on same route — our go() wrapper must suppress NavigationDuplicated
    await page.click('button:has-text("Estadísticas")')

    const real = consoleErrors.filter(
      e => !e.includes('Avoided redundant navigation') && !e.includes('NavigationDuplicated'),
    )
    expect(real).toHaveLength(0)
  })

  test('Estadísticas → Alumnos → Inicio: secuencia completa sin errores', async ({ page }) => {
    const jsErrors = []
    page.on('pageerror', err => jsErrors.push(err.message))

    await page.click('button:has-text("Estadísticas")')
    await expect(page).toHaveURL(/\/testCraft\/#\/stats/)

    await page.click('button:has-text("Alumnos")')
    await expect(page).toHaveURL(/\/testCraft\/#\/users/)

    await page.click('button:has-text("Inicio")')
    await expect(page).toHaveURL(/\/testCraft\/(#\/?)?$/)

    expect(jsErrors).toHaveLength(0)
  })
})
