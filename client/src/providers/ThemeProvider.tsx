import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme) return savedTheme;
    }
    // Default to light theme
    return 'light';
  });

  useEffect(() => {
    // Update localStorage when theme changes
    localStorage.setItem('theme', theme);
    
    // Update document class for global styles
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);

    // Update CSS variables for theme colors
    const root = document.documentElement;
    if (theme === 'dark') {
      // Dark theme colors
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#e5e7eb');
      root.style.setProperty('--text-muted', '#9ca3af');
      root.style.setProperty('--bg-primary', '#1a1a1a');
      root.style.setProperty('--bg-secondary', '#2d2d2d');
      root.style.setProperty('--bg-muted', '#374151');
      root.style.setProperty('--border-color', '#374151');
      root.style.setProperty('--hover-bg', '#2d2d2d');
      root.style.setProperty('--active-bg', '#374151');
      
      // Icon colors for dark theme
      root.style.setProperty('--icon-primary', '#ffffff');
      root.style.setProperty('--icon-secondary', '#e5e7eb');
      root.style.setProperty('--icon-muted', '#9ca3af');
      root.style.setProperty('--icon-hover', '#ffffff');
      root.style.setProperty('--icon-active', '#3b82f6');
    } else {
      // Light theme colors
      root.style.setProperty('--text-primary', '#1a1a1a');
      root.style.setProperty('--text-secondary', '#374151');
      root.style.setProperty('--text-muted', '#6b7280');
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f3f4f6');
      root.style.setProperty('--bg-muted', '#e5e7eb');
      root.style.setProperty('--border-color', '#e5e7eb');
      root.style.setProperty('--hover-bg', '#f3f4f6');
      root.style.setProperty('--active-bg', '#e5e7eb');
      
      // Icon colors for light theme
      root.style.setProperty('--icon-primary', '#1a1a1a');
      root.style.setProperty('--icon-secondary', '#374151');
      root.style.setProperty('--icon-muted', '#6b7280');
      root.style.setProperty('--icon-hover', '#1a1a1a');
      root.style.setProperty('--icon-active', '#3b82f6');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
