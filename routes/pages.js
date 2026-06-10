const express = require('express');
const router = express.Router();
const { getSettings, getAllAssets, getVideoById } = require('../database');

router.get('/', (req, res) => {
  const settings = getSettings();
  const videoId = req.query.video_id;
  let prefillData = null;

  if (videoId) {
    const video = getVideoById(parseInt(videoId));
    if (video) {
      const assetIds = JSON.parse(video.asset_ids || '[]');
      const assets = getAllAssets().filter(a => assetIds.includes(a.id));
      prefillData = {
        video,
        assets
      };
    }
  }

  res.render('create', {
    page: 'create',
    settings,
    prefillData
  });
});

router.get('/history', (req, res) => {
  res.render('history', { page: 'history' });
});

router.get('/create-dummy', (req, res) => {
  const settings = getSettings();
  res.render('create-dummy', {
    page: 'create',
    settings
  });
});

router.get('/settings', (req, res) => {
  const settings = getSettings();
  res.render('settings', { page: 'settings', settings });
});

module.exports = router;
