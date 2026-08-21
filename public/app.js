  toolForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = TOOLS.find((x) => x.id === activeId);
    const value = toolInput.value.trim();
    if (!value) return;

    runBtn.disabled = true;
    statusEl.classList.remove('err');
    statusEl.textContent = 'Working…';

    let pendingImage = attachedImage;

    // Handle Chat UI
    if (t.isChat) {
      addChatMsg('user', value, pendingImage ? pendingImage.dataUrl : null);
      chatHistory.push({ role: 'user', content: value });
      clearAttachment();
    }

    // FIX: Clear input and reset height for EVERY tool immediately after submission
    toolInput.value = '';
    autoGrow();

    try {
      let res;
      if (t.isImage) {
        res = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: value, mode: t.mode || 'image' })
        });
      } else if (pendingImage) {
        res = await fetch('/api/vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: value, imageBase64: pendingImage.base64 })
        });
      } else {
        res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: t.id, input: value, history: chatHistory })
        });
      }

      const j = await res.json();
      if (!res.ok || j.error) throw new Error(j.error || 'request failed');

      if (t.isImage) {
        output.innerHTML = '';
        const img = document.createElement('img');
        img.src = j.image;
        img.style.width = '100%'; // Ensure it fits the container
        img.style.borderRadius = '8px';
        output.appendChild(img);
        outputWrap.hidden = false;
      } else if (t.isChat) {
        addChatMsg('assistant', j.output);
        chatHistory.push({ role: 'assistant', content: j.output });
      } else {
        // FIX: For Writing, SEO, etc., clear old output and show new one
        output.textContent = j.output;
        outputWrap.hidden = false;
        outputWrap.scrollIntoView({ behavior: 'smooth' });
      }
      statusEl.textContent = '';
    } catch (err) {
      statusEl.textContent = 'Couldn’t generate that — ' + (err.message || 'try again');
      statusEl.classList.add('err');
    } finally {
      runBtn.disabled = false;
    }
  });
