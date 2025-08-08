import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { getDBConnection, getAlertas } from '../database/db-service';


interface Alerta {
  Id: number;
  TIPO_ALERTA: string;
  MENSAJE: string;
  FECHA: string;
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
  return (
    <View style={styles.container}>
      <FlatList
        data={alertas}
        keyExtractor={(item) => item.Id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.tipo}>{item.TIPO_ALERTA}</Text>
            <Text style={styles.mensaje}>{item.MENSAJE}</Text>
            <Text style={styles.fecha}>{item.FECHA}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.vacio}>No hay alertas registradas</Text>}
      />
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  card: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  tipo: { fontSize: 16, fontWeight: 'bold' },
  mensaje: { fontSize: 14 },
  fecha: { fontSize: 12, color: '#888' },
  vacio: { textAlign: 'center', marginTop: 20, color: '#999' },
});

export default HistorialScreen;