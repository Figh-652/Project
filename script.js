// ─────────────────────────────────────────────
//  Syed Mateen Portfolio — Backend Server
//  Stack: Node.js + Express + PostgreSQL
// ─────────────────────────────────────────────

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());

// ── PostgreSQL Connection Pool
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'portfolio_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.connect((err) => {
  if (err) console.error('Database connection failed:', err.stack);
  else console.log('✅ Connected to PostgreSQL');
});

// ─────────────────────────────────────────────
//  ROUTES — Projects
// ─────────────────────────────────────────────

// GET all projects
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM projects ORDER BY created_at DESC'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET single project by ID
app.get('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM projects WHERE id = $1', [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST create a new project (admin)
app.post('/api/projects', async (req, res) => {
  try {
    const { title, description, tech_stack, github_url, live_url, thumbnail_color } = req.body;
    const result = await pool.query(
      `INSERT INTO projects (title, description, tech_stack, github_url, live_url, thumbnail_color)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description, JSON.stringify(tech_stack), github_url, live_url, thumbnail_color]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT update project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, tech_stack, github_url, live_url } = req.body;
    const result = await pool.query(
      `UPDATE projects SET title=$1, description=$2, tech_stack=$3, github_url=$4, live_url=$5
       WHERE id=$6 RETURNING *`,
      [title, description, JSON.stringify(tech_stack), github_url, live_url, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─────────────────────────────────────────────
//  ROUTES — Contact Form
// ─────────────────────────────────────────────

// POST contact form submission
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    const result = await pool.query(
      `INSERT INTO contacts (name, email, message)
       VALUES ($1, $2, $3) RETURNING id, created_at`,
      [name, email, message]
    );

    // Here you'd trigger an email notification (e.g., via Nodemailer or SendGrid)
    // await sendEmail({ to: 'syedmateen@email.com', from: email, name, message });

    res.status(201).json({
      success: true,
      message: 'Message received! I\'ll get back to you within 24 hours.',
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET all contact submissions (admin)
app.get('/api/contact', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contacts ORDER BY created_at DESC'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─────────────────────────────────────────────
//  ROUTES — Skills
// ─────────────────────────────────────────────

app.get('/api/skills', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM skills ORDER BY category, name'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─────────────────────────────────────────────
//  Health Check
// ─────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ─────────────────────────────────────────────
//  Start Server
// ─────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = app;