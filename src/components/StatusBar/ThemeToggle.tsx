import { Sun, Moon } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'

export function ThemeToggle() {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)

  return (
    <button
      className='btn-outline'
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      style={{ padding: '4px 8px' }}
    >
      {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
    </button>
  )
}