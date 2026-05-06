require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const { apiLimiter, authLimiter } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
  resave: false, saveUninitialized: false,
  cookie: { secure: isProd, httpOnly: true, sameSite: isProd ? 'none' : 'lax', maxAge: 24*60*60*1000 }
}));

app.use('/api/', apiLimiter);
app.use('/auth/', authLimiter);

app.use('/auth', require('./routes/auth'));
app.use('/api/funnel', require('./routes/funnel'));
app.use('/api/insights', require('./routes/insights'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/revenue', require('./routes/revenue'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/export', require('./routes/export'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/reports', require('./routes/reports'));
app.use('/ga4', require('./routes/ga4'));

app.get('/health', (req, res) => res.json({ status: 'ok', env: isProd ? 'production' : 'development' }));
app.use((err, req, res, next) => { console.error(err.stack); res.status(500).json({ error: 'Something went wrong.' }); });

app.listen(PORT, () => console.log(`PipeChamp backend running on http://localhost:${PORT} [${isProd ? 'production' : 'development'}]`));
module.exports = app;
