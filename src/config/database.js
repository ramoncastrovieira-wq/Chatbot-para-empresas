const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/chatbot';
const pool = new Pool({ connectionString });

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
    if (typeof params === 'function') { cb = params; params = []; }
    pool.query(convertQuery(sql), params || [])
      .then(res => cb && cb(null, res.rows))
      .catch(err => cb && cb(err));
  },
  get(sql, params, cb) {
    if (typeof params === 'function') { cb = params; params = []; }
    pool.query(convertQuery(sql), params || [])
      .then(res => cb && cb(null, (res.rows && res.rows[0]) ? res.rows[0] : null))
      .catch(err => cb && cb(err));
  },
  run(sql, paramsOrCb, cb) {
    let params = [];
    let callback = null;
    if (typeof paramsOrCb === 'function') { callback = paramsOrCb; }
    else { params = paramsOrCb || []; callback = cb; }
    const sqlToExec = maybeReturnId(sql);
    pool.query(convertQuery(sqlToExec), params)
      .then(res => {
        if (callback) {
          const ctx = { lastID: (res.rows && res.rows[0]) ? res.rows[0].id : undefined, changes: res.rowCount };
          callback.call(ctx, null);
        }
      })
      .catch(err => { if (callback) callback(err); });
  },
  prepare(sql) {
    const sqlToExec = maybeReturnId(sql);
    return {
      run(paramsOrCb, cb) {
        let params = [];
        let callback = null;
        if (typeof paramsOrCb === 'function') { callback = paramsOrCb; }
        else { params = paramsOrCb || []; callback = cb; }
        pool.query(convertQuery(sqlToExec), params)
          .then(res => {
            if (callback) {
              const ctx = { lastID: (res.rows && res.rows[0]) ? res.rows[0].id : undefined, changes: res.rowCount };
              callback.call(ctx, null);
            }
          })
          .catch(err => { if (callback) callback(err); });
      },
      finalize() { /* noop for compatibility */ }
    };
  }
};

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

    // Contacts table (WhatsApp contacts)
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

    // Attendants (agents)
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

    // Queues
    await pool.query(`CREATE TABLE IF NOT EXISTS queues (
      id SERIAL PRIMARY KEY,
      name TEXT,
      description TEXT,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Conversations
    await pool.query(`CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      contact_id INTEGER REFERENCES contacts(id),
      assigned_attendant_id INTEGER REFERENCES attendants(id),
      queue_id INTEGER REFERENCES queues(id),
      status TEXT DEFAULT 'open',
      started_at TIMESTAMP,
      closed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Ensure messages table has upgraded columns for the new domain model
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

    console.log('Postgres DB initialized');
  } catch (err) {
    console.error('Error initializing Postgres DB', err && err.message ? err.message : err);
  }
})();

module.exports = db;
