import jwt from 'jsonwebtoken';
import database from '../configuration/database.js';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware to verify JWT token and attach user data to request
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userId = decoded.id;

    // Fetch user from database
    const [users] = await database.query('SELECT * FROM users WHERE id = ?', [userId]);

    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    req.user = users[0];
    next();
  } catch (error) {
    console.error('Error in authenticateToken middleware:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default authenticateToken;
