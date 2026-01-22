import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import database from '../configuration/database.js';

const SALT_ROUNDS = process.env.SALT_ROUNDS || 10;
const JWT_SECRET = process.env.JWT_SECRET;

const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const { email, password, username, nickname, bio } = req.body;

  if (!email || !password || !username || !nickname) {
    res.status(400)
      .json({ error: 'Missing required fields' });
    return;
  }

  const existingUser = await database.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
  if (existingUser[0].length > 0) {
    res.status(409)
      .json({ error: 'User with this email or username already exists' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  database.query(
    'INSERT INTO users (email, password, username, nickname, bio) VALUES (?, ?, ?, ?, ?)',
    [email, hashedPassword, username, nickname, bio || '']
  ).then(([result]) => {
    const user = { id: result.insertId, ... req.body }

    res.status(201)
      .json({
        user: user,
        token: jwt.sign(user, JWT_SECRET, { expiresIn: '90d' }),
      });
  }).catch((error) => {
    console.error('Error registering user:', error);
    res.status(500)
      .json({ error: 'Internal Server Error' });
  });
})

authRouter.post('/login', async (req, res) => {
  const { email, username, password } = req.body;

  if (!email && !username) {
    res.status(400)
      .json({ error: 'Missing required fields' });
    return;
  }

  const user = await database.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
  if (user[0].length === 0) {
    res.status(401)
      .json({ error: 'Invalid credentials' });
    return;
  }

  const validPassword = await bcrypt.compare(password, user[0][0].password);
  if (!validPassword) {
    res.status(401)
      .json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(user[0][0], JWT_SECRET, { expiresIn: '90d' });
  res.json({ user: user[0][0], token: token });
})

authRouter.get('/me', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];

  if (!token) {
    res.status(401)
      .json({ error: 'Not authorized' });
  }

  jwt.verify(token, JWT_SECRET, (error, decoded) => {
    if (error) {
      res.status(401)
        .json({ error: 'Not authorized' });
    }

    const { iat, exp, ...user } = decoded;

    res.json({ user: user });
  })
})

export default authRouter;
