import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const USERS_FILE = path.join(DATA_DIR, 'users.json');
function ensureAdmin() {
  const adminUser = process.env.WEB_ADMIN_USER || 'admin';
  const adminPass = process.env.WEB_ADMIN_PASS || 'change_me';
  let users = { admins: [] };
  if (fs.existsSync(USERS_FILE)) {
    try { users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch(e){ users = { admins: [] }; }
  }
  if (!users.admins || users.admins.length === 0) {
    const hash = bcrypt.hashSync(adminPass, 10);
    users.admins = [{ username: adminUser, passHash: hash }];
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log('Created admin user from .env (change WEB_ADMIN_PASS ASAP).');
  }
}
ensureAdmin();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 4 }
}));
app.use(express.static(path.join(__dirname, 'public')));

function isAuthenticated(req) {
  return req.session && req.session.user && req.session.user.username;
}

app.get('/login', (req, res) => {
  if (isAuthenticated(req)) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  let users = { admins: [] };
  try { users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch(e){}
  const admin = users.admins.find(a => a.username === username);
  if (!admin) return res.redirect('/login?error=1');
  if (bcrypt.compareSync(password, admin.passHash)) {
    req.session.user = { username };
    return res.redirect('/');
  } else {
    return res.redirect('/login?error=1');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// Simple API for tickets/warnings stored in data/
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');
const WARNINGS_FILE = path.join(DATA_DIR, 'warnings.json');
const BANS_FILE = path.join(DATA_DIR, 'bans.json');
if (!fs.existsSync(TICKETS_FILE)) fs.writeFileSync(TICKETS_FILE, JSON.stringify([]));
if (!fs.existsSync(WARNINGS_FILE)) fs.writeFileSync(WARNINGS_FILE, JSON.stringify([]));
if (!fs.existsSync(BANS_FILE)) fs.writeFileSync(BANS_FILE, JSON.stringify([]));

app.get('/api/tickets', (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'unauthorized' });
  const tickets = JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf8'));
  return res.json(tickets);
});

app.post('/api/tickets/:id/close', (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'unauthorized' });
  let tickets = JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf8'));
  const id = req.params.id;
  tickets = tickets.map(t => t.id === id ? ({ ...t, status: 'closed', closedAt: new Date().toISOString() }) : t);
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
  return res.json({ ok: true });
});

app.post('/api/tickets/:id/reopen', (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'unauthorized' });
  let tickets = JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf8'));
  const id = req.params.id;
  tickets = tickets.map(t => t.id === id ? ({ ...t, status: 'open', reopenedAt: new Date().toISOString() }) : t);
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
  return res.json({ ok: true });
});

app.post('/api/tickets/:id/delete', (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'unauthorized' });
  let tickets = JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf8'));
  const id = req.params.id;
  tickets = tickets.filter(t => t.id !== id);
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
  return res.json({ ok: true });
});

app.get('/api/warnings', (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'unauthorized' });
  const warnings = JSON.parse(fs.readFileSync(WARNINGS_FILE, 'utf8'));
  return res.json(warnings);
});

app.get('/api/bans', (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'unauthorized' });
  const bans = JSON.parse(fs.readFileSync(BANS_FILE, 'utf8'));
  return res.json(bans);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Web panel listening on http://localhost:${port}`));
