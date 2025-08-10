import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';
import {
  getDBConnection,
  createTables,
  insertAlerta,
  getAlertas,
  deleteAllAlertas,
  getBotones,
  dropTables,
} from '../database/db-service.ts';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from '@react-navigation/native';
import PushNotification from 'react-native-push-notification';

type RootStackParamList = {
  Tabs: {
    screen: string;
    params?: { newAlerta?: { nombre: string; prioridad: string } };
  };
  NewBtn: undefined;
  Home: { newAlerta?: { nombre: string; prioridad: string } } | undefined;
  history: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Tabs'>;
type HomeRouteProp = RouteProp<RootStackParamList, 'Home'>;

interface BotonAlerta {
  nombre: string;
  mensaje: string;
  prioridad: string;
}

const DEVICE_NAME = 'ESP32_Alerta';
const OTHER_PHONE_NAME = 'S22+ de Perik24';

const App = () => {

  type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Tabs'>;

  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<HomeRouteProp>();
  const [otherPhoneDevice, setOtherPhoneDevice] = useState<BluetoothDevice | null>(null);
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [connected, setConnected] = useState(false);
  const [botones, setBotones] = useState<BotonAlerta[]>([]);

  const defaultButtons: BotonAlerta[] = [
    { nombre: 'Robo', mensaje: 'Se detectó un intento de robo', prioridad: 'Alta' },
    { nombre: 'Incendio', mensaje: 'Se detectó un posible incendio', prioridad: 'Alta' },
  ];

  // Cargar botones desde la base de datos
  const cargarBotones = async () => {
    const db = await getDBConnection();
    const botonesGuardados = await getBotones(db);
    const botonesPersonalizados = botonesGuardados.map(b => ({
            nombre: b.Nombre,
            mensaje: 'Mensaje predeterminado',
            prioridad: b.Prioridad,
        }));
    // Combina los botones predeterminados con los de la base de datos
    setBotones([...defaultButtons, ...botonesPersonalizados]);
  };

  // Al cargar la pantalla, se revisa si hay un nuevo botón y lo guarda
    useFocusEffect(
        useCallback(() => {
            // Solo necesitamos recargar los botones
            cargarBotones();
        }, []) // No depende de route.params, ya que NewBtn lo guarda directamente
    );

  useEffect(() => {
    const init = async () => {
      await requestPermissions();
      const db = await getDBConnection();
      await createTables(db);
      await checkConnection();
      await cargarBotones();
    };
    init();
  }, []);

  useEffect(() => {
    if (otherPhoneDevice) {
      const subscription = otherPhoneDevice.onDataReceived(async (data) => {
        try {
          const receivedData = JSON.parse(data.data.trim());
          const { alerta, historial } = receivedData;

          // Guarda el nuevo historial en SQLite del teléfono receptor
          const db = await getDBConnection();
          // Borra el historial viejo y inserta el nuevo para mantenerlo sincronizado
          await deleteAllAlertas(db);
          for (const item of historial) {
            await insertAlerta(db, item.TIPO_ALERTA, item.MENSAJE, item.FECHA, item.PRIORIDAD);
          }

          // Muestra la notificación al usuario
          // Aquí debes usar la librería de notificaciones
          // (Ejemplo con react-native-push-notification)
          PushNotification.localNotification({
            title: `Alerta recibida: ${alerta.tipo}`,
            message: alerta.mensaje,
          });

        } catch (error) {
          console.error("Error al procesar los datos de la alerta:", error);
        }
      });

      return () => subscription.remove();
    }
  }, [otherPhoneDevice]);

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

  const sendAlert = async (alerta: BotonAlerta) => {
    if (device && connected) {
      try {
        await device.write('ALERTA\n');// Envía la alerta al ESP32
        const db = await getDBConnection();
        const fecha = new Date().toISOString();
        await device.write(alerta.nombre + '\n');
        await device.write('ALERTA\n');// Envía la alerta al ESP32

        await insertAlerta(db, alerta.nombre, alerta.mensaje, fecha, alerta.prioridad);

        // Obtiene el historial completo para sincronizar
        const alertasCompletas = await getAlertas(db);

        // Prepara los datos para enviar
        const dataToSend = JSON.stringify({
          alerta: { tipo: alerta.nombre, mensaje: alerta.mensaje, fecha: fecha, prioridad: alerta.prioridad },
          historial: alertasCompletas
        });

        if (otherPhoneDevice) {
          await otherPhoneDevice.write(dataToSend + '\n'); // Envía al otro teléfono
          Alert.alert('Alerta enviada a ESP32 y otro teléfono');
        } else {
          Alert.alert('Alerta enviada a ESP32, pero el otro teléfono no está conectado.');
        }
      } catch (error) {
        console.error('Error al enviar alerta:', error);
                Alert.alert('Error al enviar la alerta');
      }
    } else {
      Alert.alert('Dispositivo no conectado');
    }
  };

  const connectToOtherPhone = async () => {
    try {
            const devices = await RNBluetoothClassic.getBondedDevices();
            const otherPhone = devices.find(d => d.name === OTHER_PHONE_NAME);

            if (!otherPhone) {
                Alert.alert('No se encontró el otro teléfono');
                return;
            }

            const connected = await otherPhone.connect();
            if (connected) {
                setOtherPhoneDevice(otherPhone);
                Alert.alert('Conectado con el otro teléfono');
            } else {
                // Manejar el caso en que la conexión falle sin lanzar una excepción
                Alert.alert('Fallo la conexión con el otro teléfono');
            }

        } catch (err) {
            console.error('Error al conectar con el otro teléfono:', err);
            Alert.alert(`Error de conexión: ${err instanceof Error ? err.message : 'Error desconocido'}`);
        }
    };

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
          <Button title="Revisar conexión" onPress={checkConnection} />
        )}
      </View>

      {botones.map((alerta, index) => (
                <View key={index} style={[styles.card2, getPriorityStyle(alerta.prioridad)]}>
          <Text style={styles.title2}>{alerta.nombre}</Text>
          <TouchableOpacity
            style={styles.boton}
            onPress={() => sendAlert(alerta)}
          >
            <Text style={styles.buttonText}>Enviar ALERTA</Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.card2}>
        <Text style={styles.title2}>Nuevo Botón</Text>
        <TouchableOpacity
          style={styles.boton}
          onPress={() => navigation.navigate('NewBtn')}
        >
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.botonCelular} onPress={connectToOtherPhone}>
        <Text style={styles.buttonText}>Conectar a otro celular</Text>
      </TouchableOpacity>
    </ScrollView>

  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'flex-start',
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
    marginTop: 5,
    marginBottom: 5,
  },
  card2: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginTop: 5,
    marginLeft: 25,
    marginRight: 25,
    justifyContent: 'space-between',
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  title2: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
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
  boton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginLeft: 25,
    marginRight: 25,
  },
  buttonText: {
    color: 'white', // Color del texto
    fontWeight: 'bold',
  },
  botonCelular: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginLeft: 25,
    marginRight: 25,
    marginTop: 20,
  },
});

export default App;
