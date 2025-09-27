// utils/ensureDirectories.js
import fs from 'fs';
import path from 'path';

export function ensureDirectoriesExist() {
  const uploadsDir = process.env.UPLOAD_DIR || 'uploads';
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 Created uploads directory: ${uploadsDir}`);
  }
}
