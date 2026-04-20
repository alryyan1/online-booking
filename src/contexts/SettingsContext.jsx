import { createContext, useContext, useEffect, useState } from 'react'

const SettingsContext = createContext(null)

const FONT_PX = { sm: 13, md: 15, lg: 17 }

export const SettingsProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dark') === 'true')
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('fontSize') || 'md')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_PX[fontSize] + 'px'
    localStorage.setItem('fontSize', fontSize)
  }, [fontSize])

  return (
    <SettingsContext.Provider value={{ darkMode, setDarkMode, fontSize, setFontSize }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
