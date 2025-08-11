import { View, Text } from 'react-native'
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { AppNavigator } from "./app/(tabs)/AppNavigator";
import { ThemeProvider } from './app/ThemeContext';

const App = () => {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </ThemeProvider>
  )
}

export default App