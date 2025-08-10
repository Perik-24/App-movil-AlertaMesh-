import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { getDBConnection, getAlertas } from '../database/db-service';


interface Alerta {
  Id: number;
  TIPO_ALERTA: string;
  MENSAJE: string;
  FECHA: string;
  PRIORIDAD: string;
}

const HistorialScreen = () => {
  const [alertas, setAlertas] = useState<Alerta[]>([]);

const cargarAlertas = async () => {
    const db = await getDBConnection();
    const data = await getAlertas(db);
    setAlertas(data);
  };

  useFocusEffect(
  useCallback(() => {
    cargarAlertas();
  }, [])
);
// Función de ayuda para obtener el estilo de prioridad
    const getPriorityStyle = (prioridad: string) => {
        switch (prioridad) {
            case 'Baja':
                return styles['card-Baja'];
            case 'Media':
                return styles['card-Media'];
            case 'Alta':
                return styles['card-Alta'];
            default:
                return {}; // Devuelve un objeto vacío si no hay coincidencia
        }
    };

  return (
    <View style={styles.container}>
      <FlatList
        data={alertas}
        keyExtractor={(item) => item.Id.toString()}
        renderItem={({ item }) => (
           <View style={[styles.card, getPriorityStyle(item.PRIORIDAD)]}>
                        <Text style={styles.tipo}>{item.TIPO_ALERTA}</Text>
                        <Text style={styles.mensaje}>{item.MENSAJE}</Text>
                        <Text style={styles.fecha}>Fecha: {new Date(item.FECHA).toLocaleString()}</Text>
                        <Text style={styles.prioridadText}>Prioridad: {item.PRIORIDAD}</Text>
                    </View>
        )}
        ListEmptyComponent={<Text style={styles.vacio}>No hay alertas registradas</Text>}
      />
    </View>
  );
};


const styles = StyleSheet.create({
  container: { 
        flex: 1, 
        padding: 16, 
        backgroundColor: '#f0f0f0' 
    },
    card: { 
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16, 
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    'card-Baja': {
        borderLeftColor: '#28a745',
        borderLeftWidth: 5,
    },
    'card-Media': {
        borderLeftColor: '#ffc107',
        borderLeftWidth: 5,
    },
    'card-Alta': {
        borderLeftColor: '#dc3545',
        borderLeftWidth: 5,
    },
    tipo: { 
        fontSize: 18, 
        fontWeight: 'bold',
        marginBottom: 4,
    },
    mensaje: { 
        fontSize: 16,
        color: '#555',
        marginBottom: 4,
    },
    fecha: { 
        fontSize: 12, 
        color: '#888',
    },
    prioridadText: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 8,
    },
    vacio: { 
        textAlign: 'center', 
        marginTop: 20, 
        color: '#999',
    },
});

export default HistorialScreen;