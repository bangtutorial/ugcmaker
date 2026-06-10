(function () {
  var state = {
    selectedAssets: { product: [], model: [], background: [] },
    currentVideoId: null,
    pollInterval: null,
    videos: [],
    hasPrefillPrompt: false,
    promptRange: null,
    mentionAssets: {},
    thumbnails: {},
    queue: [],
    editingQueueId: null,
    batchRunning: false,
    stopAfterCurrent: false,
    assetCache: [],
    library: {
      product: { assets: [], query: '', visible: 15 },
      model: { assets: [], query: '', visible: 15 },
      background: { assets: [], query: '', visible: 15 }
    },
    choices: {
      'ugc-format': 'problem-solution'
    }
  };

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return document.querySelectorAll(sel); };

  var directorPresets = {
    'problem-solution': {
      'creator-vibe': 'friendly TikTok affiliate creator',
      'camera-style': 'handheld close-up camera with natural small movements',
      'motion-style': 'before-after style reveal with quick transition',
      'lighting-style': 'bright natural morning light, clean home setting',
      'music-style': 'with subtle upbeat background music',
      'audio-style': 'natural voiceover energy with product handling sound effects synced to motion',
      'cta-style': 'soft CTA to check the product link'
    },
    'product demo': {
      'creator-vibe': 'friendly TikTok affiliate creator',
      'camera-style': 'top-down table shot with clean framing',
      'motion-style': 'product reveal, hand interaction, and stable close-up demonstration',
      'lighting-style': 'soft studio lighting with clean shadows',
      'music-style': 'with subtle upbeat background music',
      'audio-style': 'natural voiceover energy with product handling sound effects synced to motion',
      'cta-style': 'soft CTA to check the product link'
    },
    'unboxing': {
      'creator-vibe': 'friendly TikTok affiliate creator',
      'camera-style': 'handheld close-up camera with natural small movements',
      'motion-style': 'unboxing, lifting the product, and showing texture',
      'lighting-style': 'warm home lighting with cozy lifestyle mood',
      'music-style': 'with subtle upbeat background music',
      'audio-style': 'natural voiceover energy with product handling sound effects synced to motion',
      'cta-style': 'affiliate CTA to check the product link'
    },
    'testimonial review': {
      'creator-vibe': 'honest beauty reviewer',
      'camera-style': 'handheld close-up camera with natural small movements',
      'motion-style': 'application demo with realistic hand movement',
      'lighting-style': 'bright natural morning light, clean home setting',
      'music-style': 'with subtle upbeat background music',
      'audio-style': 'calm conversational voiceover with light ambience',
      'cta-style': 'save and compare CTA'
    },
    'asmr product close-up': {
      'creator-vibe': 'premium lifestyle presenter',
      'camera-style': 'macro product detail shots with gentle focus pulls',
      'motion-style': 'slow product rotation with label staying readable',
      'lighting-style': 'soft studio lighting with clean shadows',
      'music-style': 'without background music, use voice and product sound effects only',
      'audio-style': 'soft ASMR whisper voice with close-mic product foley, gentle handling sounds, and quiet pauses',
      'cta-style': 'soft CTA to check the product link'
    },
    'affiliate hard sell': {
      'creator-vibe': 'friendly TikTok affiliate creator',
      'camera-style': 'dynamic TikTok-style quick cuts',
      'motion-style': 'product reveal, hand interaction, and stable close-up demonstration',
      'lighting-style': 'colorful social commerce lighting',
      'music-style': 'with subtle upbeat background music',
      'audio-style': 'upbeat social ad pacing with satisfying product sound effects',
      'cta-style': 'affiliate CTA to check the product link'
    }
  };

  function init() {
    setupUploadHandlers();
    setupLibraryToggles();
    setupGenerateButton();
    setupModelSelector();
    setupDurationSlider();
    setupScriptInput();
    setupUgcFormatSelect();
    setupChoiceCards();
    setupRecipeInputs();
    setupPromptEditor();
    setupCopyPrompt();
    setupQueueControls();
    loadHistoryStrip();
    loadQueue();
    loadPrefillData();
    if (!state.hasPrefillPrompt) updatePromptPreview();
    updatePreviewMeta();
    updatePreviewMock();
  }

  function getTotalAssetsCount() {
    return state.selectedAssets.product.length + state.selectedAssets.model.length + state.selectedAssets.background.length;
  }

  function getValue(id, fallback) {
    var el = $('#' + id);
    if (!el || !el.value.trim()) return fallback;
    return el.value.trim();
  }

  function getSelectedText(id) {
    var el = $('#' + id);
    if (!el) return '';
    if (el.tagName === 'SELECT' && el.selectedOptions.length) return el.selectedOptions[0].textContent.trim();
    return el.value.trim();
  }

  function formatLabel(value) {
    return value.replace(/-/g, ' ').replace(/\b\w/g, function (ch) { return ch.toUpperCase(); });
  }

  function getAutoShotCount(duration) {
    var seconds = parseInt(duration, 10);
    if (isNaN(seconds)) return 3;
    if (seconds <= 6) return 2;
    if (seconds <= 10) return 3;
    if (seconds <= 13) return 4;
    return 5;
  }

  function getShotPlan(format, duration, cta) {
    var count = getAutoShotCount(duration);
    var plans = {
      'problem-solution': [
        'Hook: buka dengan masalah yang relatable, close-up produk, dan reaksi creator yang natural.',
        'Demo solusi: tampilkan produk digunakan untuk menjawab masalah tersebut. Jaga bentuk produk tetap stabil dan label tetap terbaca.',
        'Benefit: tampilkan hasil atau perubahan yang terasa jelas dengan gerakan realistis dan kamera stabil.',
        'Detail proof: tampilkan tekstur, fitur, atau momen penggunaan yang membuat benefit lebih meyakinkan.',
        'CTA: akhiri dengan hero shot produk yang clean dan ' + cta + '.'
      ],
      'product demo': [
        'Hook: tampilkan produk sebagai fokus utama dengan close-up yang clean.',
        'Demo utama: tampilkan tangan memakai atau mengoperasikan produk secara natural.',
        'Detail produk: perlihatkan tekstur, fitur, ukuran, atau bagian penting produk dengan jelas.',
        'Benefit in use: tampilkan produk menyelesaikan kebutuhan sehari-hari secara realistis.',
        'CTA: akhiri dengan hero shot produk dan ' + cta + '.'
      ],
      'unboxing': [
        'Hook: buka dengan paket atau produk yang siap dibuka.',
        'Unboxing: tampilkan produk diambil dari kemasan dengan gerakan tangan natural.',
        'First look: close-up produk, label, tekstur, dan detail penting tetap konsisten.',
        'Quick demo: tampilkan produk digunakan singkat dalam konteks nyata.',
        'CTA: akhiri dengan produk tertata rapi dan ' + cta + '.'
      ],
      'testimonial review': [
        'Hook: buka dengan reaksi creator yang jujur dan natural terhadap produk.',
        'Review point: tampilkan produk sambil menyorot alasan utama kenapa produk terasa berguna.',
        'Usage proof: tampilkan produk dipakai secara realistis, dengan motion dan lighting yang stabil.',
        'Close-up detail: perlihatkan detail produk yang mendukung review.',
        'CTA: akhiri dengan hero shot produk dan ' + cta + '.'
      ],
      'asmr product close-up': [
        'Hook: buka dengan close-up produk dan gerakan pelan yang satisfying.',
        'ASMR handling: tampilkan tangan menyentuh, membuka, atau menggerakkan produk dengan suara foley natural.',
        'Texture detail: perlihatkan tekstur, kemasan, atau detail produk secara macro.',
        'Slow demo: tampilkan penggunaan produk dengan pacing calm dan visual bersih.',
        'CTA: akhiri dengan hero shot produk yang clean dan ' + cta + '.'
      ],
      'affiliate hard sell': [
        'Hook: buka dengan angle promo yang cepat dan jelas, produk langsung terlihat.',
        'Reason to buy: tampilkan benefit utama lewat demo singkat yang mudah dipahami.',
        'Proof detail: close-up fitur, tekstur, atau hasil penggunaan yang mendukung klaim.',
        'Offer moment: tampilkan produk dalam hero framing dengan energi social commerce.',
        'CTA: akhiri dengan ajakan beli yang jelas dan ' + cta + '.'
      ]
    };

    var selected = plans[format] || plans['problem-solution'];
    var chosen = selected.slice(0, count);
    if (count < selected.length) {
      chosen[chosen.length - 1] = selected[selected.length - 1];
    }

    return chosen.map(function (text, index) {
      return 'Shot ' + (index + 1) + ' - ' + text;
    });
  }

  function buildReferenceInstructions() {
    var lines = [
      'Instruksi referensi gambar:',
      '- Product reference: {{product_refs}} gunakan gambar produk sebagai identitas utama. Pertahankan bentuk, warna, kemasan, label, proporsi, dan detail visual produk di semua scene.'
    ];

    if (state.selectedAssets.model.length > 0) {
      lines.push('- Creator reference: {{model_refs}} gunakan gambar creator/model sebagai arahan penampilan presenter, pose, tangan, atau style karakter. Jangan mengubah identitas produk mengikuti wajah/karakter.');
    } else {
      lines.push('- Creator: jika tidak ada referensi creator, buat presenter UGC yang natural dan generik sesuai gaya creator yang dipilih.');
    }

    if (state.selectedAssets.background.length > 0) {
      lines.push('- Background reference: {{background_refs}} gunakan gambar background sebagai arahan lokasi, mood, warna, lighting, dan komposisi environment.');
    } else {
      lines.push('- Background: jika tidak ada referensi background, buat environment yang realistis sesuai lighting dan kategori produk.');
    }

    lines.push('- Jika ada beberapa gambar produk, anggap semuanya sebagai referensi produk yang sama dari angle berbeda. Jangan membuat produk baru atau brand tambahan.');
    lines.push('- Prioritas visual: produk harus paling konsisten, lalu creator/model, lalu background.');
    lines.push('- Jika pilihan director bertentangan dengan gambar referensi, prioritaskan gambar referensi. Director controls hanya mengatur gaya pengambilan gambar, bukan mengganti isi referensi.');

    return lines;
  }

  function buildAudioInstructions(format, audioValue, musicValue, language) {
    var audioLower = String(audioValue || '').toLowerCase();
    var formatLower = String(format || '').toLowerCase();
    var lines = [];

    if (audioLower.indexOf('no voice') >= 0) {
      lines.push('Voice/dialog: tanpa voiceover, tanpa percakapan, dan tanpa presenter berbicara. Gunakan ekspresi visual, gesture tangan, dan product sound effects untuk menyampaikan pesan.');
    } else if (audioLower.indexOf('asmr') >= 0 || formatLower.indexOf('asmr') >= 0) {
      lines.push('Voice/dialog: gunakan gaya ASMR yang lembut seperti bisikan close-mic, volume rendah, pacing pelan, jeda natural, dan artikulasi halus dalam bahasa ' + language + '.');
      lines.push('Sound design ASMR: utamakan suara foley produk yang detail dan satisfying, seperti gesekan bahan, kemasan dibuka, sentuhan tangan, klik, tap, atau gerakan produk yang sinkron dengan visual.');
    } else {
      lines.push('Voice/dialog: gunakan ' + language + ' dengan gaya ' + audioValue + '.');
    }

    if (String(musicValue || '').toLowerCase().indexOf('without background music') >= 0) {
      lines.push('Backsound musik: tanpa musik latar; biarkan voice dan product sound effects terdengar jelas.');
    } else {
      lines.push('Backsound musik: ' + musicValue + '.');
    }

    return lines;
  }

  function buildSeedancePrompt() {
    var productName = getValue('product-name', 'produk utama');
    var category = getSelectedText('product-category') || 'produk';
    var benefit = getValue('product-benefit', 'membantu kebutuhan harian dan mudah digunakan');
    var audience = getValue('target-audience', 'pembeli affiliate');
    var format = state.choices['ugc-format'] || 'problem-solution';
    var creator = getSelectedText('creator-vibe') || 'Friendly TikTok';
    var camera = getSelectedText('camera-style') || 'Handheld close-up';
    var motion = getSelectedText('motion-style') || 'Reveal + hand demo';
    var lighting = getSelectedText('lighting-style') || 'Natural morning';
    var language = getSelectedText('language-style') || 'Indonesian';
    var music = getSelectedText('music-style') || 'With music';
    var audio = getSelectedText('audio-style') || 'Voiceover + music';
    var cta = getSelectedText('cta-style') || 'Soft CTA';
    var ratio = getValue('ratio-select', '9:16');
    var duration = ($('#duration-slider') && $('#duration-slider').value) || '10';
    var shotPlan = getShotPlan(format, duration, cta);
    var script = getValue('script-input', '');
    var audioInstructions = buildAudioInstructions(format, audio, music, language);

    var sceneMode = formatLabel(format);

    return [
      'Buat video UGC affiliate untuk ' + productName + ', kategori ' + category + ', dengan target penonton ' + audience + '.',
      'Gunakan semua gambar yang diupload sebagai referensi visual sesuai perannya.',
      '',
    ].concat(buildReferenceInstructions()).concat([
      '',
      'Format konten: ' + sceneMode + '.',
      script ? 'Naskah / talking points utama: ' + script + '.' : 'Naskah / talking points utama: buat narasi UGC natural sesuai format konten.',
      'Gaya creator tambahan: gunakan gaya ' + creator + ' selama tetap cocok dengan creator reference jika tersedia.',
      'Benefit utama: ' + benefit + '.',
      'Arah visual tambahan: kamera ' + camera + ', motion focus ' + motion + ', lighting mood ' + lighting + '. Terapkan sebagai style guidance, bukan aturan absolut.',
      'Komposisi harus tetap menampilkan produk, creator, dan background sesuai referensi yang tersedia. Jangan membuat semua shot hanya close-up tangan/produk jika ada creator atau background reference yang perlu terlihat.',
      'Lighting mood hanya arahan suasana. Jika ada background reference, ikuti warna, arah cahaya, dan ambience utama dari background tersebut.',
      'Bahasa output: gunakan ' + language + '.',
    ]).concat(audioInstructions).concat([
      'Format output: ' + ratio + ', komposisi social commerce, skala produk realistis, produk terlihat jelas.',
      '',
      'Shot script untuk video ' + duration + ' detik (' + shotPlan.length + ' shot):'
    ]).concat(shotPlan).concat([
      '',
      'Pacing energik tapi tetap believable. Gunakan motion yang smooth, interaksi tangan realistis, bayangan natural, sound effect produk yang sinkron, dan feel iklan affiliate yang polished. Fokus pada visual produk, creator, dan background sesuai referensi.'
    ]).join('\n');
  }

  function getRecipeData() {
    return {
      product_name: getValue('product-name', ''),
      product_category: getValue('product-category', 'skincare'),
      target_audience: getValue('target-audience', 'busy young adults'),
      product_benefit: getValue('product-benefit', ''),
      script_text: getValue('script-input', ''),
      ugc_format: state.choices['ugc-format'] || 'problem-solution',
      creator_vibe: getValue('creator-vibe', 'friendly TikTok affiliate creator'),
      camera_style: getValue('camera-style', 'handheld close-up camera with natural small movements'),
      motion_style: getValue('motion-style', 'product reveal, hand interaction, and stable close-up demonstration'),
      lighting_style: getValue('lighting-style', 'bright natural morning light, clean home setting'),
      language_style: getValue('language-style', 'Indonesian'),
      music_style: getValue('music-style', 'with subtle upbeat background music'),
      audio_style: getValue('audio-style', 'natural voiceover energy with product handling sound effects synced to motion'),
      cta_style: getValue('cta-style', 'soft CTA to check the product link'),
      ai_model: getSelectedModel(),
      resolution: getValue('resolution-select', '720p'),
      ratio: getValue('ratio-select', '9:16'),
      duration: (($('#duration-slider') && $('#duration-slider').value) || getValue('duration-select', '10')) + 's'
    };
  }

  function updatePromptPreview() {
    setPromptValue(buildSeedancePrompt());
  }

  function setPromptValue(value) {
    var prompt = $('#prompt-input');
    var editor = $('#prompt-editor');
    if (prompt) prompt.value = value || '';
    if (editor) renderPromptEditor(value || '');
  }

  function getReferenceLabel(type, index) {
    if (type === 'product') return 'Product ' + (index + 1);
    if (type === 'model') return 'Creator ' + (index + 1);
    return 'Background ' + (index + 1);
  }

  function renderPromptEditor(value) {
    var editor = $('#prompt-editor');
    if (!editor) return;

    editor.innerHTML = '';
    var tokenPattern = /{{(product|model|background)_refs}}/g;
    var lastIndex = 0;
    var match;

    while ((match = tokenPattern.exec(value)) !== null) {
      editor.appendChild(document.createTextNode(value.slice(lastIndex, match.index)));
      appendReferenceChips(editor, match[1]);
      lastIndex = tokenPattern.lastIndex;
    }

    editor.appendChild(document.createTextNode(value.slice(lastIndex)));
  }

  function appendReferenceChips(editor, type) {
    state.selectedAssets[type].forEach(function (asset, index) {
      editor.appendChild(createMentionChip({
        id: asset.id,
        type: type,
        label: getReferenceLabel(type, index),
        filename: asset.filename || '',
        filepath: asset.filepath
      }));
      editor.appendChild(document.createTextNode(' '));
    });
  }

  function createMentionChip(asset) {
    var chip = document.createElement('span');
    chip.className = 'mention-chip';
    chip.contentEditable = 'false';
    chip.dataset.assetId = asset.id;
    chip.dataset.assetType = asset.type;
    chip.dataset.referenceLabel = asset.label;
    chip.title = asset.label + ' - ' + (asset.filename || asset.type);
    chip.innerHTML = '<img src="/' + escapeHtml(asset.filepath) + '" alt=""><span>' + escapeHtml(asset.label) + '</span>';
    return chip;
  }

  function syncPromptInput() {
    var prompt = $('#prompt-input');
    var editor = $('#prompt-editor');
    if (!prompt || !editor) return;
    var clone = editor.cloneNode(true);
    clone.querySelectorAll('.mention-chip').forEach(function (chip) {
      var label = chip.dataset.referenceLabel || chip.textContent.trim();
      chip.replaceWith(document.createTextNode('[' + label + ']'));
    });
    prompt.value = clone.innerText.replace(/\u00a0/g, ' ').trim();
  }

  function setupPromptEditor() {
    var editor = $('#prompt-editor');
    var menu = $('#mention-menu');
    if (!editor || !menu) return;

    editor.addEventListener('input', syncPromptInput);
    editor.addEventListener('keyup', savePromptRange);
    editor.addEventListener('mouseup', savePromptRange);
    editor.addEventListener('blur', function () {
      setTimeout(hideMentionMenu, 160);
    });

    editor.addEventListener('keydown', function (e) {
      if (e.key === '@') {
        e.preventDefault();
        savePromptRange();
        showMentionMenu();
        return;
      }

      if (menu.classList.contains('show')) {
        var active = menu.querySelector('.mention-option.active') || menu.querySelector('.mention-option');
        if (e.key === 'Escape') {
          e.preventDefault();
          hideMentionMenu();
        } else if (e.key === 'Enter' && active && !active.disabled) {
          e.preventDefault();
          insertMentionChip(state.mentionAssets[active.dataset.assetId]);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          moveMentionActive(e.key === 'ArrowDown' ? 1 : -1);
        }
      }
    });
  }

  function savePromptRange() {
    var editor = $('#prompt-editor');
    var selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    var range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      state.promptRange = range.cloneRange();
    }
  }

  function getMentionAssets() {
    var items = [];
    ['product', 'model', 'background'].forEach(function (type) {
      var labelPrefix = type === 'product' ? 'Product' : type === 'model' ? 'Creator' : 'Background';
      state.selectedAssets[type].forEach(function (asset, index) {
        items.push({
          id: asset.id,
          type: type,
          label: labelPrefix + ' ' + (index + 1),
          filename: asset.filename || '',
          filepath: asset.filepath
        });
      });
    });
    return items;
  }

  function showMentionMenu() {
    savePromptRange();
    var menu = $('#mention-menu');
    if (!menu) return;
    var assets = getMentionAssets();
    state.mentionAssets = {};

    if (assets.length === 0) {
      menu.innerHTML = '<button class="mention-option" type="button" disabled><span><strong>No references selected</strong><small>Upload or choose images first</small></span></button>';
      positionMentionMenu();
      menu.classList.add('show');
      return;
    }

    menu.innerHTML = assets.map(function (asset, index) {
      state.mentionAssets[String(asset.id)] = asset;
      return '<button class="mention-option' + (index === 0 ? ' active' : '') + '" type="button" data-asset-id="' + asset.id + '">' +
        '<img src="/' + escapeHtml(asset.filepath) + '" alt="">' +
        '<span><strong>' + escapeHtml(asset.label) + '</strong><small>' + escapeHtml(asset.filename || asset.type) + '</small></span>' +
        '</button>';
    }).join('');

    menu.querySelectorAll('.mention-option').forEach(function (option) {
      option.addEventListener('mousedown', function (e) {
        e.preventDefault();
        insertMentionChip(state.mentionAssets[option.dataset.assetId]);
      });
    });

    positionMentionMenu();
    menu.classList.add('show');
  }

  function positionMentionMenu() {
    var editor = $('#prompt-editor');
    var menu = $('#mention-menu');
    if (!editor || !menu) return;

    var editorRect = editor.getBoundingClientRect();
    var range = state.promptRange;
    var rect = null;

    if (range) {
      var probe = range.cloneRange();
      probe.collapse(true);
      rect = probe.getBoundingClientRect();
      if (!rect || (rect.left === 0 && rect.top === 0)) {
        var marker = document.createElement('span');
        marker.textContent = '\u200b';
        probe.insertNode(marker);
        rect = marker.getBoundingClientRect();
        marker.parentNode.removeChild(marker);
      }
    }

    var left = rect ? rect.left - editorRect.left : 12;
    var top = rect ? rect.bottom - editorRect.top + editor.scrollTop + 8 : 12;
    var maxLeft = Math.max(8, editor.clientWidth - 320);

    menu.style.left = Math.max(8, Math.min(left, maxLeft)) + 'px';
    menu.style.right = 'auto';
    menu.style.top = Math.max(8, top) + 'px';
    menu.style.bottom = 'auto';
    menu.style.width = Math.min(320, editor.clientWidth - 16) + 'px';
  }

  function hideMentionMenu() {
    var menu = $('#mention-menu');
    if (menu) menu.classList.remove('show');
  }

  function moveMentionActive(step) {
    var menu = $('#mention-menu');
    if (!menu) return;
    var options = Array.from(menu.querySelectorAll('.mention-option:not([disabled])'));
    if (options.length === 0) return;
    var current = options.findIndex(function (option) { return option.classList.contains('active'); });
    var next = current < 0 ? 0 : (current + step + options.length) % options.length;
    options.forEach(function (option, index) {
      option.classList.toggle('active', index === next);
    });
  }

  function insertMentionChip(asset) {
    var editor = $('#prompt-editor');
    if (!editor || !asset) return;

    editor.focus();
    var selection = window.getSelection();
    var range = state.promptRange;
    if (range) {
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    var chip = createMentionChip(asset);

    var space = document.createTextNode(' ');
    var activeRange = selection.rangeCount ? selection.getRangeAt(0) : document.createRange();
    activeRange.deleteContents();
    activeRange.insertNode(space);
    activeRange.insertNode(chip);
    activeRange.setStartAfter(space);
    activeRange.setEndAfter(space);
    activeRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(activeRange);

    savePromptRange();
    syncPromptInput();
    hideMentionMenu();
  }

  function setupRecipeInputs() {
    $$('.recipe-input').forEach(function (el) {
      el.addEventListener('input', updatePromptPreview);
      el.addEventListener('change', function () {
        updatePromptPreview();
        updatePreviewMeta();
      });
    });
  }

  function setupScriptInput() {
    var input = $('#script-input');
    var counter = $('#script-count');
    if (!input) return;

    function sync() {
      if (counter) counter.textContent = input.value.length;
      updatePromptPreview();
      updatePreviewMock();
    }

    input.addEventListener('input', sync);
    sync();
  }

  function setupUgcFormatSelect() {
    var select = $('#ugc-format-select');
    if (!select) return;
    select.addEventListener('change', function () {
      state.choices['ugc-format'] = select.value;
      applyDirectorPreset(select.value);
      updatePromptPreview();
      updatePreviewMock();
    });
    state.choices['ugc-format'] = select.value;
  }

  function updatePreviewMeta() {
    var ratio = $('#ratio-select');
    var label = $('#preview-ratio-label');
    if (ratio && label) label.textContent = ratio.value;
  }

  function updatePreviewMock() {
    var empty = $('#preview-empty');
    if (!empty || $('#video-results').children.length > 0) return;
    empty.classList.remove('has-mock');
    empty.innerHTML = '<i class="ti ti-movie"></i><span>Generated video will appear here</span>';
  }

  function setupChoiceCards() {
    $$('.choice-grid').forEach(function (grid) {
      var target = grid.dataset.target;
      grid.querySelectorAll('.choice-card').forEach(function (card) {
        card.addEventListener('click', function () {
          grid.querySelectorAll('.choice-card').forEach(function (item) {
            item.classList.remove('active');
          });
          card.classList.add('active');
          state.choices[target] = card.dataset.value;
          if (target === 'ugc-format') {
            applyDirectorPreset(card.dataset.value);
          }
          updatePromptPreview();
        });
      });
    });
  }

  function applyDirectorPreset(format) {
    var preset = directorPresets[format];
    if (!preset) return;

    Object.keys(preset).forEach(function (id) {
      var el = $('#' + id);
      if (el) el.value = preset[id];
    });
  }

  function setChoiceValue(target, value) {
    if (!target || !value) return;
    var grid = document.querySelector('.choice-grid[data-target="' + target + '"]');
    if (!grid) return;

    var selected = grid.querySelector('.choice-card[data-value="' + value + '"]');
    if (!selected) return;

    grid.querySelectorAll('.choice-card').forEach(function (card) {
      card.classList.toggle('active', card === selected);
    });
    state.choices[target] = value;
  }

  function setupCopyPrompt() {
    var btn = $('#copy-prompt-btn');
    var prompt = $('#prompt-input');
    if (!btn || !prompt) return;

    btn.addEventListener('click', function () {
      syncPromptInput();
      navigator.clipboard.writeText(prompt.value).then(function () {
        showToast('Prompt copied', 'success');
      }).catch(function () {
        showToast('Copy failed', 'error');
      });
    });
  }

  function setupDurationSlider() {
    var slider = $('#duration-slider');
    var select = $('#duration-select');
    var display = $('#duration-display');
    if (!slider || !display) return;
    slider.addEventListener('input', function (e) {
      display.textContent = e.target.value + 's';
      if (select) select.value = e.target.value;
      updatePromptPreview();
    });
    if (select) {
      select.addEventListener('change', function (e) {
        slider.value = e.target.value;
        display.textContent = e.target.value + 's';
        updatePromptPreview();
      });
    }
  }

  function setupModelSelector() {
    var select = $('#ai-model-select');
    var trigger = $('#model-selector');
    var wrap = $('#model-select-wrap');
    var options = $('#model-options');
    if (!select) return;

    function applyModel(val) {
      var resSelect = $('#resolution-select');
      var activeOption = options ? options.querySelector('.model-option[data-value="' + val + '"]') : null;

      if (val === 'seedance-2.0-fast') {
        if ($('#model-display-name')) $('#model-display-name').textContent = activeOption ? activeOption.dataset.name : 'Seedance 2.0 Fast';
        if ($('#model-display-desc')) $('#model-display-desc').textContent = activeOption ? activeOption.dataset.desc : 'Fast draft mode';
        if (resSelect) {
          var opt = resSelect.querySelector('option[value="1080p"]');
          if (opt) opt.disabled = true;
          if (resSelect.value === '1080p') {
            resSelect.value = '720p';
          }
        }
      } else {
        if ($('#model-display-name')) $('#model-display-name').textContent = activeOption ? activeOption.dataset.name : 'Seedance 2.0';
        if ($('#model-display-desc')) $('#model-display-desc').textContent = activeOption ? activeOption.dataset.desc : 'Quality mode';
        if (resSelect) {
          var opt2 = resSelect.querySelector('option[value="1080p"]');
          if (opt2) opt2.disabled = false;
        }
      }

      if (options) {
        options.querySelectorAll('.model-option').forEach(function (option) {
          var isActive = option.dataset.value === val;
          option.classList.toggle('active', isActive);
          option.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
      }
      updatePromptPreview();
    }

    if (trigger && wrap && options) {
      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = wrap.classList.toggle('open');
        trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      options.querySelectorAll('.model-option').forEach(function (option) {
        option.addEventListener('click', function (e) {
          e.stopPropagation();
          select.value = option.dataset.value;
          applyModel(select.value);
          wrap.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        });
      });

      document.addEventListener('click', function () {
        wrap.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      });
    }

    select.addEventListener('change', function (e) {
      applyModel(e.target.value);
    });

    applyModel(select.value);
  }

  function setupUploadHandlers() {
    ['product', 'model', 'background'].forEach(function (type) {
      var input = document.querySelector('#add-' + type + ' input[type="file"]');
      if (!input) return;

      input.addEventListener('change', function (e) {
        var files = Array.from(e.target.files);
        if (files.length === 0) return;

        if (getTotalAssetsCount() + files.length > 9) {
          showToast('Maximum 9 reference images total', 'error');
          input.value = '';
          return;
        }

        var formData = new FormData();
        formData.append('type', type);
        files.forEach(function (f) { formData.append('files', f); });

        fetch('/api/assets/upload', { method: 'POST', body: formData })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (data.assets) {
              data.assets.forEach(function (asset) {
                setSelectedAssetsForType(type, [asset]);
                addAssetToGrid(type, asset);
              });
              updatePromptPreview();
              updatePreviewMock();
            }
          })
          .catch(function () {
            showToast('Upload failed', 'error');
          });

        input.value = '';
      });
    });
  }

  function setSelectedAssetsForType(type, assets) {
    var grid = $('#grid-' + type);
    state.selectedAssets[type] = assets.slice(0, 1);

    if (!grid) return;
    grid.querySelectorAll('.upload-item:not(.library-item)').forEach(function (item) {
      item.remove();
    });
    grid.querySelectorAll('.library-item').forEach(function (item) {
      var assetId = parseInt(item.dataset.assetId, 10);
      var selected = state.selectedAssets[type].some(function (asset) {
        return asset.id === assetId;
      });
      item.classList.toggle('selected', selected);
    });
  }

  function addAssetToGrid(type, asset) {
    var grid = $('#grid-' + type);
    var addBtn = $('#add-' + type);
    var item = document.createElement('div');
    item.className = 'upload-item';
    item.dataset.assetId = asset.id;
    item.innerHTML = '<img src="/' + asset.filepath + '" alt="">' +
      '<button class="remove-btn" data-id="' + asset.id + '" data-type="' + type + '">&times;</button>';

    item.querySelector('.remove-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      removeAsset(type, asset.id, item);
    });

    grid.insertBefore(item, addBtn.nextSibling);
  }

  function removeAsset(type, assetId, element) {
    state.selectedAssets[type] = state.selectedAssets[type].filter(function (a) { return a.id !== assetId; });
    element.remove();
    updatePromptPreview();
    updatePreviewMock();
  }

  function setupLibraryToggles() {
    $$('.library-switch').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var type = btn.dataset.type;
        var tab = btn.dataset.tab;

        if (tab === 'library') {
          loadLibraryAssets(type);
        } else {
          restoreUploadView(type);
        }
      });
    });
  }

  function loadLibraryAssets(type) {
    var grid = $('#grid-' + type);
    var addBtn = $('#add-' + type);
    var switchBtn = document.querySelector('.library-switch[data-type="' + type + '"]');
    addBtn.style.display = 'none';
    grid.classList.add('library-mode');
    grid.querySelectorAll('.upload-item:not(.library-item)').forEach(function (item) {
      item.remove();
    });
    if (switchBtn) {
      switchBtn.dataset.tab = 'upload';
      switchBtn.textContent = 'Upload';
    }
    ensureLibraryControls(type);

    fetch('/api/assets?type=' + type)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        state.library[type].assets = data.assets || [];
        state.library[type].visible = 15;
        renderLibraryAssets(type);
      })
      .catch(function () {
        showToast('Failed to load library', 'error');
      });
  }

  function ensureLibraryControls(type) {
    var grid = $('#grid-' + type);
    if (!grid || grid.previousElementSibling && grid.previousElementSibling.classList.contains('library-controls')) return;

    var controls = document.createElement('div');
    controls.className = 'library-controls';
    controls.dataset.type = type;
    controls.innerHTML = '<div class="library-search-wrap">' +
      '<i class="ti ti-search"></i>' +
      '<input class="library-search" type="search" placeholder="Search library">' +
      '</div>';

    controls.querySelector('.library-search').addEventListener('input', function (e) {
      state.library[type].query = e.target.value.trim().toLowerCase();
      state.library[type].visible = 15;
      renderLibraryAssets(type);
    });

    grid.parentNode.insertBefore(controls, grid);
  }

  function getFilteredLibraryAssets(type) {
    var data = state.library[type];
    if (!data.query) return data.assets;

    return data.assets.filter(function (asset) {
      return (asset.filename || '').toLowerCase().indexOf(data.query) >= 0;
    });
  }

  function renderLibraryAssets(type) {
    var grid = $('#grid-' + type);
    var data = state.library[type];
    var assets = getFilteredLibraryAssets(type);

    grid.querySelectorAll('.library-item, .library-empty, .library-load-more-wrap').forEach(function (el) {
      el.remove();
    });

    assets.slice(0, data.visible).forEach(function (asset) {
      var alreadyShown = grid.querySelector('[data-asset-id="' + asset.id + '"]');
      if (alreadyShown) return;

      var isSelected = state.selectedAssets[type].some(function (a) { return a.id === asset.id; });
      var item = document.createElement('div');
      item.className = 'upload-item library-item' + (isSelected ? ' selected' : '');
      item.dataset.assetId = asset.id;
      item.title = asset.filename || '';
      item.innerHTML = '<img src="/' + asset.filepath + '" alt="">' +
        '<button class="library-delete-btn" type="button" title="Delete asset"><i class="ti ti-trash"></i></button>';

      item.querySelector('.library-delete-btn').addEventListener('click', function (e) {
        e.stopPropagation();
        deleteLibraryAsset(type, asset.id);
      });

      item.addEventListener('click', function () {
        var idx = state.selectedAssets[type].findIndex(function (a) { return a.id === asset.id; });
        if (idx >= 0) {
          setSelectedAssetsForType(type, []);
        } else {
          var totalAfterReplace = getTotalAssetsCount() - state.selectedAssets[type].length + 1;
          if (totalAfterReplace > 9) {
            showToast('Maximum 9 reference images total', 'error');
            return;
          }
          setSelectedAssetsForType(type, [asset]);
        }
        updatePromptPreview();
        updatePreviewMock();
      });

      grid.appendChild(item);
    });

    if (assets.length === 0 && grid.querySelectorAll('.upload-item').length === 0) {
      var empty = document.createElement('div');
      empty.className = 'library-empty';
      empty.textContent = data.query ? 'No matches' : 'No assets';
      grid.appendChild(empty);
    }

    if (assets.length > data.visible) {
      var wrap = document.createElement('div');
      wrap.className = 'library-load-more-wrap';
      wrap.innerHTML = '<button class="library-load-more" type="button">Load more</button>';
      wrap.querySelector('button').addEventListener('click', function () {
        data.visible += 15;
        renderLibraryAssets(type);
      });
      grid.appendChild(wrap);
    }
  }

  function deleteLibraryAsset(type, assetId) {
    var ok = window.confirm('Delete this image from library?');
    if (!ok) return;

    fetch('/api/assets/' + assetId, { method: 'DELETE' })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) {
          showToast(result.data.error || 'Delete failed', 'error');
          return;
        }

        state.library[type].assets = state.library[type].assets.filter(function (asset) {
          return asset.id !== assetId;
        });
        state.selectedAssets[type] = state.selectedAssets[type].filter(function (asset) {
          return asset.id !== assetId;
        });
        renderLibraryAssets(type);
        updatePromptPreview();
        updatePreviewMock();
        showToast('Image deleted', 'success');
      })
      .catch(function () {
        showToast('Delete failed', 'error');
      });
  }

  function restoreUploadView(type) {
    var grid = $('#grid-' + type);
    var addBtn = $('#add-' + type);
    var switchBtn = document.querySelector('.library-switch[data-type="' + type + '"]');
    addBtn.style.display = '';
    grid.classList.remove('library-mode');
    if (switchBtn) {
      switchBtn.dataset.tab = 'library';
      switchBtn.textContent = 'Library';
    }
    var controls = grid.previousElementSibling;
    if (controls && controls.classList.contains('library-controls')) controls.remove();
    grid.querySelectorAll('.library-item, .library-empty').forEach(function (el) { el.remove(); });
    grid.querySelectorAll('.library-load-more-wrap').forEach(function (el) { el.remove(); });
    grid.querySelectorAll('.upload-item:not(.library-item)').forEach(function (el) { el.remove(); });
    state.selectedAssets[type].forEach(function (asset) {
      addAssetToGrid(type, asset);
    });
  }

  function setupGenerateButton() {
    var btn = $('#generate-btn');
    var addQueueBtn = $('#add-queue-btn');
    var cancelBtn = $('#queue-cancel-btn');

    btn.addEventListener('click', function () {
      if (state.editingQueueId) {
        saveQueueEdits();
        return;
      }

      var payload = buildGeneratePayload();
      if (!payload) return;

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Generating...';

      createVideoFromPayload(payload)
        .then(function (data) {
          if (data.error) {
            showToast(data.error, 'error', 5200);
            resetGenerateButton();
            loadHistoryStrip();
            return;
          }
          state.currentVideoId = data.id;
          addVideoResult(data.id, {
            prompt: payload.prompt,
            resolution: payload.resolution,
            ratio: payload.ratio,
            duration: payload.duration,
            ai_model: payload.ai_model,
            status: 'generating'
          });
          startStatusPolling(data.id);
        })
        .catch(function () {
          showToast('Generation failed', 'error');
          resetGenerateButton();
        });
    });

    if (addQueueBtn) {
      addQueueBtn.addEventListener('click', function () {
        var payload = buildGeneratePayload();
        if (!payload) return;
        addQueueItem(payload);
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        exitQueueEditMode(true);
      });
    }
  }

  function buildGeneratePayload() {
    syncPromptInput();
    var prompt = $('#prompt-input').value.trim();

    if (state.selectedAssets.product.length === 0) {
      showToast('Upload at least one product photo for image-to-video UGC', 'error');
      return null;
    }

    if (!prompt) {
      showToast('Prompt is required', 'error');
      return null;
    }

    var allAssets = [].concat(
      state.selectedAssets.product,
      state.selectedAssets.model,
      state.selectedAssets.background
    );

    return {
      prompt: prompt,
      resolution: $('#resolution-select').value,
      ratio: $('#ratio-select').value,
      duration: $('#duration-slider').value + 's',
      ai_model: getSelectedModel(),
      asset_ids: allAssets.map(function (a) { return a.id; }),
      recipe_data: getRecipeData()
    };
  }

  function createVideoFromPayload(payload) {
    return fetch('/api/videos/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) { return res.json(); });
  }

  function getQueueTitle(payload) {
    var data = payload.recipe_data || {};
    return data.product_name || (payload.prompt ? payload.prompt.substring(0, 40) : 'UGC video');
  }

  function getQueueProductThumb(payload) {
    var assetIds = (payload && payload.asset_ids) || [];
    var product = state.assetCache.find(function (asset) {
      return asset.type === 'product' && assetIds.indexOf(asset.id) >= 0;
    });
    return product ? '/' + product.filepath : '';
  }

  function addQueueItem(payload) {
    state.assetCache = mergeAssetCache(state.assetCache, [].concat(
      state.selectedAssets.product,
      state.selectedAssets.model,
      state.selectedAssets.background
    ));
    fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: getQueueTitle(payload),
        payload: payload
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.error) {
          showToast(data.error, 'error');
          return;
        }
        showToast('Added to queue', 'success');
        resetCreateForm();
        loadQueue();
        openQueuePanel();
      })
      .catch(function () {
        showToast('Failed to add queue item', 'error');
      });
  }

  function mergeAssetCache(current, incoming) {
    var map = {};
    (current || []).concat(incoming || []).forEach(function (asset) {
      if (asset && asset.id) map[asset.id] = asset;
    });
    return Object.keys(map).map(function (id) { return map[id]; });
  }

  function setupQueueControls() {
    var btn = $('#queue-btn');
    var closeBtn = $('#queue-close-btn');
    var backdrop = $('#queue-backdrop');
    var startBtn = $('#batch-start-btn');
    var stopBtn = $('#batch-stop-btn');

    if (btn) btn.addEventListener('click', openQueuePanel);
    if (closeBtn) closeBtn.addEventListener('click', closeQueuePanel);
    if (backdrop) backdrop.addEventListener('click', closeQueuePanel);
    if (startBtn) startBtn.addEventListener('click', startBatchQueue);
    if (stopBtn) {
      stopBtn.addEventListener('click', function () {
        state.stopAfterCurrent = true;
        stopBtn.disabled = true;
        stopBtn.textContent = 'Stopping...';
        showToast('Batch will stop after the current video', 'info');
      });
    }
  }

  function openQueuePanel() {
    var panel = $('#queue-panel');
    var backdrop = $('#queue-backdrop');
    if (panel) {
      panel.classList.add('show');
      panel.setAttribute('aria-hidden', 'false');
    }
    if (backdrop) backdrop.classList.add('show');
  }

  function closeQueuePanel() {
    var panel = $('#queue-panel');
    var backdrop = $('#queue-backdrop');
    if (panel) {
      panel.classList.remove('show');
      panel.setAttribute('aria-hidden', 'true');
    }
    if (backdrop) backdrop.classList.remove('show');
  }

  function loadQueue() {
    Promise.all([
      fetch('/api/queue').then(function (res) { return res.json(); }),
      fetch('/api/assets').then(function (res) { return res.json(); }).catch(function () { return { assets: [] }; })
    ])
      .then(function (results) {
        state.queue = results[0].items || [];
        state.assetCache = results[1].assets || [];
        renderQueue();
      })
      .catch(function () { });
  }

  function renderQueue() {
    var list = $('#queue-list');
    var badge = $('#queue-badge');
    var summary = $('#queue-summary');
    var startBtn = $('#batch-start-btn');
    var stopBtn = $('#batch-stop-btn');
    if (!list) return;

    var pendingCount = state.queue.filter(function (item) {
      return item.status === 'queued';
    }).length;
    var activeCount = state.queue.filter(function (item) {
      return item.status === 'queued' || item.status === 'running';
    }).length;

    if (badge) {
      badge.textContent = String(activeCount);
      badge.hidden = activeCount === 0;
    }

    if (summary) {
      var completed = state.queue.filter(function (item) { return item.status === 'completed'; }).length;
      var paused = state.queue.filter(function (item) { return item.status === 'paused'; }).length;
      var failed = state.queue.filter(function (item) { return item.status === 'failed'; }).length;
      summary.textContent = state.queue.length
        ? completed + ' completed · ' + pendingCount + ' queued · ' + paused + ' paused · ' + failed + ' failed'
        : 'No items';
    }

    if (startBtn) {
      startBtn.disabled = state.batchRunning || pendingCount === 0;
      startBtn.innerHTML = state.batchRunning ? '<span class="spinner"></span> Running batch' : 'Start Batch';
    }
    if (stopBtn) {
      stopBtn.hidden = !state.batchRunning;
      if (!state.batchRunning) {
        stopBtn.disabled = false;
        stopBtn.textContent = 'Stop After Current';
      }
    }

    if (state.queue.length === 0) {
      list.innerHTML = '<div class="queue-empty">No queue items yet</div>';
      return;
    }

    list.innerHTML = state.queue.map(function (item) {
      var payload = item.payload || {};
      var data = payload.recipe_data || {};
      var title = item.title || data.product_name || 'UGC video';
      var meta = [payload.duration || '-', payload.ratio || '-', payload.ai_model || '-'].join(' · ');
      var productThumb = getQueueProductThumb(payload);
      var thumbHtml = productThumb
        ? '<img src="' + productThumb + '" alt="">'
        : '<div class="queue-thumb-placeholder"><i class="ti ti-package"></i></div>';
      var isEditing = String(item.id) === String(state.editingQueueId);
      var statusLabel = item.status.charAt(0).toUpperCase() + item.status.slice(1);
      var actions = getQueueItemActions(item);

      return '<div class="queue-item ' + item.status + (isEditing ? ' editing' : '') + '" data-queue-id="' + item.id + '">' +
        '<div class="queue-item-thumb">' + thumbHtml + '</div>' +
        '<div class="queue-item-main">' +
        '<div class="queue-item-title">' + escapeHtml(title) + '</div>' +
        '<div class="queue-item-meta">' + escapeHtml(meta) + '</div>' +
        (item.error_message ? '<div class="queue-item-error">' + escapeHtml(item.error_message) + '</div>' : '') +
        '</div>' +
        '<div class="queue-item-status"><span class="queue-status-dot ' + item.status + '"></span>' + escapeHtml(statusLabel) + '</div>' +
        '<div class="queue-item-actions">' + actions + '</div>' +
        '</div>';
    }).join('');

    list.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleQueueAction(btn.dataset.action, btn.closest('.queue-item').dataset.queueId);
      });
    });
  }

  function getQueueItemActions(item) {
    if (item.status === 'running') return '<span class="queue-spinner"><span class="spinner"></span></span>';
    if (item.status === 'completed') return '<button type="button" data-action="view">View</button>';
    if (state.batchRunning) {
      if (item.status === 'paused') {
        return '<button type="button" data-action="resume">Resume</button><button type="button" data-action="delete">Delete</button>';
      }
      if (item.status === 'queued') {
        return '<button type="button" data-action="pause">Pause</button><button type="button" data-action="delete">Delete</button>';
      }
      return '<button type="button" data-action="delete">Delete</button>';
    }
    if (item.status === 'paused') {
      return '<button type="button" data-action="resume">Resume</button><button type="button" data-action="edit">Edit</button><button type="button" data-action="delete">Delete</button>';
    }
    return '<button type="button" data-action="edit">Edit</button><button type="button" data-action="delete">Delete</button>';
  }

  function handleQueueAction(action, id) {
    var item = state.queue.find(function (q) { return String(q.id) === String(id); });
    if (!item) return;

    if (action === 'edit') return enterQueueEditMode(item);
    if (action === 'view' && item.video_id) return loadAndShowVideo(item.video_id);
    if (action === 'delete') return deleteQueueItem(id);
    if (action === 'pause') return updateQueueStatus(id, 'paused');
    if (action === 'resume') return updateQueueStatus(id, 'queued');
  }

  function updateQueueStatus(id, status) {
    fetch('/api/queue/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.error) {
          showToast(data.error, 'error');
          return;
        }
        loadQueue();
      })
      .catch(function () { showToast('Failed to update queue item', 'error'); });
  }

  function deleteQueueItem(id) {
    fetch('/api/queue/' + id, { method: 'DELETE' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.error) {
          showToast(data.error, 'error');
          return;
        }
        if (String(state.editingQueueId) === String(id)) exitQueueEditMode(true);
        loadQueue();
      })
      .catch(function () { showToast('Failed to delete queue item', 'error'); });
  }

  function enterQueueEditMode(item) {
    if (state.batchRunning) {
      showToast('Pause the batch before editing queue items', 'error');
      return;
    }
    state.editingQueueId = item.id;
    applyPayloadToForm(item.payload || {});
    setQueueFooterMode(true);
    openQueuePanel();
    renderQueue();
  }

  function setQueueFooterMode(isEditing) {
    var createBtn = $('#generate-btn');
    var addBtn = $('#add-queue-btn');
    var cancelBtn = $('#queue-cancel-btn');
    if (createBtn) createBtn.textContent = isEditing ? 'Save Changes' : 'Create Video';
    if (addBtn) addBtn.hidden = isEditing;
    if (cancelBtn) cancelBtn.hidden = !isEditing;
  }

  function exitQueueEditMode(shouldReset) {
    state.editingQueueId = null;
    setQueueFooterMode(false);
    if (shouldReset) resetCreateForm();
    renderQueue();
  }

  function saveQueueEdits() {
    var payload = buildGeneratePayload();
    if (!payload) return;

    fetch('/api/queue/' + state.editingQueueId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: getQueueTitle(payload),
        payload: payload,
        status: 'queued',
        error_message: null
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.error) {
          showToast(data.error, 'error');
          return;
        }
        showToast('Queue item updated', 'success');
        exitQueueEditMode(true);
        loadQueue();
      })
      .catch(function () { showToast('Failed to update queue item', 'error'); });
  }

  function startBatchQueue() {
    if (state.batchRunning) return;
    state.batchRunning = true;
    state.stopAfterCurrent = false;
    renderQueue();
    runNextQueueItem();
  }

  function finishBatchQueue() {
    state.batchRunning = false;
    state.stopAfterCurrent = false;
    renderQueue();
    loadHistoryStrip();
  }

  function runNextQueueItem() {
    fetch('/api/queue')
      .then(function (res) { return res.json(); })
      .then(function (queueData) {
        state.queue = queueData.items || [];
        renderQueue();

        if (state.stopAfterCurrent) {
          finishBatchQueue();
          showToast('Batch stopped', 'info');
          return;
        }

        var item = state.queue.find(function (q) { return q.status === 'queued'; });
        if (!item) {
          finishBatchQueue();
          showToast('Batch complete', 'success');
          return;
        }

        updateQueueStatusLocal(item.id, 'running');
        fetch('/api/queue/' + item.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'running', error_message: null })
        })
          .then(function () { return createVideoFromPayload(item.payload); })
          .then(function (data) {
            if (data.error) {
              return markQueueFailed(item.id, data.error).then(runNextQueueItem);
            }
            return waitForVideoCompletion(data.id).then(function (result) {
              if (result.status === 'completed') {
                return fetch('/api/queue/' + item.id, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'completed', video_id: data.id, error_message: null })
                }).then(function () {
                  loadHistoryStrip();
                  return runNextQueueItem();
                });
              }
              return markQueueFailed(item.id, result.error_message || 'Generation failed').then(runNextQueueItem);
            });
          })
          .catch(function (err) {
            markQueueFailed(item.id, err.message || 'Generation failed').then(runNextQueueItem);
          });
      })
      .catch(function () {
        finishBatchQueue();
        showToast('Failed to load queue', 'error');
      });
  }

  function updateQueueStatusLocal(id, status) {
    state.queue = state.queue.map(function (item) {
      if (String(item.id) === String(id)) item.status = status;
      return item;
    });
    renderQueue();
  }

  function markQueueFailed(id, message) {
    return fetch('/api/queue/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'failed', error_message: message || 'Generation failed' })
    }).then(loadQueue);
  }

  function waitForVideoCompletion(videoId) {
    return new Promise(function (resolve) {
      var attempts = 0;
      var timer = setInterval(function () {
        attempts++;
        fetch('/api/videos/' + videoId + '/status')
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (data.status === 'completed' || data.status === 'failed') {
              clearInterval(timer);
              resolve(data);
            } else if (attempts > 180) {
              clearInterval(timer);
              resolve({ status: 'failed', error_message: 'Generation timed out' });
            }
          })
          .catch(function () {
            clearInterval(timer);
            resolve({ status: 'failed', error_message: 'Connection error' });
          });
      }, 5000);
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.prompt-more-btn');
    if (!btn) return;

    var prompt = btn.closest('.video-result-prompt');
    if (!prompt) return;

    var isOpen = prompt.classList.toggle('expanded');
    btn.textContent = isOpen ? 'Show less' : 'Show more';
  });

  function getSelectedModel() {
    var select = $('#ai-model-select');
    if (select) return select.value;
    return 'seedance-2.0';
  }

  function renderPromptSummary(prompt) {
    return '<div class="video-result-prompt">' +
      '<div class="video-result-prompt-text">' + escapeHtml(prompt) + '</div>' +
      '<button class="prompt-more-btn" type="button">Show more</button>' +
      '</div>';
  }

  function addVideoResult(videoId, data) {
    var container = $('#video-results');
    var emptyEl = $('#preview-empty');
    if (emptyEl) emptyEl.style.display = 'none';

    var card = document.createElement('div');
    card.className = 'video-result';
    card.id = 'video-' + videoId;
    card.dataset.videoId = videoId;

    var statusHtml = '<div class="status-indicator" id="status-' + videoId + '">' +
      '<span class="status-dot generating"></span>' +
      '<span>Generating video...</span></div>';

    card.innerHTML = '<div class="video-result-media"><div class="video-result-player">' +
      '<i class="ti ti-movie placeholder-icon"></i>' +
      '</div></div>' +
      '<div class="video-result-side">' +
      statusHtml +
      '<div class="video-result-details">' +
      renderPromptSummary(data.prompt) +
      '<div class="video-result-params">' +
      '<div class="param-item"><span class="param-label">Resolution</span><span class="param-value">' + data.resolution + '</span></div>' +
      '<div class="param-item"><span class="param-label">Ratio</span><span class="param-value">' + data.ratio + '</span></div>' +
      '<div class="param-item"><span class="param-label">Duration</span><span class="param-value">' + (data.duration || '10s') + '</span></div>' +
      '<div class="param-item"><span class="param-label">Model</span><span class="param-value">' + data.ai_model + '</span></div>' +
      '</div></div></div>';

    container.innerHTML = '';
    container.appendChild(card);
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function startStatusPolling(videoId) {
    if (state.pollInterval) clearInterval(state.pollInterval);

    state.pollInterval = setInterval(function () {
      fetch('/api/videos/' + videoId + '/status')
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.status === 'completed' && data.video_url) {
            clearInterval(state.pollInterval);
            state.pollInterval = null;
            updateVideoResult(videoId, data.video_url);
            resetGenerateButton();
            loadHistoryStrip();
          } else if (data.status === 'failed') {
            clearInterval(state.pollInterval);
            state.pollInterval = null;
            updateVideoStatus(videoId, 'failed', data.error_message || 'Generation failed');
            resetGenerateButton();
            loadHistoryStrip();
          }
        })
        .catch(function () {
          clearInterval(state.pollInterval);
          state.pollInterval = null;
          updateVideoStatus(videoId, 'failed', 'Connection error');
          resetGenerateButton();
        });
    }, 5000);
  }

  function updateVideoResult(videoId, videoUrl) {
    var card = $('#video-' + videoId);
    if (!card) return;

    var player = card.querySelector('.video-result-player');
    player.innerHTML = '<video src="' + videoUrl + '" controls></video>';
    captureAndUploadVideoThumbnail(videoId, videoUrl);

    var statusEl = card.querySelector('.status-indicator');
    if (statusEl) {
      statusEl.innerHTML = '<span class="status-dot completed"></span><span>Completed</span>';
    }
  }

  function updateVideoStatus(videoId, status, message) {
    var statusEl = $('#status-' + videoId);
    if (!statusEl) return;
    statusEl.innerHTML = '<span class="status-dot ' + status + '"></span><span>' + escapeHtml(message) + '</span>';
  }

  function resetGenerateButton() {
    var btn = $('#generate-btn');
    btn.disabled = false;
    btn.textContent = state.editingQueueId ? 'Save Changes' : 'Create Video';
  }

  function loadHistoryStrip() {
    fetch('/api/videos')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        state.videos = data.videos || [];
        renderHistoryStrip();
      })
      .catch(function () { });
  }

  function renderHistoryStrip() {
    var strip = $('#history-strip');
    if (state.videos.length === 0) {
      strip.innerHTML = '<div class="history-empty">No videos yet</div>';
      return;
    }

    strip.innerHTML = state.videos.map(function (v) {
      var title = getVideoTitle(v);
      var thumbnail = v.thumbnail_url || state.thumbnails[v.id];
      var thumbContent = thumbnail
        ? '<img src="' + thumbnail + '" alt="">'
        : v.status === 'completed' && v.video_url
          ? '<video src="' + v.video_url + '#t=0.1" muted playsinline preload="metadata"></video>'
          : '<div class="history-thumb-placeholder"><i class="ti ti-movie"></i></div>';
      var date = new Date(v.created_at + 'Z').toLocaleDateString('en-US', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
      var activeClass = String(v.id) === String(state.currentVideoId) ? ' active' : '';

      return '<div class="ugc-video-card' + activeClass + '" data-video-id="' + v.id + '" title="' + escapeHtml(v.prompt) + '">' +
        '<div class="ugc-video-thumb">' + thumbContent + '</div>' +
        '<div class="ugc-video-info">' +
        '<div class="ugc-video-title">' + escapeHtml(title) + '</div>' +
        '<div class="ugc-video-meta">' + escapeHtml(v.duration || '-') + ' &bull; ' + escapeHtml(v.ratio || '-') + ' &bull; ' + escapeHtml(v.status) + '</div>' +
        '<div class="ugc-video-date">' + date + '</div>' +
        '</div>' +
        '</div>';
    }).join('');

    state.videos.forEach(function (v) {
      if (v.status === 'completed' && v.video_url && !v.thumbnail_url && !state.thumbnails[v.id]) {
        captureAndUploadVideoThumbnail(v.id, v.video_url);
      }
    });

    strip.querySelectorAll('.ugc-video-card').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var videoId = thumb.dataset.videoId;
        setActiveHistoryCard(videoId);
        loadAndApplyRecentVideo(videoId);
      });
    });

    strip.querySelectorAll('.ugc-video-thumb video').forEach(function (video) {
      video.addEventListener('loadedmetadata', function () {
        try { video.currentTime = Math.min(0.1, video.duration || 0.1); } catch (e) { }
      }, { once: true });
      video.addEventListener('seeked', function () {
        video.pause();
      }, { once: true });
    });
  }

  function setActiveHistoryCard(videoId) {
    state.currentVideoId = videoId;
    $$('.ugc-video-card').forEach(function (card) {
      card.classList.toggle('active', String(card.dataset.videoId) === String(videoId));
    });
  }

  function getVideoTitle(video) {
    var data = video.recipe_data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data || '{}'); } catch (e) { data = {}; }
    }
    if (data && data.product_name) return data.product_name;
    var prompt = video.prompt || 'UGC Video';
    return prompt.length > 34 ? prompt.substring(0, 34) + '...' : prompt;
  }

  function captureAndUploadVideoThumbnail(videoId, videoUrl) {
    var video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = videoUrl;

    var done = false;
    function finish() {
      if (done) return;
      done = true;
      video.removeAttribute('src');
      video.load();
    }

    function frameLooksBlank(ctx, width, height) {
      var sampleWidth = Math.max(1, Math.floor(width / 8));
      var sampleHeight = Math.max(1, Math.floor(height / 8));
      var sample = ctx.getImageData(
        Math.floor((width - sampleWidth) / 2),
        Math.floor((height - sampleHeight) / 2),
        sampleWidth,
        sampleHeight
      ).data;
      var total = 0;
      for (var i = 0; i < sample.length; i += 4) {
        total += sample[i] + sample[i + 1] + sample[i + 2];
      }
      return total / (sample.length / 4) < 18;
    }

    function captureFrame() {
      try {
        var canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (frameLooksBlank(ctx, canvas.width, canvas.height) && video.duration && video.currentTime < video.duration - 0.3) {
          video.currentTime = Math.min(video.duration - 0.1, video.currentTime + 0.8);
          return;
        }

        var dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        state.thumbnails[videoId] = dataUrl;
        uploadVideoThumbnail(videoId, dataUrl);
        finish();
        renderHistoryStrip();
      } catch (err) {
        finish();
      }
    }

    video.addEventListener('loadedmetadata', function () {
      var targetTime = 0.8;
      if (video.duration && Number.isFinite(video.duration)) {
        targetTime = Math.min(Math.max(video.duration * 0.2, 0.5), Math.max(video.duration - 0.2, 0.1));
      }
      try {
        video.currentTime = targetTime;
      } catch (err) {
        captureFrame();
      }
    }, { once: true });

    video.addEventListener('seeked', captureFrame);
    video.addEventListener('loadeddata', function () {
      if (!video.duration) captureFrame();
    }, { once: true });

    video.addEventListener('error', finish, { once: true });
  }

  function uploadVideoThumbnail(videoId, dataUrl) {
    fetch('/api/videos/' + videoId + '/thumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thumbnail: dataUrl })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.thumbnail_url) {
          state.thumbnails[videoId] = data.thumbnail_url;
          loadHistoryStrip();
        }
      })
      .catch(function () { });
  }

  function loadAndApplyRecentVideo(videoId) {
    fetch('/api/videos/' + videoId)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var v = data.video;
        if (!v) return;

        var assetIds = [];
        try {
          assetIds = JSON.parse(v.asset_ids || '[]');
        } catch (e) { }

        fetch('/api/assets')
          .then(function (res) { return res.json(); })
          .then(function (assetData) {
            var assets = (assetData.assets || []).filter(function (asset) {
              return assetIds.indexOf(asset.id) >= 0;
            });
            applyVideoToForm(v, assets);
            showToast('Settings loaded from recent video', 'success');
            showVideoCard(v);
          })
          .catch(function () {
            applyVideoToForm(v, []);
            showVideoCard(v);
          });
      })
      .catch(function () { });
  }

  function highlightCard(card) {
    setActiveHistoryCard(card.dataset.videoId);
  }

  function loadAndShowVideo(videoId) {
    fetch('/api/videos/' + videoId)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var v = data.video;
        if (!v) return;
        showVideoCard(v);
      })
      .catch(function () { });
  }

  function showVideoCard(v) {
    setActiveHistoryCard(v.id);
    var existing = $('#video-' + v.id);
    if (existing) {
      existing.scrollIntoView({ behavior: 'smooth', block: 'start' });
      highlightCard(existing);
      return;
    }

    var container = $('#video-results');
    var emptyEl = $('#preview-empty');
    if (emptyEl) emptyEl.style.display = 'none';

    var card = document.createElement('div');
    card.className = 'video-result';
    card.id = 'video-' + v.id;
    card.dataset.videoId = v.id;

    var playerContent = v.status === 'completed' && v.video_url
      ? '<video src="' + v.video_url + '" controls></video>'
      : '<i class="ti ti-movie placeholder-icon"></i>';

    var statusDot = v.status === 'completed' ? 'completed' : v.status === 'failed' ? 'failed' : 'generating';
    var statusText = v.status === 'completed' ? 'Completed' : v.status === 'failed' ? (v.error_message || 'Failed') : 'Generating...';

    var date = new Date(v.created_at + 'Z').toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    card.innerHTML = '<div class="video-result-media"><div class="video-result-player">' + playerContent + '</div></div>' +
      '<div class="video-result-side">' +
      '<div class="status-indicator"><span class="status-dot ' + statusDot + '"></span><span>' + statusText + '</span></div>' +
      '<div class="video-result-details">' +
      renderPromptSummary(v.prompt) +
      '<div class="video-result-params">' +
      '<div class="param-item"><span class="param-label">Resolution</span><span class="param-value">' + v.resolution + '</span></div>' +
      '<div class="param-item"><span class="param-label">Ratio</span><span class="param-value">' + v.ratio + '</span></div>' +
      '<div class="param-item"><span class="param-label">Duration</span><span class="param-value">' + (v.duration || '10s') + '</span></div>' +
      '<div class="param-item"><span class="param-label">Model</span><span class="param-value">' + v.ai_model + '</span></div>' +
      '<div class="param-item"><span class="param-label">Created</span><span class="param-value">' + date + '</span></div>' +
      '</div></div>' +
      '<div class="video-result-actions">' +
      '<button class="btn btn-secondary btn-sm" onclick="window.location.href=\'/?video_id=' + v.id + '\'"><i class="ti ti-edit"></i> Edit</button>' +
      '</div></div>';

    container.innerHTML = '';
    container.appendChild(card);
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function loadPrefillData() {
    var settings = window.__settings || {};
    if (settings.default_resolution && $('#resolution-select')) $('#resolution-select').value = settings.default_resolution;
    if (settings.default_ratio && $('#ratio-select')) $('#ratio-select').value = settings.default_ratio;
    if (settings.default_duration) {
      var ds = $('#duration-slider');
      if (ds) {
        var num = parseInt(settings.default_duration.replace('s', ''), 10);
        if (!isNaN(num)) {
          ds.value = num;
          var durationSelect = $('#duration-select');
          if (durationSelect) durationSelect.value = String(num);
          var disp = $('#duration-display');
          if (disp) disp.textContent = num + 's';
        }
      }
    }
    if (settings.default_model) {
      var select = $('#ai-model-select');
      if (select) {
        select.value = settings.default_model;
        select.dispatchEvent(new Event('change'));
      }
    }

    var data = window.__prefillData;
    if (!data) return;

    var video = data.video;
    var assets = data.assets;

    applyVideoToForm(video, assets || [], { preservePrompt: true });

    if (video.video_url || video.status) {
      loadAndShowVideo(video.id);
    }
  }

  function applyVideoToForm(video, assets, options) {
    options = options || {};
    if (!video) return;

    applyRecipeData(video.recipe_data);

    if (video.prompt) {
      setPromptValue(video.prompt);
      state.hasPrefillPrompt = true;
    }
    if (video.resolution) $('#resolution-select').value = video.resolution;
    if (video.ratio) $('#ratio-select').value = video.ratio;
    if (video.duration) {
      var slider = $('#duration-slider');
      if (slider) {
        var num = parseInt(video.duration.replace('s', ''), 10);
        if (!isNaN(num)) {
          slider.value = num;
          var durationSelect2 = $('#duration-select');
          if (durationSelect2) durationSelect2.value = String(num);
          var display = $('#duration-display');
          if (display) display.textContent = num + 's';
        }
      }
    }
    if (video.ai_model) {
      var modelSelect = $('#ai-model-select');
      if (modelSelect) {
        modelSelect.value = video.ai_model;
        modelSelect.dispatchEvent(new Event('change'));
      }
    }

    if (assets && assets.length > 0) {
      setSelectedAssets(assets);
    }

    if (video.prompt) {
      setPromptValue(video.prompt);
    }
  }

  function applyRecipeData(recipeData) {
    if (!recipeData) return;

    var data = recipeData;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data || '{}');
      } catch (e) {
        data = {};
      }
    }

    var map = {
      product_name: 'product-name',
      product_category: 'product-category',
      target_audience: 'target-audience',
      product_benefit: 'product-benefit',
      script_text: 'script-input',
      creator_vibe: 'creator-vibe',
      camera_style: 'camera-style',
      motion_style: 'motion-style',
      lighting_style: 'lighting-style',
      language_style: 'language-style',
      music_style: 'music-style',
      audio_style: 'audio-style',
      cta_style: 'cta-style'
    };

    Object.keys(map).forEach(function (key) {
      var el = $('#' + map[key]);
      if (el && data[key] !== undefined && data[key] !== null) {
        el.value = data[key];
      }
    });

    if (data.ugc_format) {
      setChoiceValue('ugc-format', data.ugc_format);
      var ugcSelect = $('#ugc-format-select');
      if (ugcSelect) ugcSelect.value = data.ugc_format;
    }
    if (data.resolution && $('#resolution-select')) $('#resolution-select').value = data.resolution;
    if (data.ratio && $('#ratio-select')) $('#ratio-select').value = data.ratio;
    if (data.ai_model && $('#ai-model-select')) {
      var modelSelect = $('#ai-model-select');
      modelSelect.value = data.ai_model;
      modelSelect.dispatchEvent(new Event('change'));
    }
    if (data.duration) {
      var durationNumber = parseInt(String(data.duration).replace('s', ''), 10);
      if (!isNaN(durationNumber)) {
        var durationSlider = $('#duration-slider');
        var durationSelect = $('#duration-select');
        var durationDisplay = $('#duration-display');
        if (durationSlider) durationSlider.value = durationNumber;
        if (durationSelect) durationSelect.value = String(durationNumber);
        if (durationDisplay) durationDisplay.textContent = durationNumber + 's';
      }
    }
    var scriptInput = $('#script-input');
    var scriptCounter = $('#script-count');
    if (scriptInput && scriptCounter) scriptCounter.textContent = scriptInput.value.length;
  }

  function applyPayloadToForm(payload) {
    if (!payload) return;
    applyRecipeData(payload.recipe_data || {});

    if (payload.resolution && $('#resolution-select')) $('#resolution-select').value = payload.resolution;
    if (payload.ratio && $('#ratio-select')) $('#ratio-select').value = payload.ratio;
    if (payload.duration) {
      var durationNumber = parseInt(String(payload.duration).replace('s', ''), 10);
      if (!isNaN(durationNumber)) {
        var slider = $('#duration-slider');
        var durationSelect = $('#duration-select');
        var durationDisplay = $('#duration-display');
        if (slider) slider.value = durationNumber;
        if (durationSelect) durationSelect.value = String(durationNumber);
        if (durationDisplay) durationDisplay.textContent = durationNumber + 's';
      }
    }
    if (payload.ai_model && $('#ai-model-select')) {
      var modelSelect = $('#ai-model-select');
      modelSelect.value = payload.ai_model;
      modelSelect.dispatchEvent(new Event('change'));
    }

    var assetIds = payload.asset_ids || [];
    fetch('/api/assets')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var assets = (data.assets || []).filter(function (asset) {
          return assetIds.indexOf(asset.id) >= 0;
        });
        setSelectedAssets(assets);
        if (payload.prompt) {
          setPromptValue(payload.prompt);
          state.hasPrefillPrompt = true;
        }
      })
      .catch(function () {
        if (payload.prompt) setPromptValue(payload.prompt);
      });
  }

  function resetCreateForm() {
    state.selectedAssets = { product: [], model: [], background: [] };
    ['product', 'model', 'background'].forEach(function (type) {
      restoreUploadView(type);
      var grid = $('#grid-' + type);
      if (!grid) return;
      grid.querySelectorAll('.upload-item').forEach(function (item) { item.remove(); });
    });

    var script = $('#script-input');
    if (script) {
      script.value = 'Hai semuanya! Aku mau rekomendasiin produk ini yang bikin konten terasa lebih natural dan mudah dipahami.';
    }
    var scriptCounter = $('#script-count');
    if (script && scriptCounter) scriptCounter.textContent = script.value.length;

    var productName = $('#product-name');
    if (productName) productName.value = '';
    var targetAudience = $('#target-audience');
    if (targetAudience) targetAudience.value = '';
    var benefit = $('#product-benefit');
    if (benefit) benefit.value = 'produk terlihat jelas dan mudah dipahami';

    var ugcSelect = $('#ugc-format-select');
    if (ugcSelect) {
      ugcSelect.value = 'problem-solution';
      state.choices['ugc-format'] = ugcSelect.value;
      applyDirectorPreset(ugcSelect.value);
    }

    updatePromptPreview();
    updatePreviewMock();
  }

  function setSelectedAssets(assets) {
    ['product', 'model', 'background'].forEach(function (type) {
      setSelectedAssetsForType(type, []);
      var grid = $('#grid-' + type);
      if (grid) {
        grid.querySelectorAll('.upload-item:not(.library-item)').forEach(function (item) { item.remove(); });
        grid.querySelectorAll('.library-item').forEach(function (item) {
          item.classList.remove('selected');
        });
      }
    });

    var grouped = { product: [], model: [], background: [] };
    assets.forEach(function (asset) {
      if (!grouped[asset.type] || grouped[asset.type].length > 0) return;
      grouped[asset.type].push(asset);
    });

    ['product', 'model', 'background'].forEach(function (type) {
      if (grouped[type].length === 0) return;
      var asset = grouped[type][0];
      setSelectedAssetsForType(type, [asset]);

      var existingLibraryItem = document.querySelector('#grid-' + asset.type + ' .library-item[data-asset-id="' + asset.id + '"]');
      if (existingLibraryItem) {
        existingLibraryItem.classList.add('selected');
      } else {
        addAssetToGrid(asset.type, asset);
      }
    });
    updatePromptPreview();
    updatePreviewMock();
  }

  function showToast(message, type, duration) {
    var toast = $('#toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast ' + (type || 'info') + ' show';
    setTimeout(function () { toast.classList.remove('show'); }, duration || 3000);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
