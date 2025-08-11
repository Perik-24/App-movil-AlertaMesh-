import { View, Text, StyleSheet, Button, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useNavigation, NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../(tabs)/types'; // Asegúrate de que esta ruta sea correcta y el archivo exista
import { useTheme } from '../ThemeContext'; // Importamos el hook useTheme
import {
  getDBConnection,
  createTables,
  insertBoton,
} from '../database/db-service.ts';

// Definir el tipo de la pila de navegación para el componente NewBtn
type NewBtnNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NewBtn'>;

const NewBtn = () => {
  const navigation = useNavigation<NewBtnNavigationProp>();
  const [nombreAlerta, setNombreAlerta] = useState('');
  const [prioridad, setPrioridad] = useState('Baja');
  const { isDarkMode } = useTheme();
  const containerStyle = isDarkMode ? styles.darkContainer : styles.lightContainer;
  const cardStyle = isDarkMode ? styles.darkCard : styles.lightCard;
  const titleStyle = isDarkMode ? styles.darkTitle : styles.lightTitle;
  const subtitleStyle = isDarkMode ? styles.darkSubtitle : styles.lightSubtitle;

  const handleSave = async () => {
    if (!nombreAlerta.trim()) {
      Alert.alert('Error', 'El nombre de la alerta no puede estar vacío.');
      return;
    }

    // Guarda el nuevo botón directamente en la base de datos de botones
    const db = await getDBConnection();
    await insertBoton(db, nombreAlerta, prioridad);

    // Navega de regreso a la pantalla de inicio
    navigation.navigate('Tabs', { screen: 'Home' });
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, containerStyle]}>
      <View style={[styles.card, cardStyle]}>
        <Text style={[styles.title, titleStyle]}>Nuevo Botón</Text>

        {/* Campo para el nombre de la alerta */}
        <Text style={[styles.subtitle, subtitleStyle]}>Nombre de la Alerta</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Robo de Casa"
          value={nombreAlerta}
          onChangeText={setNombreAlerta}
        />

        {/* Selector de prioridad */}
        <Text style={[styles.subtitle, subtitleStyle]}>Prioridad</Text>
        <View style={styles.prioridadContainer}>
          <TouchableOpacity
            style={[styles.prioridadBoton, prioridad === 'Baja' && styles.prioridadSeleccionadaBaja]}
            onPress={() => setPrioridad('Baja')}
          >
            <Text style={styles.buttonText}>Baja</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.prioridadBoton, prioridad === 'Media' && styles.prioridadSeleccionadaMedia]}
            onPress={() => setPrioridad('Media')}
          >
            <Text style={styles.buttonText}>Media</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.prioridadBoton, prioridad === 'Alta' && styles.prioridadSeleccionadaAlta]}
            onPress={() => setPrioridad('Alta')}
          >
            <Text style={styles.buttonText}>Alta</Text>
          </TouchableOpacity>
        </View>

        {/* Botón de guardar */}
        <TouchableOpacity style={styles.boton} onPress={handleSave}>
          <Text style={styles.buttonText}>Guardar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  prioridadContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  prioridadBoton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    backgroundColor: '#eee',
  },
  prioridadSeleccionadaBaja: {
    backgroundColor: '#28a745', // Verde
  },
  prioridadSeleccionadaMedia: {
    backgroundColor: '#ffc107', // Amarillo
  },
  prioridadSeleccionadaAlta: {
    backgroundColor: '#dc3545', // Rojo
  },
  boton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // ***** Estilos para el Modo Claro *****
  lightContainer: {
    backgroundColor: '#fff',
  },
  lightCard: {
    backgroundColor: '#f9f9f9',
  },
  lightTitle: {
    color: '#000',
  },
  lightSubtitle: {
    color: '#555',
  },
   // ***** Estilos para el Modo Oscuro *****
  darkContainer: {
    backgroundColor: '#121212',
  },
  darkCard: {
    backgroundColor: '#1e1e1e',
    shadowColor: '#fff',
  },
  darkTitle: {
    color: '#fff',
  },
  darkSubtitle: {
    color: '#fff',
  },
});

export default NewBtn;
