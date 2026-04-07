require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');

const authRoutes = require('./routes/auth');
const funnelRoutes = require('./routes/funnel');
const insightsRoutes = require('./routes/insights');
const leadsRoutes = require('./routes/leads');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

app.use('/auth', authRoutes);
app.use('/api/funnel', funnelRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/export', exportRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

module.exports = app;
