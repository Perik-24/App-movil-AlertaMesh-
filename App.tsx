import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';

const DEVICE_NAME = 'ESP32_Alerta';

const App = () => {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    requestPermissions();
    checkConnection();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
    }
  };

  const checkConnection = async () => {
    try {
      const bondedDevices = await RNBluetoothClassic.getBondedDevices();
      const esp32 = bondedDevices.find(d => d.name === DEVICE_NAME);

      if (!esp32) {
        setConnected(false);
        setDevice(null);
        return;
      }

      const isConnected = await esp32.isConnected();
      setConnected(isConnected);
      setDevice(esp32);
    } catch (error) {
      console.error('Error verificando conexión:', error);
      setConnected(false);
      setDevice(null);
    }
  };

  const connectToESP32 = async () => {
    try {
      const devices = await RNBluetoothClassic.getBondedDevices();
      const esp32 = devices.find(d => d.name === DEVICE_NAME);

      if (!esp32) {
        Alert.alert('No se encontró el dispositivo ESP32');
        return;
      }

      const connected = await esp32.connect();
      if (connected) {
        setDevice(esp32);
        setConnected(true);
        Alert.alert('Conectado con ESP32');
      }
    } catch (err) {
      console.error('Error al conectar:', err);
    }
  };

  const sendAlert = async () => {
    if (device && connected) {
      try {
        await device.write('ALERTA\n');
        Alert.alert('Alerta enviada');
      } catch (error) {
        Alert.alert('Error al enviar alerta');
        console.error(error);
      }
    } else {
      Alert.alert('Dispositivo no conectado');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Dispositivo: {DEVICE_NAME}</Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: connected ? 'green' : 'red' },
            ]}
          />
          <Text style={styles.statusText}>
            {connected ? 'Conectado' : 'Desconectado'}
          </Text>
        </View>
        {!connected ? (
          <Button title="Conectar al ESP32" onPress={connectToESP32} />
        ) : (
          <Button title="Enviar ALERTA" onPress={sendAlert} />
        )}
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
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
  },
});

export default App;
