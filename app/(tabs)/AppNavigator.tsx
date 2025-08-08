import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import { BottomTab } from "./BottomTab";
import NewBtn from "../screens/NewBtn"; // Pantalla que no está en tabs


export type RootStackParamList = {
  Tabs: undefined;
  NewBtn: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="Tabs" component={BottomTab} options={{headerShown: false}} />
      <Stack.Screen name="NewBtn" component={NewBtn} options={{ headerTitleAlign: "center", headerTitle: "Nuevo Boton" }} />
    </Stack.Navigator>
  );
};
