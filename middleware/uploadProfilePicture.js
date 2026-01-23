import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create profile_pictures directory if it doesn't exist
const profilePicturesDir = path.join(__dirname, '../profile_pictures');
if (!fs.existsSync(profilePicturesDir)) {
  fs.mkdirSync(profilePicturesDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePicturesDir);
  },
  filename: (req, file, cb) => {
    // Extract user ID from JWT token in middleware
    const userId = req.user?.id;
    if (!userId) {
      return cb(new Error('User ID not found'), null);
    }

    // Get file extension
    const ext = path.extname(file.originalname);

    // Save as {userId}.{ext}
    cb(null, `${userId}${ext}`);
  }
});

// Filter to accept only image files
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'), false);
  }
};

// Create multer instance
const uploadProfilePicture = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export default uploadProfilePicture;
