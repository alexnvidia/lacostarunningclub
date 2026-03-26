import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/store/ThemeContext'

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme()

    return (
        <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            title={theme === 'dark' ? 'White Gloves' : 'Dark Runner'}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: theme === 'dark'
                    ? '1px solid rgba(255,255,255,0.12)'
                    : '1px solid rgba(0,51,204,0.25)',
                background: theme === 'dark'
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,51,204,0.08)',
                color: theme === 'dark' ? '#e5e7eb' : '#0033CC',
                cursor: 'pointer',
                transition: 'background 0.2s, border-color 0.2s, color 0.2s, transform 0.15s',
                flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
            {theme === 'dark'
                ? <Sun size={16} />
                : <Moon size={16} />
            }
        </button>
    )
}
