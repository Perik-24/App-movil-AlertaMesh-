import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  getBotones,
  dropTables,
} from '../database/db-service.ts';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';

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

interface DataReceivedEvent {
  data: string;
}

const DEVICE_NAME = 'ESP32_Alerta';
const OTHER_PHONE_NAME = 'S22+ de Perik24';

const App = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Tabs'>>();
  const route = useRoute<HomeRouteProp>();
  const [esp32Device, setEsp32Device] = useState<BluetoothDevice | null>(null);
  const [otherPhoneDevice, setOtherPhoneDevice] = useState<BluetoothDevice | null>(null);
  const [connectedToEsp32, setConnectedToEsp32] = useState(false);
  const [connectedToOtherPhone, setConnectedToOtherPhone] = useState(false);
  const [isServerMode, setIsServerMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [botones, setBotones] = useState<BotonAlerta[]>([]);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const { isDarkMode } = useTheme();

  const otherPhoneListener = useRef<any>(null);

  const containerStyle = isDarkMode ? styles.darkContainer : styles.lightContainer;
  const cardStyle = isDarkMode ? styles.darkCard : styles.lightCard;
  const card2Style = isDarkMode ? styles.darkCard2 : styles.lightCard2;
  const titleStyle = isDarkMode ? styles.darkTitle : styles.lightTitle;
  const statusTextStyle = isDarkMode ? styles.darkStatusText : styles.lightStatusText;
  const buttonTextStyle = isDarkMode ? styles.darkButtonText : styles.lightButtonText;
  const plusButtonTextStyle = isDarkMode ? styles.darkPlusButtonText : styles.lightPlusButtonText;

  const defaultButtons: BotonAlerta[] = [
    { nombre: 'Robo', mensaje: 'Se detectó un intento de robo', prioridad: 'Alta' },
    { nombre: 'Incendio', mensaje: 'Se detectó un posible incendio', prioridad: 'Alta' },
  ];

  const cargarBotones = async () => {
    const db = await getDBConnection();
    const botonesGuardados = await getBotones(db);
    const botonesPersonalizados = botonesGuardados.map(b => ({
      nombre: b.Nombre,
      mensaje: 'Mensaje predeterminado',
      prioridad: b.Prioridad,
    }));
    setBotones([...defaultButtons, ...botonesPersonalizados]);
  };

  useFocusEffect(
    useCallback(() => {
      cargarBotones();
    }, []),
  );

  const setupBluetooth = useCallback(async () => {
    const granted = await requestPermissions();
    if (granted) {
      setPermissionsGranted(true);
      const db = await getDBConnection();
      await createTables(db);
      await checkConnection();
      await cargarBotones();
    } else {
      setPermissionsGranted(false);
      Alert.alert('Permisos necesarios', 'La aplicación necesita permisos de Bluetooth para funcionar.');
    }
  }, []);

  useEffect(() => {
    setupBluetooth();
  }, [setupBluetooth]);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return (
        result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
        result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
        result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED
      );
    }
    return true;
  };

  const checkConnection = async () => {
    if (!permissionsGranted) return;

    try {
      const bondedDevices = await RNBluetoothClassic.getBondedDevices();
      console.log('Dispositivos Vinculados:', bondedDevices.map(d => d.name));
      
      const esp32 = bondedDevices.find(d => d.name === DEVICE_NAME);
      const otherPhone = bondedDevices.find(d => d.name === OTHER_PHONE_NAME);

      if (esp32) {
        setEsp32Device(esp32);
        const isConnected = await esp32.isConnected();
        setConnectedToEsp32(isConnected);
      } else {
        setEsp32Device(null);
        setConnectedToEsp32(false);
      }
      
      if (otherPhone) {
        setOtherPhoneDevice(otherPhone);
        const isConnected = await otherPhone.isConnected();
        setConnectedToOtherPhone(isConnected);
      } else {
        setOtherPhoneDevice(null);
        setConnectedToOtherPhone(false);
      }
    } catch (error) {
      console.error('Error verificando conexión:', error);
      setConnectedToEsp32(false);
      setEsp32Device(null);
      setConnectedToOtherPhone(false);
      setOtherPhoneDevice(null);
    }
  };

  const startServerMode = async () => {
    if (!permissionsGranted) {
      Alert.alert('Permisos no concedidos', 'Por favor, concede los permisos de Bluetooth para continuar.');
      return;
    }
    try {
      setIsListening(true);
      Alert.alert('Modo Servidor', 'Esperando conexión entrante...');
      const connection = await RNBluetoothClassic.accept({}); // Corregido: pasar un objeto vacío
      setIsListening(false);
      setIsServerMode(true);
      setOtherPhoneDevice(connection);
      setConnectedToOtherPhone(true);

      const subscription = connection.onDataReceived(async (data: DataReceivedEvent) => {
        try {
          if (data.data) {
            Alert.alert(
              '¡ALERTA RECIBIDA!',
              'Se recibió una notificación simple desde el otro teléfono.'
            );
          }
        } catch (error) {
          console.error('Error al procesar los datos recibidos:', error);
          Alert.alert('Error de datos', 'Se recibieron datos con un formato incorrecto.');
        }
      });
      otherPhoneListener.current = subscription;
    } catch (err) {
      setIsListening(false);
      setIsServerMode(false);
      console.error('Error en modo servidor:', err);
      Alert.alert('Error', 'No se pudo iniciar el modo servidor.');
    }
  };

  const connectToESP32 = async () => {
    if (!permissionsGranted) {
      Alert.alert('Permisos no concedidos', 'Por favor, concede los permisos de Bluetooth para continuar.');
      return;
    }
    try {
      const devices = await RNBluetoothClassic.getBondedDevices();
      const esp32 = devices.find(d => d.name === DEVICE_NAME);
      if (!esp32) {
        Alert.alert('No se encontró el dispositivo ESP32');
        return;
      }
      await esp32.connect();
      setEsp32Device(esp32);
      setConnectedToEsp32(true);
      Alert.alert('Conectado con ESP32');
    } catch (err) {
      console.error('Error al conectar con ESP32:', err);
      Alert.alert('Error de conexión', 'No se pudo conectar con el ESP32. ¿Está encendido y emparejado?');
    }
  };

  const connectToOtherPhone = async () => {
    if (!permissionsGranted) {
      Alert.alert('Permisos no concedidos', 'Por favor, concede los permisos de Bluetooth para continuar.');
      return;
    }
    try {
      const devices = await RNBluetoothClassic.getBondedDevices();
      const otherPhone = devices.find(d => d.name === OTHER_PHONE_NAME);
      if (!otherPhone) {
        Alert.alert('Dispositivo no encontrado', 'Asegúrate de que el otro teléfono esté emparejado con tu teléfono.');
        return;
      }
      await otherPhone.connect();
      setOtherPhoneDevice(otherPhone);
      setConnectedToOtherPhone(true);
      Alert.alert('Conectado con el otro teléfono');
    } catch (err) {
      console.error('Error al conectar con el otro teléfono:', err);
      Alert.alert('Error de conexión', 'No se pudo conectar. El otro teléfono debe estar en "modo de escucha".');
    }
  };

  const showBondedDevices = async () => {
    if (!permissionsGranted) {
      Alert.alert('Permisos no concedidos', 'Por favor, concede los permisos de Bluetooth para continuar.');
      return;
    }
    try {
      const bondedDevices = await RNBluetoothClassic.getBondedDevices();
      const deviceNames = bondedDevices.map(d => d.name).join('\n');
      Alert.alert(
        'Dispositivos Vinculados',
        deviceNames || 'No se encontraron dispositivos vinculados.',
      );
    } catch (err) {
      console.error('Error al obtener dispositivos vinculados:', err);
      Alert.alert('Error', 'No se pudo obtener la lista de dispositivos vinculados.');
    }
  };

  const sendAlert = async (alerta: BotonAlerta) => {
    if (!permissionsGranted) {
      Alert.alert('Permisos no concedidos', 'Por favor, concede los permisos de Bluetooth para continuar.');
      return;
    }
    const db = await getDBConnection();
    const fecha = new Date().toISOString();
    await insertAlerta(db, alerta.nombre, alerta.mensaje, fecha, alerta.prioridad);

    if (esp32Device && connectedToEsp32) {
      try {
        await esp32Device.write(alerta.prioridad + '\n');
        Alert.alert('Alerta enviada a ESP32');
      } catch (error) {
        console.error('Error al enviar alerta a ESP32:', error);
        Alert.alert('Error al enviar la alerta al ESP32');
      }
    } else {
      Alert.alert('ESP32 no conectado', 'Conéctate al ESP32 para enviar la alerta.');
    }

    if (otherPhoneDevice && connectedToOtherPhone && !isServerMode) {
      try {
        const simpleMessage = 'ALERTA_ENVIADA_DESDE_EL_OTRO_TELEFONO';
        await otherPhoneDevice.write(simpleMessage + '\n');
        Alert.alert('Alerta enviada al otro teléfono');
      } catch (error) {
        console.error('Error al enviar alerta al otro teléfono:', error);
        Alert.alert('Error al enviar la alerta al otro teléfono.');
      }
    } else if (isServerMode) {
      Alert.alert('Error', 'Estás en modo servidor. No puedes enviar alertas desde este teléfono.');
    } else {
      Alert.alert('El otro teléfono no está conectado', 'Conéctate al otro teléfono para enviar la alerta.');
    }
  };

  const getPriorityStyle = (prioridad: string) => {
    switch (prioridad) {
      case 'Baja':
        return styles['card-Baja'];
      case 'Media':
        return styles['card-Media'];
      case 'Alta':
        return styles['card-Alta'];
      default:
        return {};
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, containerStyle]}>
      <View style={[styles.card, cardStyle]}>
        <Text style={[styles.title, titleStyle]}>Modo de Conexión</Text>
        {isServerMode ? (
          <Text style={[styles.statusText, statusTextStyle]}>
            Modo: Servidor (Esperando Conexión)
          </Text>
        ) : (
          <Text style={[styles.statusText, statusTextStyle]}>
            Modo: Cliente (Enviando Alertas)
          </Text>
        )}
        {!isListening && !isServerMode && (
          <Button title="Iniciar como Servidor" onPress={startServerMode} />
        )}
      </View>

      <View style={[styles.card, cardStyle]}>
        <Text style={[styles.title, titleStyle]}>Dispositivo: {DEVICE_NAME}</Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: connectedToEsp32 ? 'green' : 'red' },
            ]}
          />
          <Text style={[styles.statusText, statusTextStyle]}>
            {connectedToEsp32 ? 'Conectado' : 'Desconectado'}
          </Text>
        </View>
        {!connectedToEsp32 ? (
          <Button title="Conectar al ESP32" onPress={connectToESP32} />
        ) : (
          <Button title="Revisar conexión" onPress={checkConnection} />
        )}
      </View>

      <View style={[styles.card, cardStyle]}>
        <Text style={[styles.title, titleStyle]}>Conexión con otro Teléfono</Text>
        <Text style={statusTextStyle}>Otro Teléfono: {otherPhoneDevice ? 'Emparejado' : 'No emparejado'}</Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: connectedToOtherPhone ? 'green' : 'red' },
            ]}
          />
          <Text style={[styles.statusText, statusTextStyle]}>
            {connectedToOtherPhone ? 'Conectado' : 'Desconectado'}
          </Text>
        </View>
        {permissionsGranted && !connectedToOtherPhone && !isServerMode && (
          <Button title="Conectar a otro Celular" onPress={connectToOtherPhone} />
        )}
        <Button title="Mostrar Dispositivos Vinculados" onPress={showBondedDevices} />
      </View>
      
      {!isServerMode && botones.map((alerta, index) => (
        <View key={index} style={[styles.card2, card2Style, getPriorityStyle(alerta.prioridad)]}>
          <Text style={[styles.title2, titleStyle]}>{alerta.nombre}</Text>
          <TouchableOpacity
            style={styles.boton}
            onPress={() => sendAlert(alerta)}
            disabled={!permissionsGranted}
          >
            <Text style={buttonTextStyle}>Enviar ALERTA</Text>
          </TouchableOpacity>
        </View>
      ))}
      
      {!isServerMode && (
        <View style={[styles.card2, card2Style]}>
          <Text style={[styles.title2, titleStyle]}>Nuevo Botón</Text>
          <TouchableOpacity
            style={styles.boton}
            onPress={() => navigation.navigate('NewBtn')}
            disabled={!permissionsGranted}
          >
            <Text style={[styles.buttonText, plusButtonTextStyle]}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: 16,
  },
  card: {
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
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },

  lightContainer: {
    backgroundColor: '#fff',
  },
  lightCard: {
    backgroundColor: '#f9f9f9',
  },
  lightCard2: {
    backgroundColor: '#f9f9f9',
  },
  lightTitle: {
    color: '#000',
  },
  lightStatusText: {
    color: '#000',
  },
  lightButtonText: {
    color: 'white',
  },
  lightPlusButtonText: {
    color: 'white',
  },

  darkContainer: {
    backgroundColor: '#121212',
  },
  darkCard: {
    backgroundColor: '#1e1e1e',
    shadowColor: '#fff',
  },
  darkCard2: {
    backgroundColor: '#1e1e1e',
    shadowColor: '#fff',
  },
  darkTitle: {
    color: '#fff',
  },
  darkStatusText: {
    color: '#ccc',
  },
  darkButtonText: {
    color: 'white',
  },
  darkPlusButtonText: {
    color: 'white',
  },
});

export default App;
