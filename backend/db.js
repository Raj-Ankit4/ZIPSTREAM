import mysql from "mysql2/promise";
export const db = await mysql.createPool({
  host: "db",
  user: "root",
  password: "root",
  database: "uploader"
});