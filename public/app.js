(function () {
  const TOOLS = [
    { id: 'chat', label: '🤖 AI Chat', placeholder: 'Ask me anything…', inputLabel: 'Ask anything', isChat: true },
    { id: 'writing', label: '✍️ AI Writing', placeholder: 'Write a short story about a fisherman who finds a message in a bottle…', inputLabel: 'What should I write?' },
    { id: 'image', label: '🎨 AI Image', placeholder: 'A lighthouse at sunset, watercolor style…', inputLabel: 'Describe the image', isImage: true, mode: 'image' },
    { id: 'coding', label: '💻 AI Coding', placeholder: 'A Python function that merges two sorted lists…', inputLabel: 'What should the code do?' },
    { id: 'seo', label: '📈 AI SEO', placeholder: 'A bakery in Lahore that sells custom birthday cakes…', inputLabel: 'What\u2019s the page/topic about?' },
    { id: 'social', label: '📱 AI Social Media', placeholder: 'Sunset photo from the beach with friends…', inputLabel: 'Describe your post' },
    { id: 'marketing', label: '🎯 AI Marketing', placeholder: 'A 20% off sale on handmade candles this weekend…', inputLabel: 'What are you promoting?' },
    { id: 'business', label: '🧑\u200d💼 AI Business', placeholder: 'A subscription box for local, organic produce…', inputLabel: 'Describe your business idea' },
    { id: 'logo', label: '🖼️ AI Logo/Design', placeholder: 'A coffee shop called Bean & Co, warm and rustic…', inputLabel: 'Describe your logo', isImage: true, mode: 'logo' }
  ];

  const pegboard = document.getElementById('pegboard');
  const rack = document.getElementById('rack');
  const scrim = document.getElementById('scrim');
  const hamburger = document.getElementById('hamburger');
  const toolTag = document.getElementById('toolTag');
  const toolTitle = document.getElementById('toolTitle');
  const toolSub = document.getElementById('toolSub');
  const toolInput = document.getElementById('toolInput');
  const toolForm = document.getElementById('toolForm');
  const runBtn = document.getElementById('runBtn');
  const statusEl = document.getElementById('status');
  const outputWrap = document.getElementById('outputWrap');
  const output = document.getElementById('output');
  const copyBtn = document.getElementById('copyBtn');
  const chatLog = document.getElementById('chatLog');

  let activeId = 'chat';
  let chatHistory = [];

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

  function selectTool(id) {
    activeId = id;
    const t = TOOLS.find((x) => x.id === id);
    const idx = TOOLS.findIndex((x) => x.id === id) + 1;
    toolTag.textContent = 'TOOL ' + String(idx).padStart(2, '0');
    toolTitle.textContent = t.label.replace(/^\S+\s/, '');
    toolSub.textContent = t.inputLabel;
    toolInput.placeholder = t.placeholder;
    toolInput.value = '';
    statusEl.textContent = '';
    statusEl.classList.remove('err');
    outputWrap.hidden = true;
    chatLog.hidden = !t.isChat;
    chatLog.innerHTML = '';
    chatHistory = [];
    renderPegboard();
    closeRack();
  }

  function openRack() { rack.classList.add('open'); scrim.classList.add('show'); }
  function closeRack() { rack.classList.remove('open'); scrim.classList.remove('show'); }
  hamburger.addEventListener('click', openRack);
  scrim.addEventListener('click', closeRack);

  function addChatMsg(role, text) {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + role;
    div.textContent = text;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  toolForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = TOOLS.find((x) => x.id === activeId);
    const value = toolInput.value.trim();
    if (!value) return;

    runBtn.disabled = true;
    statusEl.classList.remove('err');
    statusEl.textContent = 'Working…';

    if (t.isChat) {
      addChatMsg('user', value);
      chatHistory.push({ role: 'user', content: value });
      toolInput.value = '';
    }

    try {
      if (t.isImage) {
        const res = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: value, mode: t.mode || 'image' })
        });
        const j = await res.json();
        if (!res.ok || j.error) throw new Error(j.error || 'request failed');
        output.innerHTML = '';
        const img = document.createElement('img');
        img.src = j.image;
        output.appendChild(img);
        outputWrap.hidden = false;
      } else {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: t.id, input: value, history: chatHistory })
        });
        const j = await res.json();
        if (!res.ok || j.error) throw new Error(j.error || 'request failed');

        if (t.isChat) {
          addChatMsg('assistant', j.output);
          chatHistory.push({ role: 'assistant', content: j.output });
        } else {
          output.textContent = j.output;
          outputWrap.hidden = false;
        }
      }
      statusEl.textContent = '';
    } catch (err) {
      statusEl.textContent = 'Couldn\u2019t generate that — ' + (err.message || 'try again');
      statusEl.classList.add('err');
    } finally {
      runBtn.disabled = false;
    }
  });

  copyBtn.addEventListener('click', () => {
    const text = output.textContent;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = 'Copied';
      setTimeout(() => (copyBtn.textContent = 'Copy'), 1200);
    });
  });

  renderPegboard();
  selectTool('chat');
})();
