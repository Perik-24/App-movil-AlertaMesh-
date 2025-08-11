// Este archivo crea y gestiona el contexto del tema de la aplicación.
// Debería estar en la raíz de tu proyecto, junto a App.tsx.

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

// Definimos la estructura de los datos que nuestro contexto proporcionará.
interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

// Creamos el contexto.
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Hook personalizado para usar el contexto de forma más sencilla.
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
  }
  return context;
};

// Componente proveedor que envolverá toda la aplicación.
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // Obtenemos el esquema de color del sistema (claro/oscuro).
  const colorScheme = useColorScheme();
  
  // Usamos el estado para el modo oscuro, inicializado con el esquema del sistema.
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');

  // useEffect para cargar la configuración guardada de AsyncStorage al iniciar.
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('isDarkMode');
        if (storedTheme !== null) {
          setIsDarkMode(JSON.parse(storedTheme));
        } else {
          // Si no hay tema guardado, usamos el del sistema.
          setIsDarkMode(colorScheme === 'dark');
        }
      } catch (error) {
        console.error('Error al cargar el tema desde AsyncStorage:', error);
      }
    };
    loadTheme();
  }, [colorScheme]);

  // Función para cambiar el tema y guardarlo en AsyncStorage.
  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    try {
      await AsyncStorage.setItem('isDarkMode', JSON.stringify(newMode));
    } catch (error) {
      console.error('Error al guardar el tema en AsyncStorage:', error);
    }
  };

  // El valor que el contexto proporcionará a los componentes hijos.
  const value = {
    isDarkMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
