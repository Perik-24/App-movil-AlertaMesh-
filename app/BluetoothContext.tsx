// BluetoothContext.js
import React, { createContext, useState, useContext, useCallback, useRef, useEffect } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';

// Definimos el contexto de Bluetooth
const BluetoothContext = createContext(null);

// Un hook personalizado para usar el contexto de forma más sencilla
export const useBluetooth = () => useContext(BluetoothContext);

// Nombre del otro teléfono para la conexión. Deberías cambiar esto al nombre de tu otro teléfono.
const OTHER_PHONE_NAME = 'S22+ de Perik24';

// Componente que provee el contexto a toda la aplicación
export const BluetoothProvider = ({ children }) => {
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isServerMode, setIsServerMode] = useState(false);
  const [otherPhoneDevice, setOtherPhoneDevice] = useState<BluetoothDevice | null>(null);
  const [connectedToOtherPhone, setConnectedToOtherPhone] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Referencia para la suscripción al listener de datos.
  const otherPhoneListener = useRef<any>(null);

  // Función para solicitar permisos de Bluetooth en Android
  const requestPermissions = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        const granted = (
          result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
          result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
          result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED
        );
        setPermissionsGranted(granted);
        return granted;
      } catch (err) {
        console.error('Error al solicitar permisos de Bluetooth:', err);
        return false;
      }
    }
    setPermissionsGranted(true);
    return true;
  }, []);

  // Función para iniciar el modo servidor
  const startServerMode = useCallback(async () => {
    if (!permissionsGranted) {
      Alert.alert('Permisos no concedidos', 'Por favor, concede los permisos de Bluetooth para continuar.');
      return;
    }
    try {
      setIsListening(true);
      Alert.alert('Modo Servidor', 'Esperando conexión entrante...');
      const connection = await RNBluetoothClassic.accept({});
      setIsListening(false);
      setIsServerMode(true);
      setOtherPhoneDevice(connection);
      setConnectedToOtherPhone(true);

      const subscription = connection.onDataReceived(async (data: DataReceivedEvent) => {
        try {
          if (data.data) {
            Alert.alert(
              '¡ALERTA RECIBIDA!',
              'Se recibió una notificación simple desde el otro teléfono.',
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
  }, [permissionsGranted]);

  // Función para conectar a otro teléfono en modo cliente
  const connectToOtherPhone = useCallback(async () => {
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
  }, [permissionsGranted]);

  // Función para desconectarse
  const disconnect = useCallback(async () => {
    if (otherPhoneDevice) {
      try {
        await otherPhoneDevice.disconnect();
        setConnectedToOtherPhone(false);
        setOtherPhoneDevice(null);
        if (otherPhoneListener.current) {
          otherPhoneListener.current.remove();
        }
        setIsServerMode(false);
        Alert.alert('Desconectado', 'La conexión Bluetooth se ha cerrado.');
      } catch (err) {
        console.error('Error al desconectar:', err);
        Alert.alert('Error', 'No se pudo desconectar correctamente.');
      }
    }
  }, [otherPhoneDevice]);

  // Chequeamos los permisos al cargar la app
  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  // El valor que proveerá el contexto
  const value = {
    permissionsGranted,
    isServerMode,
    connectedToOtherPhone,
    otherPhoneDevice,
    isListening,
    startServerMode,
    connectToOtherPhone,
    disconnect,
  };

  return (
    <BluetoothContext.Provider value={value}>
      {children}
    </BluetoothContext.Provider>
  );
};

