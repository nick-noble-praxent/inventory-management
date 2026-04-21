import { ref, watch } from 'vue'

// Singleton ref shared across all consumers
const isDark = ref(localStorage.getItem('theme') === 'dark')

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  localStorage.setItem('theme', dark ? 'dark' : 'light')
}

// Apply on module load so the theme is set before first render
applyTheme(isDark.value)

watch(isDark, applyTheme)

export function useTheme() {
  return {
    isDark,
    toggleTheme: () => {
      isDark.value = !isDark.value
    }
  }
}
