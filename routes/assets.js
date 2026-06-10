const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createAsset, getAssetsByType, getAllAssets, deleteAsset } = require('../database');

const UPLOAD_BASE = path.join(__dirname, '..', 'uploads');

['products', 'models', 'backgrounds'].forEach(dir => {
  fs.mkdirSync(path.join(UPLOAD_BASE, dir), { recursive: true });
});

const typeToFolder = {
  product: 'products',
  model: 'models',
  background: 'backgrounds'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.type || req.query.type || 'product';
    const folder = typeToFolder[type] || 'products';
    cb(null, path.join(UPLOAD_BASE, folder));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.split('/')[1]);
    if (ext || mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

router.post('/upload', upload.array('files', 10), (req, res) => {
  const type = req.body.type || 'product';

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const assets = req.files.map(file => {
    const folder = typeToFolder[type] || 'products';
    const filepath = `uploads/${folder}/${file.filename}`;
    const result = createAsset({
      type,
      filename: file.originalname,
      filepath,
      filesize: file.size
    });
    return {
      id: result.lastInsertRowid,
      type,
      filename: file.originalname,
      filepath,
      filesize: file.size
    };
  });

  res.json({ assets });
});

router.get('/', (req, res) => {
  const type = req.query.type;
  const assets = type ? getAssetsByType(type) : getAllAssets();
  res.json({ assets });
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const deleted = deleteAsset(id);
  if (!deleted) {
    return res.status(404).json({ error: 'Asset not found' });
  }
  res.json({ success: true });
});

module.exports = router;
