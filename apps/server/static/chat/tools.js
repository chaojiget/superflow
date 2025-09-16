export function setupToolsPanel({ toggleButton, panelEl, hintEl, spinEl, appendMessage }) {
  if (!panelEl) {
    return { load: async () => {} };
  }

  const setHint = (msg) => {
    if (hintEl) hintEl.textContent = msg || '';
  };

  const setSpin = (on) => {
    if (spinEl) spinEl.style.display = on ? 'inline-block' : 'none';
  };

  const renderTools = (serverId, tools, fallback) => {
    let html = `<div style="display:flex;gap:8px;align-items:center"><b>工具</b><label>server:</label><input id="toolServer" value="${serverId}" style="width:120px"></div>`;
    if (fallback) {
      html += `<div class="hint" style="margin-top:4px">使用本地回退清单：${fallback}</div>`;
    }
    if (!Array.isArray(tools) || tools.length === 0) {
      html += '<div class="hint" style="margin-top:8px">无可用工具</div>';
      panelEl.innerHTML = html;
      panelEl.style.display = 'block';
      return;
    }
    html += '<div style="margin-top:6px">';
    for (const t of tools) {
      const dn = t.name || '';
      const desc = t.description || '';
      html += '<div style="border-top:1px solid var(--border); padding:6px 0">'
        + `<div><b>${dn}</b></div>`
        + (desc ? `<div class="hint">${desc}</div>` : '')
        + '<div style="display:flex;gap:6px;align-items:center;margin-top:4px">'
        + '<span class="hint">args(JSON):</span>'
        + `<input id="arg_${dn}" style="flex:1" value="{}">`
        + `<button data-tool="${dn}">调用</button>`
        + '</div>'
        + '</div>';
    }
    html += '</div>';
    panelEl.innerHTML = html;
    panelEl.style.display = 'block';
    panelEl.querySelectorAll('button[data-tool]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const tool = btn.getAttribute('data-tool');
        const serverInput = panelEl.querySelector('#toolServer');
        const server = serverInput ? serverInput.value || 'api' : 'api';
        const argInput = panelEl.querySelector(`#arg_${tool}`);
        let argsJson = '{}';
        if (argInput) {
          try {
            argsJson = argInput.value || '{}';
          } catch (err) {
            console.warn('args parse error', err);
          }
        }
        const fd = new FormData();
        fd.append('server', server);
        fd.append('tool', tool);
        fd.append('args_json', argsJson);
        try {
          setHint(`执行 ${tool}…`);
          setSpin(true);
          const resp = await fetch('/api/mcp/call', { method: 'POST', body: fd });
          const data = await resp.json();
          if (data.ok) {
            const res = data.result || {};
            const txt = res.text || (res.structured ? JSON.stringify(res.structured, null, 2) : '');
            if (appendMessage) {
              appendMessage('助手', `[MCP ${server}.${tool}]\n${txt || '<no result>'}`);
            }
          } else if (appendMessage) {
            appendMessage('系统', `调用失败: ${data.error || ''}`);
          }
        } catch (err) {
          if (appendMessage) {
            appendMessage('系统', `调用失败: ${err.message}`);
          }
        } finally {
          setHint('');
          setSpin(false);
        }
      });
    });
  };

  const load = async (server = 'api') => {
    try {
      setHint('加载工具中…');
      const resp = await fetch(`/api/mcp/tools?server=${encodeURIComponent(server)}`);
      const data = await resp.json();
      if (!data.ok) {
        panelEl.style.display = 'block';
        panelEl.innerHTML = `<b>工具</b><div class="hint">加载失败: ${data.error || ''}</div>`;
        return;
      }
      renderTools(data.server || server, data.tools || [], data.fallback ? data.error : '');
      setHint('');
    } catch (err) {
      panelEl.style.display = 'block';
      panelEl.innerHTML = `<b>工具</b><div class="hint">加载失败: ${err.message}</div>`;
    }
  };

  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      const visible = panelEl.style.display !== 'none' && panelEl.style.display !== '';
      if (visible) {
        panelEl.style.display = 'none';
      } else {
        load('api');
      }
    });
  }

  return { load };
}
