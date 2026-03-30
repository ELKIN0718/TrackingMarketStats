const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');
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
  const { restaurant_id } = req.query;

  if (!restaurant_id) {
    return res.status(400).json({ error: 'Falta restaurant_id' });
  }

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: `${process.env.META_REDIRECT_URI}?restaurant_id=${restaurant_id}`,
    scope: 'ads_read,ads_management',
    response_type: 'code',
  });

  res.redirect(`https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`);
});

// PASO 2: Facebook nos devuelve el código → lo cambiamos por un token
app.get('/api/meta/callback', async (req, res) => {
  const { code, error, restaurant_id } = req.query;

  if (error) {
    return res.status(400).json({ error: 'El usuario rechazó el acceso a Meta.' });
  }

  if (!restaurant_id) {
    return res.status(400).json({ error: 'Falta restaurant_id en el callback.' });
  }

  try {
    const tokenRes = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
      params: {
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri: `${process.env.META_REDIRECT_URI}?restaurant_id=${restaurant_id}`,
        code,
      },
    });

    const accessToken = tokenRes.data.access_token;

    const userRes = await axios.get('https://graph.facebook.com/v20.0/me', {
      params: {
        access_token: accessToken,
        fields: 'id,name',
      },
    });

    const { id: metaUserId, name: metaUserName } = userRes.data;

    await pool.query(
      `INSERT INTO meta_connections (restaurant_id, meta_user_id, meta_user_name, access_token)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (restaurant_id)
       DO UPDATE SET
         meta_user_id = $2,
         meta_user_name = $3,
         access_token = $4,
         updated_at = NOW()`,
      [restaurant_id, metaUserId, metaUserName, accessToken]
    );

    //res.json({
    //  mensaje: `✅ Meta conectada correctamente para el restaurante ${restaurant_id}`,
    //  restaurant_id,
    //  meta_user_id: metaUserId,
    //  meta_user_name: metaUserName
    //});

    return res.redirect('http://localhost:5500/frontend/dashboard.html?meta=connected');

  } catch (err) {
    console.error('Error Meta callback:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Error al conectar con Meta',
      detalle: err.response?.data || err.message
    });
  }
});

// PASO 3: Obtener cuentas publicitarias de un usuario
app.get('/api/meta/adaccounts/:restaurant_id', async (req, res) => {
  const { restaurant_id } = req.params;

  try {
    const result = await pool.query(
      'SELECT access_token FROM meta_connections WHERE restaurant_id = $1',
      [restaurant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurante no conectado a Meta' });
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
app.get('/api/meta/me/:restaurant_id', async (req, res) => {
  const { restaurant_id } = req.params;

  try {
    const result = await pool.query(
      'SELECT access_token FROM meta_connections WHERE restaurant_id = $1',
      [restaurant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurante no conectado a Meta' });
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
app.get('/api/meta/insights/:restaurant_id/:ad_account_id', async (req, res) => {
  const { restaurant_id, ad_account_id } = req.params;
  const cleanAdAccountId = ad_account_id.replace('act_', '');

  try {
    const result = await pool.query(
      'SELECT access_token FROM meta_connections WHERE restaurant_id = $1',
      [restaurant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurante no conectado a Meta' });
    }

    const { access_token } = result.rows[0];

    const response = await axios.get(
      `https://graph.facebook.com/v20.0/act_${cleanAdAccountId}/insights`,
      {
        params: {
          access_token,
          level: 'campaign',
          fields: 'campaign_id,campaign_name,impressions,reach,clicks,spend,ctr,cpc',
          date_preset: 'last_30d'
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error('Error insights:', err.response?.data || err.message);
    res.status(500).json({ error: 'Error al traer insights', detalle: err.response?.data || err.message });
  }
});
//  Fin Ruta métricas

app.get('/api/meta/insights-age/:restaurant_id/:ad_account_id', async (req, res) => {
  const { restaurant_id, ad_account_id } = req.params;
  const { campaign_id } = req.query;
  const cleanAdAccountId = ad_account_id.replace('act_', '');

  try {
    const result = await pool.query(
      'SELECT access_token FROM meta_connections WHERE restaurant_id = $1',
      [restaurant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurante no conectado a Meta' });
    }

    const { access_token } = result.rows[0];

    const params = {
      access_token,
      level: 'campaign',
      fields: 'campaign_id,campaign_name,impressions,reach,clicks,spend',
      breakdowns: 'age,gender',
      date_preset: 'last_30d'
    };

    if (campaign_id && campaign_id !== 'all') {
      params.filtering = JSON.stringify([
        {
          field: 'campaign.id',
          operator: 'IN',
          value: [String(campaign_id)]
        }
      ]);
    }

    const response = await axios.get(
      `https://graph.facebook.com/v20.0/act_${cleanAdAccountId}/insights`,
      { params }
    );

    res.json(response.data);
  } catch (err) {
    console.error('Error insights age:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Error al traer insights por edad',
      detalle: err.response?.data || err.message
    });
  }
});
//Ruta Métricas Edad

//FIN Ruta Métricas Edad

//Verificar si exite meta
app.get('/api/meta/status/:restaurant_id', async (req, res) => {
  const { restaurant_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, meta_user_id, meta_user_name
       FROM meta_connections
       WHERE restaurant_id = $1`,
      [restaurant_id]
    );

    if (result.rows.length === 0) {
      return res.json({ connected: false });
    }

    return res.json({
      connected: true,
      connection: result.rows[0]
    });
  } catch (err) {
    console.error('Error meta status:', err.message);
    return res.status(500).json({
      error: 'Error al consultar estado de Meta',
      detalle: err.message
    });
  }
});
//Fin Verificar si exite meta

//Actualizacion automatica
async function syncMetaInsightsForAllRestaurants() {
  try {
    const result = await pool.query(`
      SELECT restaurant_id, access_token
      FROM meta_connections
    `);

    for (const row of result.rows) {
      const { restaurant_id, access_token } = row;

      try {
        const adAccountsRes = await axios.get('https://graph.facebook.com/v20.0/me/adaccounts', {
          params: {
            access_token,
            fields: 'id,name,account_status,currency',
          },
        });

        const adAccounts = adAccountsRes.data.data || [];
        if (!adAccounts.length) continue;

        for (const account of adAccounts) {
          const cleanAdAccountId = account.id.replace('act_', '');

          const insightsRes = await axios.get(
            `https://graph.facebook.com/v20.0/act_${cleanAdAccountId}/insights`,
            {
              params: {
                access_token,
                fields: 'campaign_name,impressions,reach,clicks,spend,ctr,cpc',
                date_preset: 'last_30d'
              }
            }
          );

          const ageInsightsRes = await axios.get(
            `https://graph.facebook.com/v20.0/act_${cleanAdAccountId}/insights`,
            {
              params: {
                access_token,
                fields: 'impressions,reach,clicks,spend',
                breakdowns: 'age,gender',
                date_preset: 'last_30d'
              }
            }
          );

          console.log(
            `Meta sync OK | restaurant_id=${restaurant_id} | account=${account.id} | campaigns=${(insightsRes.data.data || []).length} | ages=${(ageInsightsRes.data.data || []).length}`
          );

          // Aquí después puedes guardar en BD si quieres cachear resultados.
        }
      } catch (error) {
        console.error(`Error sincronizando restaurante ${restaurant_id}:`, error.response?.data || error.message);
      }
    }
  } catch (error) {
    console.error('Error general en syncMetaInsightsForAllRestaurants:', error.message);
  }
}

cron.schedule('0 6,14,22 * * *', async () => {
  console.log('Ejecutando sincronización automática de Meta...');
  await syncMetaInsightsForAllRestaurants();
});
syncMetaInsightsForAllRestaurants();
//Fin Actualizacion Automatica

//Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
