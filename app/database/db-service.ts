import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

export const getDBConnection = async () => {
  return SQLite.openDatabase({ name: 'Alerta_Mesh.db', location: 'default' });
};

export const dropTables = async (db: SQLite.SQLiteDatabase) => {
    await db.executeSql('DROP TABLE IF EXISTS BotonesNuevos;');
    await db.executeSql('DROP TABLE IF EXISTS Alertas;');
};
     
// Crear la tabla si no existe
export const createTables = async (db: SQLite.SQLiteDatabase) => {
// Tabla para los botones personalizados
    const botonesQuery = `
        CREATE TABLE IF NOT EXISTS BotonesNuevos (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Nombre TEXT NOT NULL,
            Prioridad TEXT NOT NULL
        );
    `;

  const query = `
    CREATE TABLE IF NOT EXISTS Alertas (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      TIPO_ALERTA TEXT,
      MENSAJE TEXT,
      FECHA TEXT,
      PRIORIDAD TEXT
    );
  `;
  await db.executeSql(query);
  await db.executeSql(botonesQuery);
};

export const insertBoton = async (db: SQLite.SQLiteDatabase, nombre: string, prioridad: string) => {
  const query = `INSERT INTO BotonesNuevos (Nombre, Prioridad) VALUES (?, ?);`;
  await db.executeSql(query, [nombre, prioridad]);
};

// Insertar una alerta
export const insertAlerta = async (db: SQLite.SQLiteDatabase, tipo: string, mensaje: string, fecha: string, prioridad: string) => {
  const query = `INSERT INTO Alertas (TIPO_ALERTA, MENSAJE, FECHA, PRIORIDAD) VALUES (?, ?, ?, ?);`;
  await db.executeSql(query, [tipo, mensaje, fecha, prioridad]);
};

// Eliminar una alerta por ID
export const deleteAlertaById = async (db: SQLite.SQLiteDatabase, id: number) => {
  const query = `DELETE FROM Alertas WHERE Id = ?;`;
  await db.executeSql(query, [id]);
};

// Eliminar todas las alertas
export const deleteAllAlertas = async (db: SQLite.SQLiteDatabase) => {
  const query = `DELETE FROM Alertas;`;
  await db.executeSql(query);
};

// Obtener todas las alertas
export const getAlertas = async (db: SQLite.SQLiteDatabase) => {
  const results = await db.executeSql(`SELECT * FROM Alertas ORDER BY Id DESC;`);
  const alertas: any[] = [];

  results.forEach(result => {
    for (let i = 0; i < result.rows.length; i++) {
      alertas.push(result.rows.item(i));
    }
  });
  return alertas;
};

export const getBotones = async (db: SQLite.SQLiteDatabase) => {
    try {
        const results = await db.executeSql('SELECT * FROM BotonesNuevos');
        const botones: { Nombre: string; Prioridad: string }[] = [];
        results.forEach(result => {
            for (let i = 0; i < result.rows.length; i++) {
                botones.push(result.rows.item(i));
            }
        });
        return botones;
    } catch (error) {
        console.error('Error getting botones:', error);
        return [];
    }
};