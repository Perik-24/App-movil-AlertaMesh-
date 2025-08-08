import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import App from "../screens/HomeScreen";
import MaterialIcons from "react-native-vector-icons/MaterialIcons"; // Importa el componente correcto

const Tab = createBottomTabNavigator();

export const BottomTab = () => {
    return (
        <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#e91e63', animation: 'shift' }}>
            <Tab.Screen name="Alerta Mesh" component={App} options={{
                headerTitleAlign: "center", tabBarLabel: "Inicio", tabBarIcon: ({ color }) =>
                    <MaterialIcons name="home" color={color} size={20} />
            }} />
            <Tab.Screen name="Historial" component={require('../screens/history').default} options={{
                headerTitleAlign: "center", tabBarIcon: ({ color }) =>
                    <MaterialIcons name="history" color={color} size={20} />
            }} />
            <Tab.Screen name="Configuracion" component={require('../screens/config').default} options={{
                headerTitleAlign: "center", tabBarIcon: ({ color }) =>
                    <MaterialIcons name="settings" color={color} size={20} />
            }} />
        </Tab.Navigator>

    );
};