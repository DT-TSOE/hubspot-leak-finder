const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({ windowMs: 15*60*1000, max: 100, message: { error: 'Too many requests.' }, standardHeaders: true, legacyHeaders: false });
const chatLimiter = rateLimit({ windowMs: 60*60*1000, max: 50, message: { error: 'Chat limit reached. 50 messages per hour.' }, keyGenerator: (req) => req.session?.id || req.ip, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 60*60*1000, max: 20, message: { error: 'Too many auth attempts.' } });

module.exports = { apiLimiter, chatLimiter, authLimiter };
