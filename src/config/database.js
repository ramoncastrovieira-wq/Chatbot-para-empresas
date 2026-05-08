const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

/**
 * Carregamento simples de .env sem depender do pacote dotenv.
 * Isso evita o problema do projeto ter .env, mas process.env continuar vazio.
 */
function loadEnvFile() {
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env')
  ];

  for (const envPath of possiblePaths) {
    if (!fs.existsSync(envPath)) continue;

    const content = fs.readFileSync(envPath, 'utf8');

    content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .forEach(line => {
        const equalIndex = line.indexOf('=');
        if (equalIndex === -1) return;

        const key = line.slice(0, equalIndex).trim();
        let value = line.slice(equalIndex + 1).trim();

        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        if (!process.env[key]) {
          process.env[key] = value;
        }
      });

    console.log(`Arquivo .env carregado: ${envPath}`);
    break;
  }
}

loadEnvFile();

const DATABASE_URL = process.env.DATABASE_URL;

function createPool() {
  if (DATABASE_URL && DATABASE_URL.trim()) {
    return new Pool({
      connectionString: DATABASE_URL.trim()
    });
  }

  const config = {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'chatbot',
    user: process.env.PGUSER || 'postgres',
    password: String(process.env.PGPASSWORD || '')
  };

  if (!config.password) {
    console.error(`
ERRO DE CONFIGURAÇÃO DO POSTGRESQL

A senha do PostgreSQL não foi informada.

Crie um arquivo .env na raiz do projeto com uma destas opções:

Opção 1:
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/chatbot

Ou opção 2:
PGHOST=localhost
PGPORT=5432
PGDATABASE=chatbot
PGUSER=postgres
PGPASSWORD=SUA_SENHA

Depois reinicie o servidor.
`);
  }

  return new Pool(config);
}

const pool = createPool();

function convertQuery(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => {
    idx += 1;
    return `$${idx}`;
  });
}

function maybeReturnId(sql) {
  if (/^\s*INSERT\b/i.test(sql) && !/\bRETURNING\b/i.test(sql)) {
    return sql + ' RETURNING id';
  }
  return sql;
}

const db = {
  all(sql, params, cb) {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }

    pool.query(convertQuery(sql), params || [])
      .then(res => cb && cb(null, res.rows))
      .catch(err => cb && cb(err));
  },

  get(sql, params, cb) {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }

    pool.query(convertQuery(sql), params || [])
      .then(res => cb && cb(null, (res.rows && res.rows[0]) ? res.rows[0] : null))
      .catch(err => cb && cb(err));
  },

  run(sql, paramsOrCb, cb) {
    let params = [];
    let callback = null;

    if (typeof paramsOrCb === 'function') {
      callback = paramsOrCb;
    } else {
      params = paramsOrCb || [];
      callback = cb;
    }

    const sqlToExec = maybeReturnId(sql);

    pool.query(convertQuery(sqlToExec), params)
      .then(res => {
        if (callback) {
          const ctx = {
            lastID: (res.rows && res.rows[0]) ? res.rows[0].id : undefined,
            changes: res.rowCount
          };
          callback.call(ctx, null);
        }
      })
      .catch(err => {
        if (callback) callback(err);
      });
  },

  prepare(sql) {
    const sqlToExec = maybeReturnId(sql);

    return {
      run(paramsOrCb, cb) {
        let params = [];
        let callback = null;

        if (typeof paramsOrCb === 'function') {
          callback = paramsOrCb;
        } else {
          params = paramsOrCb || [];
          callback = cb;
        }

        pool.query(convertQuery(sqlToExec), params)
          .then(res => {
            if (callback) {
              const ctx = {
                lastID: (res.rows && res.rows[0]) ? res.rows[0].id : undefined,
                changes: res.rowCount
              };
              callback.call(ctx, null);
            }
          })
          .catch(err => {
            if (callback) callback(err);
          });
      },

      finalize() {
        // Compatibilidade com sqlite.
      }
    };
  },

  pool
};

async function seedDefaultAdmin() {
  const adminPassword = 'admin123';
  const hash = bcrypt.hashSync(adminPassword, 10);

  async function upsertUser(username, passwordHash, role) {
    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1 LIMIT 1',
      [username]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE users
         SET password_hash = $1,
             role = $2
         WHERE username = $3`,
        [passwordHash, role, username]
      );
      return;
    }

    await pool.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, $3)`,
      [username, passwordHash, role]
    );
  }

  await upsertUser('admin', hash, 'admin');
  await upsertUser('admin@tico.local', hash, 'admin');

  console.log('Admin padrão disponível: admin / admin123');
  console.log('Admin alternativo disponível: admin@tico.local / admin123');
}

(async function init() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT,
      telefone TEXT,
      endereco TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS pecas (
      id SERIAL PRIMARY KEY,
      codigo TEXT,
      nome TEXT NOT NULL,
      descricao TEXT,
      preco NUMERIC DEFAULT 0,
      estoque INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      from_jid TEXT,
      to_jid TEXT,
      body TEXT,
      direction TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      jid TEXT UNIQUE,
      name TEXT,
      phone TEXT,
      profile_picture TEXT,
      last_message_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS attendants (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      password_hash TEXT,
      role TEXT DEFAULT 'attendant',
      online BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS queues (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      description TEXT,
      menu_option TEXT UNIQUE,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await pool.query(`ALTER TABLE queues ADD COLUMN IF NOT EXISTS slug TEXT`);
    await pool.query(`ALTER TABLE queues ADD COLUMN IF NOT EXISTS menu_option TEXT`);
    await pool.query(`ALTER TABLE queues ADD COLUMN IF NOT EXISTS description TEXT`);
    await pool.query(`ALTER TABLE queues ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true`);

    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS queues_slug_unique ON queues(slug) WHERE slug IS NOT NULL`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS queues_menu_option_unique ON queues(menu_option) WHERE menu_option IS NOT NULL`);

    await pool.query(`CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      contact_id INTEGER REFERENCES contacts(id),
      assigned_attendant_id INTEGER REFERENCES attendants(id),
      queue_id INTEGER REFERENCES queues(id),
      status TEXT DEFAULT 'pending',
      started_at TIMESTAMP,
      closed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id INTEGER`);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_type TEXT`);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id INTEGER`);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS content TEXT`);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT`);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS timestamp BIGINT`);

    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    const defaultQueues = [
      ['Várzea Paulista (Centro)', 'varzea-centro', 'Fila da unidade Várzea Paulista Centro', '1'],
      ['Várzea Paulista (Jd. América)', 'varzea-jd-america', 'Fila da unidade Várzea Paulista Jardim América', '2'],
      ['Francisco Morato', 'francisco-morato', 'Fila da unidade Francisco Morato', '3'],
      ['Taipas', 'taipas', 'Fila da unidade Taipas', '4']
    ];

    for (const [name, slug, description, menuOption] of defaultQueues) {
      const existingQueue = await pool.query(
        'SELECT id FROM queues WHERE slug = $1 LIMIT 1',
        [slug]
      );

      if (existingQueue.rows.length > 0) {
        await pool.query(
          `UPDATE queues
           SET name = $1,
               description = $2,
               menu_option = $3,
               active = true
           WHERE slug = $4`,
          [name, description, menuOption, slug]
        );
      } else {
        await pool.query(
          `INSERT INTO queues (name, slug, description, menu_option, active)
           VALUES ($1, $2, $3, $4, true)`,
          [name, slug, description, menuOption]
        );
      }
    }

    await seedDefaultAdmin();

    console.log('Postgres DB initialized');
  } catch (err) {
    console.error('Error initializing Postgres DB', err && err.message ? err.message : err);
  }
})();

module.exports = db;
