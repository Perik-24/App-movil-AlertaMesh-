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
import { useTheme } from '../ThemeContext'; // Importamos el hook useTheme

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
const OTHER_PHONE_NAME = 'S22+ de Perik24'; // Nombre del otro teléfono para la conexión

const App = () => {

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Tabs'>>();
  const route = useRoute<HomeRouteProp>();
  const [esp32Device, setEsp32Device] = useState<BluetoothDevice | null>(null);
  const [otherPhoneDevice, setOtherPhoneDevice] = useState<BluetoothDevice | null>(null);
  const [connectedToEsp32, setConnectedToEsp32] = useState(false);
  const [connectedToOtherPhone, setConnectedToOtherPhone] = useState(false);
  const [connected, setConnected] = useState(false);
  const [botones, setBotones] = useState<BotonAlerta[]>([]);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const { isDarkMode } = useTheme();

  // ***** CAMBIOS PARA EL MODO OSCURO *****
  // Ahora definimos los estilos condicionales para todos los elementos
  const containerStyle = isDarkMode ? styles.darkContainer : styles.lightContainer;
  const cardStyle = isDarkMode ? styles.darkCard : styles.lightCard;
  const card2Style = isDarkMode ? styles.darkCard2 : styles.lightCard2;
  const titleStyle = isDarkMode ? styles.darkTitle : styles.lightTitle;
  const statusTextStyle = isDarkMode ? styles.darkStatusText : styles.lightStatusText;
  const buttonTextStyle = isDarkMode ? styles.darkButtonText : styles.lightButtonText;
  const plusButtonTextStyle = isDarkMode ? styles.darkPlusButtonText : styles.lightPlusButtonText;
  // ***************************************

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
    const checkAndSetup = async () => {
      const granted = await requestPermissions();
      if (granted) {
        setPermissionsGranted(true);
        const db = await getDBConnection();
        await createTables(db);
        await checkConnection();
        await cargarBotones();
        //await dropTables(db); // Elimina las tablas si es necesario
      } else {
        setPermissionsGranted(false);
        Alert.alert('Permisos necesarios', 'La aplicación necesita permisos de Bluetooth para funcionar.');
      }
    };
    checkAndSetup();
  }, []);

  // La función ahora devuelve un booleano para indicar si los permisos se concedieron
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
    // En iOS, los permisos se manejan de otra forma, asumimos que están concedidos
    return true;
  };

  const checkConnection = async () => {
    // Solo ejecuta si los permisos están concedidos
    if (!permissionsGranted) return;

    try {
      const bondedDevices = await RNBluetoothClassic.getBondedDevices();
      const esp32 = bondedDevices.find(d => d.name === DEVICE_NAME);
      const otherPhone = bondedDevices.find(d => d.name === OTHER_PHONE_NAME);

      if (esp32) {
        const isConnected = await esp32.isConnected();
        setConnected(isConnected);
        setEsp32Device(esp32);
      } else {
        setConnected(false);
        setEsp32Device(null);
      }
      if (otherPhone) {
        setOtherPhoneDevice(otherPhone);
      } else {
        setOtherPhoneDevice(null);
      }
    } catch (error) {
      console.error('Error verificando conexión:', error);
      setConnected(false);
      setEsp32Device(null);
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
      const connected = await esp32.connect();
      if (connected) {
        setEsp32Device(esp32);
        setConnected(true);
        Alert.alert('Conectado con ESP32');
      }
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
      Alert.alert('Conectado con el otro teléfono');
    } catch (err) {
      console.error('Error al conectar con el otro teléfono:', err);
      Alert.alert('Error de conexión', 'No se pudo conectar con el otro teléfono. ¿Está visible y emparejado?');
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
    const alertasCompletas = await getAlertas(db);

    // Enviar a ESP32
    if (esp32Device && connected) {
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

    // Enviar al otro teléfono
    if (otherPhoneDevice && await otherPhoneDevice.isConnected()) {
      try {
        const dataToSend = JSON.stringify({
          alerta: { tipo: alerta.nombre, mensaje: alerta.mensaje, fecha: fecha, prioridad: alerta.prioridad },
          historial: alertasCompletas
        });
        await otherPhoneDevice.write(dataToSend + '\n');
        Alert.alert('Alerta enviada al otro teléfono');
      } catch (error) {
        console.error('Error al enviar alerta al otro teléfono:', error);
        Alert.alert('Error al enviar la alerta al otro teléfono.');
      }
    } else {
      Alert.alert('El otro teléfono no está conectado', 'Conéctate al otro teléfono para enviar la alerta.');
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
    <ScrollView contentContainerStyle={[styles.container, containerStyle]}>
      <View style={[styles.card, cardStyle]}>
        <Text style={[styles.title, titleStyle]}>Dispositivo: {DEVICE_NAME}</Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: connected ? 'green' : 'red' },
            ]}
          />
          <Text style={[styles.statusText, statusTextStyle]}>
            {connected ? 'Conectado' : 'Desconectado'}
          </Text>
        </View>
        {!connected ? (
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
        {permissionsGranted && !connectedToOtherPhone && (
          <Button title="Conectar a otro Celular" onPress={connectToOtherPhone} />
        )}
      </View>


      {botones.map((alerta, index) => (
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  // ***** Estilos Generales y Comunes *****
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

  // ***** Estilos para el Modo Claro *****
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

  // ***** Estilos para el Modo Oscuro *****
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
