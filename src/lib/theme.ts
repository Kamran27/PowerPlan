/*
 * Darstellung: hell, dunkel oder wie das System. Die Wahl gilt pro Gerät (localStorage),
 * die Klasse „dark“ auf <html> schaltet die dunklen Farben von Tailwind ein.
 */
export type Theme = 'system' | 'light' | 'dark'

const KEY = 'powerplan-theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    return t === 'light' || t === 'dark' ? t : 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(theme: Theme = getTheme()) {
  const dark = theme === 'dark' || (theme === 'system' && media().matches)
  document.documentElement.classList.toggle('dark', dark)
  // Farbe der Statusleiste (iPhone/Android) passend zum Modus
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#09090b' : '#7c3aed')
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* privater Modus: dann nur für diese Sitzung */
  }
  applyTheme(theme)
}

/** Beim Start aufrufen: folgt Systemwechseln, solange „wie das System“ gewählt ist. */
export function watchSystemTheme() {
  applyTheme()
  media().addEventListener('change', () => {
    if (getTheme() === 'system') applyTheme('system')
  })
}
