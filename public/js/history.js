(function () {
  var videos = [];
  var activeVideoId = null;
  var deleteTargetId = null;
  var searchTimeout = null;

  var $ = function (sel) { return document.querySelector(sel); };

  function init() {
    loadVideos();
    setupSearch();
    setupDeleteModal();
    setupVideoModal();
  }

  async function loadVideos(search) {
    var query = search ? '?search=' + encodeURIComponent(search) : '';
    try {
      var res = await fetch('/api/videos' + query);
      var data = await res.json();
      videos = data.videos || [];
      renderGrid();
    } catch (err) {
      showToast('Failed to load history');
    }
  }

  function renderGrid() {
    var grid = $('#video-grid');
    var empty = $('#empty-state');
    var count = $('#history-count');

    if (count) count.textContent = videos.length + (videos.length === 1 ? ' video' : ' videos');

    if (videos.length === 0) {
      grid.innerHTML = '';
      empty.style.display = 'flex';
      return;
    }

    empty.style.display = 'none';

    grid.innerHTML = videos.map(function (v) {
      var date = formatDate(v.created_at);
      var prompt = v.prompt && v.prompt.length > 92 ? v.prompt.substring(0, 92) + '...' : (v.prompt || '');
      var title = getVideoTitle(v);
      var meta = [v.duration || '-', v.ratio || '-', formatModel(v.ai_model)].join(' / ');
      var media = getMediaMarkup(v);

      return '' +
        '<article class="video-card">' +
          '<button class="video-thumb" type="button" data-action="view" data-id="' + v.id + '"' + (v.status === 'completed' && v.video_url ? '' : ' disabled') + '>' +
            media +
            '<span class="status-badge ' + escapeHtml(v.status || 'pending') + '">' + escapeHtml(formatStatus(v.status)) + '</span>' +
          '</button>' +
          '<div class="video-info">' +
            '<div class="video-title">' + escapeHtml(title) + '</div>' +
            '<div class="video-prompt">' + escapeHtml(prompt) + '</div>' +
            '<div class="video-meta">' +
              '<span class="video-date">' + escapeHtml(date) + '</span>' +
              '<span class="video-meta-line">' + escapeHtml(meta) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="video-actions">' +
            '<button class="btn btn-secondary" type="button" data-action="edit" data-id="' + v.id + '"><i class="ti ti-edit"></i> Edit</button>' +
            '<button class="btn btn-secondary danger-soft" type="button" data-action="delete" data-id="' + v.id + '"><i class="ti ti-trash"></i> Delete</button>' +
          '</div>' +
        '</article>';
    }).join('');

    grid.querySelectorAll('[data-action="view"]').forEach(function (button) {
      button.addEventListener('click', function () {
        openVideoModal(Number(button.dataset.id));
      });
    });

    grid.querySelectorAll('[data-action="edit"]').forEach(function (button) {
      button.addEventListener('click', function () {
        window.location.href = '/?video_id=' + button.dataset.id;
      });
    });

    grid.querySelectorAll('[data-action="delete"]').forEach(function (button) {
      button.addEventListener('click', function () {
        showDeleteModal(Number(button.dataset.id));
      });
    });
  }

  function getMediaMarkup(v) {
    if (v.thumbnail_url) {
      return '<img src="' + escapeAttr(v.thumbnail_url) + '" alt=""><span class="play-icon"><i class="ti ti-player-play"></i></span>';
    }

    if (v.status === 'completed' && v.video_url) {
      return '<span class="video-thumb-placeholder"><i class="ti ti-movie"></i></span><span class="play-icon"><i class="ti ti-player-play"></i></span>';
    }

    return '<span class="video-thumb-placeholder"><i class="ti ti-movie"></i></span>';
  }

  function setupSearch() {
    var input = $('#search-input');
    if (!input) return;
    input.addEventListener('input', function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function () {
        loadVideos(input.value.trim());
      }, 250);
    });
  }

  function setupDeleteModal() {
    var modal = $('#delete-modal');
    var cancelBtn = $('#delete-cancel');
    var confirmBtn = $('#delete-confirm');

    window.showDeleteModal = showDeleteModal;

    cancelBtn.addEventListener('click', closeDeleteModal);

    confirmBtn.addEventListener('click', async function () {
      if (!deleteTargetId) return;

      try {
        await fetch('/api/videos/' + deleteTargetId, { method: 'DELETE' });
        videos = videos.filter(function (v) { return String(v.id) !== String(deleteTargetId); });
        renderGrid();
        showToast('Video deleted');
      } catch (err) {
        showToast('Failed to delete video');
      }

      closeDeleteModal();
    });

    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeDeleteModal();
    });
  }

  function setupVideoModal() {
    var modal = $('#video-modal');
    var closeBtn = $('#video-modal-close');
    var editBtn = $('#modal-edit');
    var deleteBtn = $('#modal-delete');
    var promptToggle = $('#modal-prompt-toggle');

    closeBtn.addEventListener('click', closeVideoModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeVideoModal();
    });

    editBtn.addEventListener('click', function () {
      if (!activeVideoId) return;
      window.location.href = '/?video_id=' + activeVideoId;
    });

    deleteBtn.addEventListener('click', function () {
      if (!activeVideoId) return;
      closeVideoModal();
      showDeleteModal(activeVideoId);
    });

    promptToggle.addEventListener('click', function () {
      var wrap = $('#modal-prompt-wrap');
      var expanded = wrap.classList.toggle('expanded');
      promptToggle.textContent = expanded ? 'Show less' : 'Show more';
    });
  }

  function openVideoModal(id) {
    var video = videos.find(function (item) { return String(item.id) === String(id); });
    if (!video || video.status !== 'completed' || !video.video_url) return;

    activeVideoId = video.id;
    var modal = $('#video-modal');
    var player = $('#modal-video-player');

    player.src = video.video_url;
    if (video.thumbnail_url) player.poster = video.thumbnail_url;
    else player.removeAttribute('poster');
    player.load();

    $('#modal-status').textContent = formatStatus(video.status);
    $('#modal-status-dot').className = 'history-status-dot ' + (video.status || 'pending');
    $('#modal-title').textContent = getVideoTitle(video);
    $('#modal-prompt').textContent = video.prompt || '';
    $('#modal-prompt-wrap').classList.remove('expanded');
    $('#modal-prompt-toggle').hidden = !video.prompt || video.prompt.length < 260;
    $('#modal-prompt-toggle').textContent = 'Show more';
    $('#modal-resolution').textContent = video.resolution || '-';
    $('#modal-ratio').textContent = video.ratio || '-';
    $('#modal-duration').textContent = video.duration || '-';
    $('#modal-model').textContent = formatModel(video.ai_model);
    $('#modal-date').textContent = formatDateTime(video.created_at);

    modal.classList.add('show');
  }

  function closeVideoModal() {
    var modal = $('#video-modal');
    var player = $('#modal-video-player');
    modal.classList.remove('show');
    player.pause();
    player.removeAttribute('src');
    player.load();
  }

  function showDeleteModal(id) {
    deleteTargetId = id;
    $('#delete-modal').classList.add('show');
  }

  function closeDeleteModal() {
    $('#delete-modal').classList.remove('show');
    deleteTargetId = null;
  }

  function getVideoTitle(video) {
    var data = video.recipe_data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data || '{}'); } catch (e) { data = {}; }
    }
    if (data && data.product_name) return data.product_name;
    return 'UGC Video';
  }

  function formatModel(model) {
    if (model === 'seedance-2.0-fast') return 'Seedance 2.0 Fast';
    if (model === 'seedance-2.0') return 'Seedance 2.0';
    return model || '-';
  }

  function formatStatus(status) {
    return String(status || 'pending').replace(/\b\w/g, function (ch) { return ch.toUpperCase(); });
  }

  function formatDate(value) {
    if (!value) return '-';
    return new Date(value + 'Z').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatDateTime(value) {
    if (!value) return '-';
    return new Date(value + 'Z').toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, '&quot;');
  }

  function showToast(message) {
    var toast = $('#history-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () {
      toast.classList.remove('show');
    }, 2200);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
