import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useTheme, THEMES } from '@/composables/useTheme'

// useTheme usa un ref a nivel de módulo (singleton), así que
// resetear el tema en beforeEach es suficiente para aislar los tests.
const { theme, setTheme } = useTheme()

describe('useTheme — catálogo de temas', () => {
  it('hay exactamente tres temas', () => {
    expect(THEMES).toHaveLength(3)
  })

  it('los IDs son light, dark y slate', () => {
    expect(THEMES.map(t => t.id)).toEqual(['light', 'dark', 'slate'])
  })

  it('cada tema tiene id y label', () => {
    THEMES.forEach(t => {
      expect(t.id).toBeTruthy()
      expect(t.label).toBeTruthy()
    })
  })
})

describe('useTheme — setTheme', () => {
  beforeEach(() => setTheme('light'))

  it('setTheme cambia el tema a dark', () => {
    setTheme('dark')
    expect(theme.value).toBe('dark')
  })

  it('setTheme cambia el tema a slate', () => {
    setTheme('slate')
    expect(theme.value).toBe('slate')
  })

  it('setTheme vuelve a light', () => {
    setTheme('dark')
    setTheme('light')
    expect(theme.value).toBe('light')
  })

  it('setTheme con id inválido no cambia el tema', () => {
    setTheme('light')
    setTheme('neon')
    expect(theme.value).toBe('light')
  })

  it('setTheme con string vacío no cambia el tema', () => {
    setTheme('dark')
    setTheme('')
    expect(theme.value).toBe('dark')
  })

  it('setTheme actualiza el atributo data-theme en <html>', async () => {
    setTheme('dark')
    await nextTick()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('setTheme persiste en localStorage', async () => {
    setTheme('slate')
    await nextTick()
    expect(localStorage.getItem('testcraft_theme')).toBe('slate')
  })
})
