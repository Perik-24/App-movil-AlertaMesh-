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
  ActivityIndicator,
  SafeAreaView,
  Dimensions
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
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Icon from 'react-native-vector-icons/Ionicons';

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
const { height } = Dimensions.get('window');

const App = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Tabs'>>();
  //const route = useRoute<HomeRouteProp>();
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
  const cardTitleStyle = isDarkMode ? styles.darkCardTitle : styles.lightCardTitle;
  const cardStatusTextStyle = isDarkMode ? styles.darkCardStatusText : styles.lightCardStatusText;
  const buttonStyle = isDarkMode ? styles.darkButton : styles.lightButton;
  const buttonTextStyle = isDarkMode ? styles.darkButtonText : styles.lightButtonText;

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
              'Se recibió una alerta desde el otro teléfono.'
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
        return styles.cardBaja;
      case 'Media':
        return styles.cardMedia;
      case 'Alta':
        return styles.cardAlta;
      default:
        return {};
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, containerStyle]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>

        {/* Tarjeta de Estado de Conexión */}
        <View style={[styles.card, cardStyle]}>
          <Text style={[styles.cardTitle, cardTitleStyle]}>Estado</Text>
          <View style={styles.cardStatusRow}>
            <Text style={[styles.statusTitle, cardTitleStyle]}>Estado de la Conexión:</Text>
            <Text style={[styles.statusText, { color: connectedToEsp32 || connectedToOtherPhone ? '#4CAF50' : '#F44336' }]}>
              {connectedToEsp32 || connectedToOtherPhone ? 'Conectado' : 'Desconectado'}
            </Text>
          </View>
        </View>

        {/* Tarjeta de Modo de Conexión */}
        <View style={[styles.card, cardStyle]}>
          <Text style={[styles.cardTitle, cardTitleStyle]}>Modo de Conexión</Text>
          <View style={styles.connectionModeContainer}>
            <View style={styles.modeTextContainer}>
              <Text style={[styles.modeText, cardStatusTextStyle]}>Modo Cliente</Text>
            </View>
            <View style={styles.modeTextContainer}>
              <Text style={[styles.modeText, cardStatusTextStyle]}>Modo Servidor</Text>
            </View>
          </View>
        </View>

        {/* Sección de botones de conexión */}
        <View style={styles.buttonGroup}>
          {!connectedToEsp32 && (
            <TouchableOpacity style={[styles.actionButton, buttonStyle]} onPress={connectToESP32}>
              <Text style={buttonTextStyle}>Conectar ESP32</Text>
            </TouchableOpacity>
          )}
          {!connectedToOtherPhone && !isServerMode && (
            <TouchableOpacity style={[styles.actionButton, buttonStyle]} onPress={connectToOtherPhone}>
              <Text style={buttonTextStyle}>Conectar Teléfono</Text>
            </TouchableOpacity>
          )}
          {!isServerMode && !isListening && (
            <TouchableOpacity style={[styles.actionButton, buttonStyle]} onPress={startServerMode}>
              <Text style={buttonTextStyle}>Iniciar como Servidor</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sección de Botones de Alerta */}
        {!isServerMode && (
          <>
            <Text style={[styles.sectionTitle, cardTitleStyle]}>Mis Botones de Alerta</Text>
            <View style={styles.alertButtonsList}>
              {botones.map((alerta, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.alertButton, getPriorityStyle(alerta.prioridad), cardStyle]}
                  onPress={() => sendAlert(alerta)}
                  disabled={!permissionsGranted || (!connectedToEsp32 && !connectedToOtherPhone)}
                >
                  <Text style={[styles.alertButtonText, cardTitleStyle]}>{alerta.nombre}</Text>
                  <Text style={[styles.alertButtonPriorityText, cardStatusTextStyle]}>Prioridad: {alerta.prioridad}</Text>
                </TouchableOpacity>
              ))}
              {/* Botón para agregar nuevo */}
              <TouchableOpacity
                style={[styles.alertButton, styles.addButton, cardStyle]}
                onPress={() => navigation.navigate('NewBtn')}
                disabled={!permissionsGranted}
              >
                <MaterialIcons name="add-circle-outline" size={30} color={isDarkMode ? "#E0E0E0" : "#212121"} />
                <Text style={[styles.addButtonText, cardTitleStyle]}>Nuevo Botón</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {isListening && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={isDarkMode ? "#E0E0E0" : "#212121"} />
            <Text style={[styles.loadingText, cardStatusTextStyle]}>Esperando conexión entrante...</Text>
          </View>
        )}
      </ScrollView>
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    alignItems: 'center',
    flexGrow: 1,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    alignSelf: 'center',
  },
  card: {
    width: '100%',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  connectionModeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 5,
  },
  modeTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  modeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonGroup: {
    width: '100%',
    flexDirection: 'column',
    gap: 15,
    marginTop: 5,
  },
  actionButton: {
    width: '100%',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  alertButtonsList: {
    width: '100%',
    marginTop: 10,
  },
  alertButton: {
    width: '100%',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  alertButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  alertButtonPriorityText: {
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 0,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 16,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#444444',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
  },
  
  // Paleta de colores para Prioridades
  cardBaja: { borderLeftColor: '#4CAF50' },
  cardMedia: { borderLeftColor: '#FFC107' },
  cardAlta: { borderLeftColor: '#F44336' },

  // Estilos de Tema Claro
  lightContainer: { backgroundColor: '#F0F2F5' },
  lightCard: { backgroundColor: '#FFFFFF', shadowColor: '#000' },
  lightCardTitle: { color: '#212121' },
  lightCardStatusText: { color: '#616161' },
  lightButton: { backgroundColor: '#E0E0E0' },
  lightButtonText: { color: '#212121', fontWeight: 'bold' },
  lightNavbar: { backgroundColor: '#FFFFFF', borderTopColor: '#E0E0E0' },
  
  // Estilos de Tema Oscuro
  darkContainer: { backgroundColor: '#1C1C1E' },
  darkCard: { backgroundColor: '#2C2C2E', shadowColor: '#fff' },
  darkCardTitle: { color: '#E0E0E0' },
  darkCardStatusText: { color: '#B0B0B0' },
  darkButton: { backgroundColor: '#2C2C2E' },
  darkButtonText: { color: '#E0E0E0', fontWeight: 'bold' },
  darkNavbar: { backgroundColor: '#2A2A2A', borderTopColor: '#444444' },
});

export default App;