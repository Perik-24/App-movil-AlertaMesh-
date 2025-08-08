import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

export const getDBConnection = async () => {
  return SQLite.openDatabase({ name: 'Alerta_Mesh.db', location: 'default' });
};

// Crear la tabla si no existe
export const createTable = async (db: SQLite.SQLiteDatabase) => {
  const query = `
    CREATE TABLE IF NOT EXISTS Alertas (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      TIPO_ALERTA TEXT,
      MENSAJE TEXT,
      FECHA TEXT
    );
  `;
  await db.executeSql(query);
};

// Insertar una alerta
export const insertAlerta = async (db: SQLite.SQLiteDatabase, tipo: string, mensaje: string, fecha: string) => {
  const query = `INSERT INTO Alertas (TIPO_ALERTA, MENSAJE, FECHA) VALUES (?, ?, ?);`;
  await db.executeSql(query, [tipo, mensaje, fecha]);
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
  const results = await db.executeSql(`SELECT * FROM alertas ORDER BY Id DESC;`);
  const alertas: any[] = [];

  results.forEach(result => {
    for (let i = 0; i < result.rows.length; i++) {
      alertas.push(result.rows.item(i));
    }
  });
  return alertas;
};