import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import database from '../configuration/database.js';
import uploadProfilePicture from '../middleware/uploadProfilePicture.js';
import authenticateToken from '../middleware/authenticateToken.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SALT_ROUNDS = process.env.SALT_ROUNDS || 10;
const JWT_SECRET = process.env.JWT_SECRET;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const profilePicturesDir = path.join(__dirname, '../profile_pictures');

const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, username, nickname, bio } = req.body;

    if (!email || !password || !username || !nickname) {
      return res.status(400)
        .json({ error: 'Missing required fields' });
    }

    const existingUser = await database.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existingUser[0].length > 0) {
      return res.status(409)
        .json({ error: 'User with this email or username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await database.query(
      'INSERT INTO users (email, password, username, nickname, bio) VALUES (?, ?, ?, ?, ?)',
      [email, hashedPassword, username, nickname, bio || '']
    );

    const user = { id: result.insertId, email, username, nickname, bio: bio || '' };

    return res.status(201)
      .json({
        user: user,
        token: jwt.sign(user, JWT_SECRET, { expiresIn: '90d' }),
      });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500)
      .json({ error: 'Internal Server Error' });
  }
})

authRouter.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email && !username) {
      return res.status(400)
        .json({ error: 'Missing required fields' });
    }

    if (!password) {
      return res.status(400)
        .json({ error: 'Password is required' });
    }

    const [users] = await database.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
    if (users.length === 0) {
      return res.status(401)
        .json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    if (user.login_attempt % 3 === 0 && user.last_login_attempt > new Date(Date.now() - 1000 * 5)) {
      return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      await database.query('UPDATE users SET login_attempt = login_attempt + 1, last_login_attempt = ? WHERE id = ?', [new Date(), user.id]);
      return res.status(401)
        .json({ error: 'Invalid credentials' });
    }

    await database.query('UPDATE users SET login_attempt = 0 WHERE id = ?', [user.id]);

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '90d' });
    user.password = undefined;
    return res.json({ user: user, token: token });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500)
      .json({ error: 'Internal Server Error' });
  }
})

authRouter.get('/me', authenticateToken, (req, res) => {
  const { password ,iat, exp, ...user } = req.user;
  res.json({ user: user });
})

authRouter.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 3. Extract and validate request body
    const { nickname, bio } = req.body;

    // Check if at least one field is provided
    if (nickname === undefined && bio === undefined) {
      return res.status(400).json({ error: 'At least one field (nickname or bio) is required' });
    }

    // Validate nickname if provided
    if (nickname !== undefined) {
      if (typeof nickname !== 'string') {
        return res.status(400).json({ error: 'Nickname must be a string' });
      }
      if (nickname.trim().length === 0) {
        return res.status(400).json({ error: 'Nickname cannot be empty' });
      }
      if (nickname.length > 50) {
        return res.status(400).json({ error: 'Nickname must not exceed 50 characters' });
      }
    }

    // Validate bio if provided
    if (bio !== undefined) {
      if (typeof bio !== 'string') {
        return res.status(400).json({ error: 'Bio must be a string' });
      }
      if (bio.length > 500) {
        return res.status(400).json({ error: 'Bio must not exceed 500 characters' });
      }
    }

    // 4. Build update query dynamically
    const updates = [];
    const values = [];

    if (nickname !== undefined) {
      updates.push('nickname = ?');
      values.push(nickname.trim());
    }

    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(bio.trim());
    }

    values.push(userId);

    // 5. Update user profile in database
    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    const [result] = await database.query(updateQuery, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 6. Fetch updated user data
    const [[updatedUser]] = await database.query('SELECT id, email, username, nickname, bio FROM users WHERE id = ?', [userId]);

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
})

authRouter.put('/password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 3. Extract and validate request body
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Check if all required fields are provided
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Missing required fields: currentPassword, newPassword, confirmPassword' });
    }

    // Validate currentPassword
    if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
      return res.status(400).json({ error: 'Current password must be a non-empty string' });
    }

    // Validate newPassword
    if (typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'New password must be a string' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }
    if (newPassword.length > 128) {
      return res.status(400).json({ error: 'New password must not exceed 128 characters' });
    }

    // Validate confirmPassword
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirmation password do not match' });
    }

    // Check if new password is the same as current password
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    // 4. Fetch user from database
    const [[user]] = await database.query('SELECT id, password FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 5. Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // 6. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // 7. Update password in database
    const [result] = await database.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    if (result.affectedRows === 0) {
      return res.status(500).json({ error: 'Failed to update password' });
    }

    res.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
})

authRouter.post('/profile-picture', authenticateToken, uploadProfilePicture.single('profilePicture'), async (req, res) => {
  try {
    // 1. Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.id;
    const uploadedFileName = req.file.filename;
    const uploadedFilePath = req.file.path;

    // 2. Delete old profile picture if it exists
    const profilePicturesPath = profilePicturesDir;
    if (fs.existsSync(profilePicturesPath)) {
      const files = fs.readdirSync(profilePicturesPath);

      // Find and delete old files with the same user ID (different extensions)
      const oldFiles = files.filter(file => {
        const fileNameWithoutExt = path.parse(file).name;
        return fileNameWithoutExt === userId.toString();
      });

      for (const oldFile of oldFiles) {
        const oldFilePath = path.join(profilePicturesPath, oldFile);
        // Only delete if it's not the newly uploaded file
        if (oldFilePath !== uploadedFilePath) {
          try {
            fs.unlinkSync(oldFilePath);
            console.log(`Deleted old profile picture: ${oldFile}`);
          } catch (err) {
            console.error(`Failed to delete old profile picture: ${oldFile}`, err);
          }
        }
      }
    }

    // 3. Return success response
    res.json({
      message: 'Profile picture uploaded successfully',
      profilePictureUrl: `/profile_pictures/${uploadedFileName}`,
      fileName: uploadedFileName
    });

  } catch (error) {
    console.error('Error uploading profile picture:', error);

    // Delete uploaded file if there was an error in processing
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Failed to delete uploaded file after error:', err);
      }
    }

    res.status(500).json({ error: error.message || 'Internal server error' });
  }
})

authRouter.get('/profile-picture/:userId', (req, res) => {
  try {
    const userId = req.params.userId;

    // Validate userId is a number
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const profilePicturesPath = profilePicturesDir;

    // Check if directory exists
    if (!fs.existsSync(profilePicturesPath)) {
      return res.status(404).json({ error: 'No profile picture found' });
    }

    // Read all files in the directory
    const files = fs.readdirSync(profilePicturesPath);

    // Find file matching this user ID (regardless of extension)
    const profileFile = files.find(file => {
      const fileNameWithoutExt = path.parse(file).name;
      return fileNameWithoutExt === userId;
    });

    if (!profileFile) {
      return res.status(404).json({ error: 'No profile picture found' });
    }

    // Send file
    const filePath = path.join(profilePicturesPath, profileFile);
    res.sendFile(filePath);

  } catch (error) {
    console.error('Error retrieving profile picture:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
})

export default authRouter;
