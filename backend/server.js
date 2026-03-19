const express = require('express');
const cors = require('cors');
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
