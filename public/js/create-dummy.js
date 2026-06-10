(function () {
  var videoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
  var products = [
    ['Glow Serum Pro', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=420&q=80'],
    ['Mini Blender Fresh', 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=420&q=80'],
    ['Protein Snack Bar', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=420&q=80'],
    ['Amber Oud Perfume', 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=420&q=80'],
    ['Hydra Sunscreen', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=420&q=80'],
    ['Daily Hair Tonic', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=420&q=80'],
    ['Ceramic Mug Set', 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=420&q=80'],
    ['Smart Desk Lamp', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=420&q=80'],
    ['Matcha Collagen', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=420&q=80'],
    ['Travel Organizer', 'https://images.unsplash.com/photo-1553531384-411a247ccd73?auto=format&fit=crop&w=420&q=80'],
    ['Lip Tint Velvet', 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=420&q=80'],
    ['Aroma Diffuser', 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=420&q=80'],
    ['Kitchen Knife Pro', 'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&w=420&q=80'],
    ['Yoga Bottle', 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=420&q=80'],
    ['Wireless Earbuds', 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=420&q=80']
  ];

  var formats = ['Product Demo', 'Problem Solution', 'Affiliate Sell', 'Testimonial', 'ASMR'];
  var items = products.map(function (product, index) {
    return {
      id: index + 1,
      title: product[0],
      image: product[1],
      format: formats[index % formats.length],
      duration: index % 3 === 0 ? '10s' : '5s',
      ratio: index % 4 === 0 ? '1:1' : '9:16',
      model: index % 2 === 0 ? 'seedance-2.0-fast' : 'seedance-2.0',
      status: index < 15 ? 'queued' : 'completed',
      prompt: 'Buat video UGC affiliate untuk ' + product[0] + ' dengan hook cepat, demo produk jelas, visual natural, dan CTA soft untuk social commerce.'
    };
  });

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function renderPreview(item) {
    var preview = document.getElementById('dummy-preview');
    preview.innerHTML = '<div class="video-result">' +
      '<div class="video-result-media"><div class="video-result-player">' +
      '<video src="' + videoUrl + '" poster="' + item.image + '" controls></video>' +
      '</div></div>' +
      '<div class="video-result-side">' +
      '<div class="status-indicator"><span class="status-dot completed"></span><span>Completed</span></div>' +
      '<div class="video-result-details">' +
      '<div class="video-result-prompt"><div class="video-result-prompt-text">' + escapeHtml(item.prompt) + '</div><button class="prompt-more-btn" type="button">Show more</button></div>' +
      '<div class="video-result-params">' +
      '<div class="param-item"><span class="param-label">Product</span><span class="param-value">' + escapeHtml(item.title) + '</span></div>' +
      '<div class="param-item"><span class="param-label">Format</span><span class="param-value">' + escapeHtml(item.format) + '</span></div>' +
      '<div class="param-item"><span class="param-label">Duration</span><span class="param-value">' + item.duration + '</span></div>' +
      '<div class="param-item"><span class="param-label">Ratio</span><span class="param-value">' + item.ratio + '</span></div>' +
      '<div class="param-item"><span class="param-label">Model</span><span class="param-value">' + item.model + '</span></div>' +
      '</div></div></div></div>';
  }

  function renderQueue() {
    var queue = document.getElementById('dummy-queue');
    queue.innerHTML = items.map(function (item, index) {
      var state = index === 0 ? 'running' : 'queued';
      var label = index === 0 ? 'Running' : 'Queued';
      return '<div class="queue-item ' + state + '" data-id="' + item.id + '">' +
        '<div class="queue-item-thumb"><img src="' + item.image + '" alt=""></div>' +
        '<div class="queue-item-main">' +
        '<div class="queue-item-title">' + escapeHtml(item.title) + '</div>' +
        '<div class="queue-item-meta">' + item.duration + ' · ' + item.ratio + ' · ' + item.model + '</div>' +
        '</div>' +
        '<div class="queue-item-status"><span class="queue-status-dot ' + state + '"></span>' + label + '</div>' +
        '<div class="queue-item-actions">' + (index === 0 ? '<span class="queue-spinner"><span class="spinner"></span></span>' : '<button type="button">Pause</button><button type="button">Edit</button>') + '</div>' +
        '</div>';
    }).join('');
  }

  function renderVideos() {
    var list = document.getElementById('dummy-videos');
    list.innerHTML = items.map(function (item, index) {
      return '<div class="ugc-video-card' + (index === 0 ? ' active' : '') + '" data-id="' + item.id + '">' +
        '<div class="ugc-video-thumb"><img src="' + item.image + '" alt=""></div>' +
        '<div class="ugc-video-info">' +
        '<div class="ugc-video-title">' + escapeHtml(item.title) + '</div>' +
        '<div class="ugc-video-meta">' + item.duration + ' · ' + item.ratio + ' · completed</div>' +
        '<div class="ugc-video-date">June 08, 2026</div>' +
        '</div>' +
        '</div>';
    }).join('');

    list.querySelectorAll('.ugc-video-card').forEach(function (card) {
      card.addEventListener('click', function () {
        list.querySelectorAll('.ugc-video-card').forEach(function (item) { item.classList.remove('active'); });
        card.classList.add('active');
        renderPreview(items.find(function (item) { return String(item.id) === String(card.dataset.id); }) || items[0]);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var badge = document.getElementById('queue-badge');
    var queueBtn = document.getElementById('queue-btn');
    var queuePanel = document.getElementById('queue-panel');
    var queueClose = document.getElementById('queue-close-btn');
    var queueBackdrop = document.getElementById('queue-backdrop');

    if (badge) {
      badge.textContent = '15';
      badge.hidden = false;
    }
    function openQueue() {
      if (queuePanel) {
        queuePanel.classList.add('show');
        queuePanel.setAttribute('aria-hidden', 'false');
      }
      if (queueBackdrop) queueBackdrop.classList.add('show');
    }
    function closeQueue() {
      if (queuePanel) {
        queuePanel.classList.remove('show');
        queuePanel.setAttribute('aria-hidden', 'true');
      }
      if (queueBackdrop) queueBackdrop.classList.remove('show');
    }
    if (queueBtn) queueBtn.addEventListener('click', openQueue);
    if (queueClose) queueClose.addEventListener('click', closeQueue);
    if (queueBackdrop) queueBackdrop.addEventListener('click', closeQueue);

    renderQueue();
    renderVideos();
    renderPreview(items[0]);
  });
})();
