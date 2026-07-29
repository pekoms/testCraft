import { ref, computed, watchEffect } from 'vue'

export const THEMES = [
  { id: 'light', label: 'Claro' },
  { id: 'dark',  label: 'Oscuro' },
  { id: 'slate', label: 'Noche' },
]

const STORAGE_KEY = 'testcraft_theme'

const stored = localStorage.getItem(STORAGE_KEY) || 'light'
const theme = ref(THEMES.find(t => t.id === stored) ? stored : 'light')

// Apply immediately to avoid flash
document.documentElement.setAttribute('data-theme', theme.value)

export function useTheme() {
  watchEffect(() => {
    document.documentElement.setAttribute('data-theme', theme.value)
    localStorage.setItem(STORAGE_KEY, theme.value)
  })

  const currentTheme = computed(() => THEMES.find(t => t.id === theme.value) || THEMES[0])

  function setTheme(id) {
    if (THEMES.find(t => t.id === id)) theme.value = id
  }

  return { theme, currentTheme, themes: THEMES, setTheme }
}
