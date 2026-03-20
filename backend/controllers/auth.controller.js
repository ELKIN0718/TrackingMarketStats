const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingRestaurant = await pool.query(
      'SELECT * FROM restaurants WHERE email = $1',
      [email]
    );

    if (existingRestaurant.rows.length > 0) {
      return res.status(400).json({ message: 'Ya existe un restaurante con ese email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO restaurants (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name, email, hashedPassword]
    );

    res.status(201).json({
      message: 'Restaurante registrado correctamente',
      restaurant: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al registrar restaurante' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM restaurants WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurante no encontrado' });
    }

    const restaurant = result.rows[0];

    const validPassword = await bcrypt.compare(password, restaurant.password);

    if (!validPassword) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      {
        id: restaurant.id,
        email: restaurant.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        email: restaurant.email
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
};

const getProfile = async (req, res) => {
  try {
    const restaurantId = req.restaurant.id;

    const result = await pool.query(
      'SELECT id, name, email, created_at FROM restaurants WHERE id = $1',
      [restaurantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurante no encontrado' });
    }

    res.json({
      restaurant: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener perfil' });
  }
};

module.exports = {
  register,
  login,
  getProfile
};
