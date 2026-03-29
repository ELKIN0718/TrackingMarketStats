const express = require('express');
const cors = require('cors');
const axios = require('axios'); 
const pool = require('./db'); // para base de datos
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Backend funcionando correctamente');
});

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      message: 'Conexion a PostgreSQL exitosa',
      time: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Error conectando con PostgreSQL',
      error: error.message
    });
  }
});

// ── Rutas de Meta ────────────────────────

// PASO 1: Redirige al login de Facebook
app.get('/api/meta/connect', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: process.env.META_REDIRECT_URI,
    scope: 'ads_read,ads_management',
    response_type: 'code',
  });

  res.redirect(`https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`);
});

// PASO 2: Facebook nos devuelve el código → lo cambiamos por un token
app.get('/api/meta/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).json({ error: 'El usuario rechazó el acceso a Meta.' });
  }

  try {
    // Intercambiar código por access token
    const tokenRes = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
      params: {
        client_id:     process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri:  process.env.META_REDIRECT_URI,
        code,
      },
    });

    const accessToken = tokenRes.data.access_token;

    // Obtener nombre e ID del usuario de Meta
    const userRes = await axios.get('https://graph.facebook.com/v20.0/me', {
      params: { access_token: accessToken, fields: 'id,name' },
    });

    const { id: metaUserId, name: metaUserName } = userRes.data;

    // Guardar token en la base de datos
    await pool.query(
      `INSERT INTO meta_connections (meta_user_id, meta_user_name, access_token)
       VALUES ($1, $2, $3)
       ON CONFLICT (meta_user_id)
       DO UPDATE SET access_token = $3, updated_at = NOW()`,
      [metaUserId, metaUserName, accessToken]
    );

    res.json({ mensaje: `✅ Conectado como: ${metaUserName}`, meta_user_id: metaUserId });

  } catch (err) {
    console.error('Error Meta callback:', err.response?.data || err.message);
    res.status(500).json({ error: 'Error al conectar con Meta', detalle: err.message });
  }
});

// PASO 3: Obtener cuentas publicitarias de un usuario
app.get('/api/meta/adaccounts/:meta_user_id', async (req, res) => {
  const { meta_user_id } = req.params;

  try {
    const result = await pool.query(
      'SELECT access_token FROM meta_connections WHERE meta_user_id = $1',
      [meta_user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no conectado a Meta' });
    }

    const { access_token } = result.rows[0];

    const response = await axios.get('https://graph.facebook.com/v20.0/me/adaccounts', {
      params: {
        access_token,
        fields: 'id,name,account_status,currency',
      },
    });

    res.json(response.data);

  } catch (err) {
    console.error('Error adaccounts:', err.response?.data || err.message);
    res.status(500).json({ error: 'Error al consultar Meta', detalle: err.message });
  }
});

// ── Fin Rutas de Meta ────────────────────────

// ── Ruta temporal ────────────────────────
app.get('/api/meta/me/:meta_user_id', async (req, res) => {
  const { meta_user_id } = req.params;

  try {
    const result = await pool.query(
      'SELECT access_token FROM meta_connections WHERE meta_user_id = $1',
      [meta_user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no conectado a Meta' });
    }

    const { access_token } = result.rows[0];

    const response = await axios.get('https://graph.facebook.com/v20.0/me', {
      params: {
        access_token,
        fields: 'id,name',
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Error al consultar /me', detalle: err.message });
  }
});
// ── Fin Ruta temporal ────────────────────────

//  Ruta métricas
app.get('/api/meta/insights/:meta_user_id/:ad_account_id', async (req, res) => {
  const { meta_user_id, ad_account_id } = req.params;
  const cleanAdAccountId = ad_account_id.replace('act_', '');

  try {
    const result = await pool.query(
      'SELECT access_token FROM meta_connections WHERE meta_user_id = $1',
      [meta_user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no conectado a Meta' });
    }

    const { access_token } = result.rows[0];

    const response = await axios.get(
      `https://graph.facebook.com/v20.0/act_${cleanAdAccountId}/insights`,
      {
        params: {
          access_token,
          fields: 'campaign_name,impressions,reach,clicks,spend,ctr,cpc',
          date_preset: 'last_30d'
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error('Error insights:', err.response?.data || err.message);
    res.status(500).json({ error: 'Error al traer insights', detalle: err.message });
  }
});
//  Fin Ruta métricas

//Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
