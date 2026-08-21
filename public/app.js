toolForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const t = TOOLS.find((x) => x.id === activeId);
    const value = toolInput.value.trim();
    if (!value) return;

    // --- FORCE UI RESET START ---
    runBtn.disabled = true;
    statusEl.classList.remove('err');
    statusEl.textContent = 'Working…';

    // We store the value to use it for the fetch, then IMMEDIATELY clear the box
    const currentInput = value; 
    toolInput.value = ''; 
    autoGrow(); // This resets the height of the textarea
    // --- FORCE UI RESET END ---

    let pendingImage = attachedImage;

    if (t.isChat) {
      addChatMsg('user', currentInput, pendingImage ? pendingImage.dataUrl : null);
      chatHistory.push({ role: 'user', content: currentInput });
      clearAttachment();
    }

    try {
      let res;
      // Note: We use 'currentInput' here instead of 'toolInput.value'
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
          body: JSON.stringify({ tool: t.id, input: currentInput, history: chatHistory })
        });
      }

      const j = await res.json();
      if (!res.ok || j.error) throw new Error(j.error || 'request failed');

      if (t.isImage) {
        output.innerHTML = '';
        const img = document.createElement('img');
        img.src = j.image;
        img.style.maxWidth = '100%';
        output.appendChild(img);
        outputWrap.hidden = false;
      } else if (t.isChat) {
        addChatMsg('assistant', j.output);
        chatHistory.push({ role: 'assistant', content: j.output });
      } else {
        output.textContent = j.output;
        outputWrap.hidden = false;
      }
      statusEl.textContent = '';
    } catch (err) {
      statusEl.textContent = 'Error: ' + (err.message || 'try again');
      statusEl.classList.add('err');
      // If there was an error, we might want to put the text back so the user doesn't lose it
      toolInput.value = currentInput;
      autoGrow();
    } finally {
      runBtn.disabled = false;
    }
});
