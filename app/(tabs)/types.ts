import { NavigatorScreenParams } from '@react-navigation/native';

// Primero, definimos los parámetros para las pantallas que están dentro del navegador de pestañas
export type TabParamList = {
    Home: { newAlerta?: { nombre: string; prioridad: string } } | undefined;
    history: undefined;
};

// Luego, actualizamos RootStackParamList para que 'Tabs' use el tipo de TabParamList
export type RootStackParamList = {
    Tabs: NavigatorScreenParams<TabParamList>;
    NewBtn: undefined;
};