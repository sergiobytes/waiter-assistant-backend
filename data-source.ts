import 'dotenv/config';
import { DataSource } from 'typeorm';
import { join } from 'path';

const isProd = process.env.NODE_ENV === 'production';
const ext = isProd ? 'js' : 'ts';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // SSL en producción (ajústalo si tu proveedor exige otra config)
  ssl: isProd ? { rejectUnauthorized: false } : false,

  synchronize: false,

  // OJO: desde dist/, __dirname ya apunta a /dist
  entities: [join(__dirname, `**/*.entity.${ext}`)],
  migrations: [join(__dirname, `database/migrations/*.${ext}`)],
});
