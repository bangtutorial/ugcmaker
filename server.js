const express = require('express');
const path = require('path');
const { updateSettings, getSettings } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

const pageRoutes = require('./routes/pages');
const assetRoutes = require('./routes/assets');
const videoRoutes = require('./routes/videos');
const queueRoutes = require('./routes/queue');

app.use('/', pageRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/queue', queueRoutes);

app.post('/api/settings', (req, res) => {
  const { api_key, api_base_url, default_resolution, default_ratio, default_model } = req.body;
  updateSettings({ api_key, api_base_url, default_resolution, default_ratio, default_model });
  res.json({ success: true });
});

app.get('/api/settings', (req, res) => {
  const settings = getSettings();
  res.json({
    api_base_url: settings.api_base_url,
    default_resolution: settings.default_resolution,
    default_ratio: settings.default_ratio,
    default_model: settings.default_model,
    has_api_key: !!settings.api_key
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
