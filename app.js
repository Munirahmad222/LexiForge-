(function () {
  const TOOLS = [
    { id: 'chatbot', label: 'AI Chatbot', placeholder: 'Ask me anything…', inputLabel: 'Your message', btn: 'Send', isChat: true },
    { id: 'image', label: 'AI Image Generator', placeholder: 'A lighthouse at sunset, watercolor style…', inputLabel: 'Describe the image', btn: 'Generate image', isImage: true },
    { id: 'prompt', label: 'AI Prompt Generator', placeholder: 'A cozy reading nook…', inputLabel: 'Rough idea', btn: 'Generate prompt' },
    { id: 'story', label: 'AI Story Writer', placeholder: 'A fisherman who finds a message in a bottle…', inputLabel: 'Story idea / theme', btn: 'Write story' },
    { id: 'shayari', label: 'AI Shayari Generator', placeholder: 'mohabbat, judai, ummeed…', inputLabel: 'Mauzu (topic)', btn: 'Shayari likhein' },
    { id: 'caption', label: 'AI Caption Generator', placeholder: 'Sunset photo from the beach with friends…', inputLabel: 'Describe your post', btn: 'Generate captions' },
    { id: 'email', label: 'AI Email Writer', placeholder: 'Follow up with a client about a delayed invoice…', inputLabel: 'What\u2019s the email about?', btn: 'Write email' },
    { id: 'resume', label: 'AI Resume Writer', placeholder: '3 years as a graphic designer, led rebrand for a retail client…', inputLabel: 'Your role & experience', btn: 'Write resume' },
    { id: 'code', label: 'AI Code Generator', placeholder: 'A Python function that merges two sorted lists…', inputLabel: 'What should the code do?', btn: 'Generate code' }
  ];

  const pegboard = document.getElementById('pegboard');
  const rack = document.getElementById('rack');
  const scrim = document.getElementById('scrim');
  const hamburger = document.getElementById('hamburger');
  const toolTag = document.getElementById('toolTag');
  const toolTitle = document.getElementById('toolTitle');
  const inputLabel = document.getElementById('inputLabel');
  const toolInput = document.getElementById('toolInput');
  const toolForm = document.getElementById('toolForm');
  const runBtn = document.getElementById('runBtn');
  const statusEl = document.getElementById('status');
  const outputWrap = document.getElementById('outputWrap');
  const output = document.getElementById('output');
  const copyBtn = document.getElementById('copyBtn');
  const chatLog = document.getElementById('chatLog');

  let activeId = 'chatbot';
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
    toolTitle.textContent = t.label;
    inputLabel.textContent = t.inputLabel;
    toolInput.placeholder = t.placeholder;
    runBtn.textContent = t.btn;
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
          body: JSON.stringify({ prompt: value })
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
  selectTool('chatbot');
})();
