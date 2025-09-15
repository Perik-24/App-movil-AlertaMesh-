import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import App from "../screens/HomeScreen";
import MaterialIcons from "react-native-vector-icons/MaterialIcons"; // Importa el componente correcto
import { useTheme } from '../ThemeContext';

const Tab = createBottomTabNavigator();

export const BottomTab = () => {
    const { isDarkMode } = useTheme();

    const tintColor = isDarkMode ? '#e91e63' : '#e91e63'; // Puedes mantener el color activo o cambiarlo
    const inactiveColor = isDarkMode ? '#B0B0B0' : '#8E8E93';
    const backgroundColor = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const headerTitleColor = isDarkMode ? '#E0E0E0' : '#212121';

    return (
        <Tab.Navigator screenOptions={{
            // Estilos para la barra de pestañas
            tabBarStyle: {
                backgroundColor: backgroundColor,
                borderTopWidth: 1,
                borderTopColor: isDarkMode ? '#444444' : '#E0E0E0',
            },
            tabBarActiveTintColor: tintColor,
            tabBarInactiveTintColor: inactiveColor,

            // Estilos para el encabezado
            headerStyle: {
                backgroundColor: backgroundColor,
                borderBottomWidth: 1,
                borderBottomColor: isDarkMode ? '#444444' : '#E0E0E0',
            },
            headerTintColor: headerTitleColor,
            headerTitleAlign: "center",

            animation: 'shift',
        }}>
            <Tab.Screen name="Alerta Mesh" component={App} options={{
                headerTitleAlign: "center", tabBarLabel: "Inicio", tabBarIcon: ({ color }) =>
                    <MaterialIcons name="home" color={color} size={30} />
            }} />
            <Tab.Screen name="Historial" component={require('../screens/history').default} options={{
                headerTitleAlign: "center", tabBarIcon: ({ color }) =>
                    <MaterialIcons name="history" color={color} size={30} />
            }} />
            <Tab.Screen name="Configuracion" component={require('../screens/config').default} options={{
                headerTitleAlign: "center", tabBarIcon: ({ color }) =>
                    <MaterialIcons name="settings" color={color} size={30} />
            }} />
        </Tab.Navigator>

    );
};

