(function () {
  const TOOLS = [
    { id: 'chat', label: '🤖 AI Chat', placeholder: 'Ask me anything…', inputLabel: 'Ask anything', isChat: true,
      examples: ['Explain black holes simply', 'Plan a 3-day trip to Lahore', 'Debug my sleep schedule'] },
    { id: 'writing', label: '✍️ AI Writing', placeholder: 'Write a short story about a fisherman who finds a message in a bottle…', inputLabel: 'What should I write?',
      examples: ['A short story about a lost cat', 'A polite email asking for a deadline extension', 'A birthday poem for my sister'] },
    { id: 'image', label: '🎨 AI Image', placeholder: 'A lighthouse at sunset, watercolor style…', inputLabel: 'Describe the image', isImage: true, mode: 'image',
      examples: ['A cozy cabin in the snow', 'Cyberpunk street at night', 'Minimalist mountain line art'] },
    { id: 'coding', label: '💻 AI Coding', placeholder: 'A Python function that merges two sorted lists…', inputLabel: 'What should the code do?',
      examples: ['A responsive navbar in HTML/CSS', 'A JS function to debounce input', 'A Python script to rename files in bulk'] },
    { id: 'seo', label: '📈 AI SEO', placeholder: 'A bakery in Lahore that sells custom birthday cakes…', inputLabel: 'What\u2019s the page/topic about?',
      examples: ['A local plumbing service website', 'A blog post about home workouts', 'An online store for handmade jewelry'] },
    { id: 'social', label: '📱 AI Social Media', placeholder: 'Sunset photo from the beach with friends…', inputLabel: 'Describe your post',
      examples: ['New product launch announcement', 'Behind-the-scenes at our workshop', 'Weekend sale reminder'] },
    { id: 'marketing', label: '🎯 AI Marketing', placeholder: 'A 20% off sale on handmade candles this weekend…', inputLabel: 'What are you promoting?',
      examples: ['A limited-time discount code', 'A new subscription plan launch', 'A referral rewards program'] },
    { id: 'business', label: '🧑\u200d💼 AI Business', placeholder: 'A subscription box for local, organic produce…', inputLabel: 'Describe your business idea',
      examples: ['A one-page business plan for a food truck', 'A pitch summary for investors', 'A pricing strategy for a new app'] },
    { id: 'logo', label: '🖼️ AI Logo/Design', placeholder: 'A coffee shop called Bean & Co, warm and rustic…', inputLabel: 'Describe your logo', isImage: true, mode: 'logo',
      examples: ['A tech startup called Nova', 'A bakery called Sweet Crumb', 'A fitness brand called Iron Pulse'] }
  ];

  const HISTORY_DAYS = 30;
  const HISTORY_MS = HISTORY_DAYS * 24 * 60 * 60 * 1000;

  const pegboard = document.getElementById('pegboard');
  const rack = document.getElementById('rack');
  const scrim = document.getElementById('scrim');
  const hamburger = document.getElementById('hamburger');
  const toolTitle = document.getElementById('toolTitle');
  const toolSub = document.getElementById('toolSub');
  const toolInput = document.getElementById('toolInput');
  const toolForm = document.getElementById('toolForm');
  const runBtn = document.getElementById('runBtn');
  const statusEl = document.getElementById('status');
  const chatLog = document.getElementById('chatLog');
  const logScroll = document.getElementById('logScroll');
  const examplesEl = document.getElementById('examples');
  const attachBtn = document.getElementById('attachBtn');
  const fileInput = document.getElementById('fileInput');
  const attachRow = document.getElementById('attachRow');
  const attachThumb = document.getElementById('attachThumb');
  const attachRemove = document.getElementById('attachRemove');

  let activeId = 'chat';
  let history = []; // persisted messages for the active tool
  let attachedImage = null; // { dataUrl, base64 }

  /* ---------- persistence ---------- */
  function historyKey(id) { return 'lexiforge_hist_' + id; }

  function loadHistory(id) {
    try {
      const raw = localStorage.getItem(historyKey(id));
      if (!raw) return [];
      const arr = JSON.parse(raw);
      const cutoff = Date.now() - HISTORY_MS;
      const kept = arr.filter((m) => (m.ts || 0) >= cutoff);
      if (kept.length !== arr.length) saveHistory(id, kept);
      return kept;
    } catch (e) {
      return [];
    }
  }

  function saveHistory(id, arr) {
    try { localStorage.setItem(historyKey(id), JSON.stringify(arr)); } catch (e) { /* storage full/unavailable, ignore */ }
  }

  /* ---------- attachment ---------- */
  function clearAttachment() {
    attachedImage = null;
    fileInput.value = '';
    attachRow.hidden = true;
    attachThumb.src = '';
  }

  function resizeImage(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
            else { width = Math.round(width * (maxDim / height)); height = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  attachBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    statusEl.textContent = 'Preparing image…';
    try {
      const dataUrl = await resizeImage(file, 768, 0.7);
      attachedImage = { dataUrl, base64: dataUrl.split(',')[1] };
      attachThumb.src = dataUrl;
      attachRow.hidden = false;
      statusEl.textContent = '';
    } catch (e) {
      statusEl.textContent = 'Couldn\u2019t read that image — try another one';
      statusEl.classList.add('err');
    }
  });
  attachRemove.addEventListener('click', clearAttachment);

  /* ---------- live voice mode: listen, auto-send, speak reply, listen again ---------- */
  const micBtn = document.getElementById('micBtn');
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canSpeak = 'speechSynthesis' in window;
  let recognizer = null;
  let listening = false;
  let liveMode = false;
  let voiceLang = navigator.language || 'en-US';

  function setMicState(state) {
    micBtn.classList.remove('listening', 'thinking', 'speaking');
    if (state) micBtn.classList.add(state);
  }

  function speak(text) {
    return new Promise((resolve) => {
      if (!canSpeak || !text) { resolve(); return; }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = voiceLang;
      utter.onend = resolve;
      utter.onerror = resolve;
      setMicState('speaking');
      statusEl.textContent = '\ud83d\udd0a Speaking\u2026';
      window.speechSynthesis.speak(utter);
    });
  }

  function startListening() {
    if (!recognizer) return;
    try {
      recognizer.start();
      listening = true;
      setMicState('listening');
      statusEl.textContent = '\ud83c\udfa4 Listening\u2026 speak now';
    } catch (e) { /* already running */ }
  }

  function stopListening() {
    listening = false;
    if (recognizer) { try { recognizer.stop(); } catch (e) {} }
    setMicState(null);
  }

  function exitLiveMode() {
    liveMode = false;
    stopListening();
    if (canSpeak) window.speechSynthesis.cancel();
    setMicState(null);
    statusEl.textContent = '';
  }

  if (!SpeechRecognitionCtor) {
    micBtn.hidden = true;
  } else {
    recognizer = new SpeechRecognitionCtor();
    recognizer.continuous = false;
    recognizer.interimResults = true;
    recognizer.lang = voiceLang;

    recognizer.onresult = async (e) => {
      let finalText = '';
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interimText += t;
      }
      if (interimText) statusEl.textContent = '\ud83c\udfa4 ' + interimText;

      if (finalText.trim()) {
        listening = false;
        try { recognizer.stop(); } catch (er) {}
        setMicState('thinking');
        statusEl.textContent = '\ud83d\udcad Thinking\u2026';
        const reply = await runGeneration(finalText.trim(), null);
        if (liveMode) {
          if (reply) await speak(reply);
          if (liveMode) startListening();
        }
      }
    };

    recognizer.onerror = () => {
      listening = false;
      if (liveMode) {
        setMicState(null);
        statusEl.textContent = 'Didn\u2019t catch that \u2014 tap the mic to try again';
      }
    };

    recognizer.onend = () => {
      if (listening) { listening = false; }
    };

    micBtn.addEventListener('click', () => {
      if (liveMode) {
        exitLiveMode();
      } else {
        liveMode = true;
        voiceLang = navigator.language || 'en-US';
        recognizer.lang = voiceLang;
        startListening();
      }
    });
  }

  /* ---------- sidebar ---------- */
  function renderPegboard() {
    pegboard.innerHTML = TOOLS.map((t, i) => `
      <button class="peg${t.id === activeId ? ' active' : ''}" data-id="${t.id}">
        <span class="peg-num">${String(i + 1).padStart(2, '0')}</span>
        <span>${t.label}</span>
      </button>
    `).join('');
    pegboard.querySelectorAll('.peg').forEach((btn) => {
      btn.addEventListener('click', () => selectTool(btn.dataset.id));
    });
  }

  function openRack() { rack.classList.add('open'); scrim.classList.add('show'); }
  function closeRack() { rack.classList.remove('open'); scrim.classList.remove('show'); }
  hamburger.addEventListener('click', openRack);
  scrim.addEventListener('click', closeRack);

  /* ---------- composer ---------- */
  function autoGrow() {
    toolInput.style.height = 'auto';
    toolInput.style.height = Math.min(toolInput.scrollHeight, 180) + 'px';
  }
  toolInput.addEventListener('input', autoGrow);

  function renderExamples(t) {
    if (history.length) { examplesEl.innerHTML = ''; return; }
    examplesEl.innerHTML = (t.examples || []).map((ex) =>
      `<button type="button" class="example-pill">${ex}</button>`
    ).join('');
    examplesEl.querySelectorAll('.example-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        toolInput.value = btn.textContent;
        autoGrow();
        toolInput.focus();
      });
    });
  }

  /* ---------- message rendering ---------- */
  function scrollToBottom() {
    logScroll.scrollTop = logScroll.scrollHeight;
  }

  function buildMsgEl(msg) {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + (msg.role === 'user' ? 'user' : (msg.type === 'error' ? 'error' : 'assistant'));

    if (msg.type === 'image' && msg.image) {
      const img = document.createElement('img');
      img.src = msg.image;
      img.className = 'chat-img';
      div.appendChild(img);
    } else {
      const p = document.createElement('div');
      p.textContent = msg.text || '';
      div.appendChild(p);
    }

    if (msg.role === 'user' && msg.image) {
      const thumb = document.createElement('img');
      thumb.src = msg.image;
      thumb.className = 'chat-img';
      thumb.style.marginTop = '8px';
      div.appendChild(thumb);
    }

    if (msg.role === 'assistant' && msg.type !== 'image' && msg.type !== 'error' && msg.text) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-msg-btn';
      btn.textContent = 'Copy';
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(msg.text).then(() => {
          btn.textContent = 'Copied';
          setTimeout(() => (btn.textContent = 'Copy'), 1200);
        });
      });
      div.appendChild(btn);
    }
    return div;
  }

  function renderLog() {
    chatLog.innerHTML = '';
    history.forEach((msg) => chatLog.appendChild(buildMsgEl(msg)));
    scrollToBottom();
  }

  function appendMessage(msg, persist) {
    chatLog.appendChild(buildMsgEl(msg));
    scrollToBottom();
    if (persist) {
      history.push(msg);
      saveHistory(activeId, history);
    }
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'chat-msg assistant';
    div.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';
    chatLog.appendChild(div);
    scrollToBottom();
    return div;
  }

  /* ---------- tool switching ---------- */
  function selectTool(id) {
    exitLiveMode();
    activeId = id;
    const t = TOOLS.find((x) => x.id === id);
    toolTitle.textContent = t.label.replace(/^\S+\s/, '');
    toolSub.textContent = t.inputLabel;
    toolInput.placeholder = t.placeholder;
    toolInput.value = '';
    autoGrow();
    clearAttachment();
    attachBtn.hidden = !!t.isImage;
    micBtn.hidden = !!t.isImage || !SpeechRecognitionCtor;
    statusEl.textContent = '';
    statusEl.classList.remove('err');

    history = loadHistory(id);
    renderLog();
    renderExamples(t);
    renderPegboard();
    closeRack();
  }

  /* ---------- core generation (shared by typed submit + live voice) ---------- */
  async function runGeneration(currentInput, pendingImage) {
    runBtn.disabled = true;
    statusEl.classList.remove('err');

    const t = TOOLS.find((x) => x.id === activeId);

    const userMsg = { role: 'user', type: 'text', text: currentInput, image: pendingImage ? pendingImage.dataUrl : undefined, ts: Date.now() };
    appendMessage(userMsg, true);
    renderExamples(t);

    const typingEl = showTyping();
    let assistantText = null;

    try {
      let res;
      if (t.isImage) {
        res = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: currentInput, mode: t.mode || 'image' })
        });
      } else if (pendingImage) {
        res = await fetch('/api/vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: currentInput, imageBase64: pendingImage.base64 })
        });
      } else {
        res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: t.id, input: currentInput, history: history.slice(-20).map((m) => ({ role: m.role, content: m.text || '' })) })
        });
      }

      const j = await res.json();
      if (!res.ok || j.error) throw new Error(j.error || 'request failed');

      typingEl.remove();

      if (t.isImage) {
        appendMessage({ role: 'assistant', type: 'image', image: j.image, ts: Date.now() }, true);
      } else {
        appendMessage({ role: 'assistant', type: 'text', text: j.output, ts: Date.now() }, true);
        assistantText = j.output;
      }
    } catch (err) {
      typingEl.remove();
      appendMessage({ role: 'assistant', type: 'error', text: 'Couldn\u2019t generate that — ' + (err.message || 'try again'), ts: Date.now() }, false);
    } finally {
      runBtn.disabled = false;
    }
    return assistantText;
  }

  /* ---------- submit ---------- */
  toolForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    exitLiveMode();
    const value = toolInput.value.trim();
    if (!value) return;

    const currentInput = value;
    const pendingImage = attachedImage;
    toolInput.value = '';
    autoGrow();
    clearAttachment();

    await runGeneration(currentInput, pendingImage);
  });

  renderPegboard();
  selectTool('chat');
})();
