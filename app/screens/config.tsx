// Este es el componente de la pantalla de configuración, ahora usa el contexto del tema.

import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';
import { useTheme } from '../ThemeContext'; // Importamos el hook useTheme

const ConfigScreen = () => {
  // Usamos el hook useTheme para acceder al estado y la función del tema.
  const { isDarkMode, toggleTheme } = useTheme();

  // Estados para otras opciones de configuración.
  const [vibrateOnAlert, setVibrateOnAlert] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // useEffect para cargar la configuración de vibración y notificaciones.
  useEffect(() => {
    const loadOtherSettings = async () => {
      try {
        const vibrateValue = await AsyncStorage.getItem('vibrateOnAlert');
        if (vibrateValue !== null) {
          setVibrateOnAlert(JSON.parse(vibrateValue));
        }

        const notificationsValue = await AsyncStorage.getItem('notificationsEnabled');
        if (notificationsValue !== null) {
          setNotificationsEnabled(JSON.parse(notificationsValue));
        }
      } catch (error) {
        console.error('Error al cargar la configuración:', error);
      }
    };

    loadOtherSettings();
  }, []);

  // Función para cambiar la vibración y guardarla.
  const toggleVibration = async () => {
    const newValue = !vibrateOnAlert;
    setVibrateOnAlert(newValue);
    try {
      await AsyncStorage.setItem('vibrateOnAlert', JSON.stringify(newValue));
    } catch (error) {
      console.error('Error al guardar la configuración de vibración:', error);
    }
  };

  // Función para habilitar/deshabilitar notificaciones y guardarlas.
  const toggleNotifications = async () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    try {
      await AsyncStorage.setItem('notificationsEnabled', JSON.stringify(newValue));
      if (!newValue) {
        // Asegúrate de que react-native-push-notification está instalado.
        PushNotification.cancelAllLocalNotifications();
      }
    } catch (error) {
      console.error('Error al guardar la configuración de notificaciones:', error);
    }
  };

  // Función para mostrar la información "Acerca de".
  const showAboutInfo = () => {
    Alert.alert(
      'Acerca de',
      'Versión de la aplicación: 1.0.0\n\n© 2025 Alerta Mesh. Todos los derechos reservados.\n\nDesarrollado para ayudarte a mantenerte conectado.',
      [{ text: 'OK' }]
    );
  };

  // Función para restablecer la aplicación.
  const resetApp = () => {
    Alert.alert(
      'Restablecer aplicación',
      '¿Estás seguro de que quieres restablecer la aplicación? Se borrarán todos los datos y la configuración.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Restablecer',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              // Reiniciar estados a valores por defecto
              toggleTheme(); // Vuelve a aplicar el tema por defecto
              setVibrateOnAlert(true);
              setNotificationsEnabled(true);
              Alert.alert('¡Listo!', 'La aplicación ha sido restablecida.');
            } catch (error) {
              console.error('Error al restablecer la aplicación:', error);
            }
          },
        },
      ]
    );
  };

  // Definimos los estilos basados en el modo oscuro para una mejor legibilidad.
  const themeStyles = isDarkMode ? stylesDark : stylesLight;

  return (
    <View style={[styles.container, themeStyles.container]}>

      {/* Opción de Modo Oscuro */}
      <View style={[styles.optionContainer, themeStyles.border]}>
        <Text style={[styles.optionText, themeStyles.text]}>Modo Oscuro</Text>
        <Switch
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isDarkMode ? '#f4f3f4' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
          onValueChange={toggleTheme}
          value={isDarkMode}
        />
      </View>

      {/* Opción de Vibrar con Alerta */}
      <View style={[styles.optionContainer, themeStyles.border]}>
        <Text style={[styles.optionText, themeStyles.text]}>Vibrar con alerta</Text>
        <Switch
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={vibrateOnAlert ? '#f4f3f4' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
          onValueChange={toggleVibration}
          value={vibrateOnAlert}
        />
      </View>

      {/* Opción de Notificaciones */}
      <View style={[styles.optionContainer, themeStyles.border]}>
        <Text style={[styles.optionText, themeStyles.text]}>Recibir Notificaciones</Text>
        <Switch
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={notificationsEnabled ? '#f4f3f4' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
          onValueChange={toggleNotifications}
          value={notificationsEnabled}
        />
      </View>

      {/* Botón "Acerca de" */}
      <TouchableOpacity
        onPress={showAboutInfo}
        style={[styles.button, themeStyles.buttonPrimary]}
      >
        <Text style={styles.buttonText}>Acerca de</Text>
      </TouchableOpacity>

      {/* Botón para Restablecer la Aplicación */}
      <TouchableOpacity onPress={resetApp} style={[styles.button, styles.resetButton]}>
        <Text style={styles.buttonText}>Restablecer Aplicación</Text>
      </TouchableOpacity>
    </View>
  );
};

// Estilos globales y específicos del tema
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  optionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 18,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#dc3545',
    marginTop: 20,
  },
});

const stylesLight = StyleSheet.create({
  container: { backgroundColor: '#f8f9fa' },
  text: { color: '#212529' },
  border: { borderBottomColor: '#e9ecef' },
  buttonPrimary: { backgroundColor: '#007bff' },
});

const stylesDark = StyleSheet.create({
  container: { backgroundColor: '#121212' },
  text: { color: '#e0e0e0' },
  border: { borderBottomColor: '#333' },
  buttonPrimary: { backgroundColor: '#4a4a4a' },
});

export default ConfigScreen;
