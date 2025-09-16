const jsonFetch = async (url, options = {}) => {
  const resp = await fetch(url, options);
  if (!resp.ok) {
    throw new Error(`请求失败: ${resp.status}`);
  }
  return resp.json();
};

export function setupWorkspaceDrawer({
  drawer,
  openButton,
  closeButton,
  backdrop,
  treeEl,
  cwdEl,
  previewWrap,
  selectedPathEl,
  contentEl,
  hintEl,
  tokenInput,
  insertButton,
  saveButton,
  onInsert,
  initialPath = 'examples'
}) {
  if (!drawer) return { open: () => {}, close: () => {}, reload: () => {} };

  const ls = async (path) => jsonFetch(`/api/ws/ls?path=${encodeURIComponent(path || '.')}`);
  const read = async (path) => jsonFetch(`/api/ws/read?path=${encodeURIComponent(path)}`);
  const write = async (path, content) => {
    const fd = new FormData();
    fd.append('path', path);
    fd.append('content', content);
    const headers = {};
    if (tokenInput && tokenInput.value) {
      headers['X-Admin-Token'] = tokenInput.value;
    }
    const resp = await fetch('/api/ws/write', { method: 'POST', body: fd, headers });
    if (!resp.ok) {
      throw new Error(`保存失败: ${resp.status}`);
    }
    return resp.json();
  };

  const open = () => drawer.classList.add('open');
  const close = () => drawer.classList.remove('open');

  if (openButton) openButton.addEventListener('click', open);
  if (closeButton) closeButton.addEventListener('click', close);
  if (backdrop) backdrop.addEventListener('click', close);

  const renderTree = (cwd, dirs = [], files = []) => {
    if (!treeEl) return;
    if (cwdEl) cwdEl.textContent = cwd || '/';
    const ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.paddingLeft = '0';

    const makeLink = (label, handler) => {
      const link = document.createElement('a');
      link.href = '#';
      link.textContent = label;
      link.addEventListener('click', (ev) => {
        ev.preventDefault();
        handler();
      });
      return link;
    };

    const up = document.createElement('li');
    const upLink = makeLink('..', () => {
      const parent = cwd ? cwd.split('/').slice(0, -1).join('/') : '';
      loadDir(parent);
    });
    up.appendChild(upLink);
    ul.appendChild(up);

    dirs.forEach((d) => {
      const li = document.createElement('li');
      li.textContent = '📁 ';
      const link = makeLink(d, () => loadDir((cwd ? `${cwd}/` : '') + d));
      li.appendChild(link);
      ul.appendChild(li);
    });

    files.forEach((f) => {
      const li = document.createElement('li');
      const name = f.name || f;
      const size = f.size ? ` (${f.size})` : '';
      li.textContent = '📄 ';
      const link = makeLink(name, async () => {
        try {
          const rel = (cwd ? `${cwd}/` : '') + name;
          const data = await read(rel);
          if (data.ok) {
            if (previewWrap) previewWrap.style.display = 'block';
            if (selectedPathEl) selectedPathEl.textContent = rel;
            if (contentEl) contentEl.value = data.content || '';
            if (hintEl) hintEl.textContent = '';
          } else if (hintEl) {
            hintEl.textContent = data.error || '读取失败';
          }
        } catch (err) {
          if (hintEl) hintEl.textContent = err.message;
        }
      });
      li.appendChild(link);
      const meta = document.createElement('span');
      meta.style.color = '#999';
      meta.style.fontSize = '12px';
      meta.textContent = size;
      li.appendChild(meta);
      ul.appendChild(li);
    });

    treeEl.innerHTML = '';
    treeEl.appendChild(ul);
  };

  const loadDir = async (path) => {
    try {
      const data = await ls(path || '.');
      if (data.ok) {
        renderTree(data.cwd || path || '.', data.dirs || [], data.files || []);
        if (hintEl) hintEl.textContent = '';
      } else if (hintEl) {
        hintEl.textContent = data.error || '加载失败';
      }
    } catch (err) {
      if (hintEl) hintEl.textContent = err.message;
    }
  };

  if (insertButton && onInsert) {
    insertButton.addEventListener('click', () => {
      if (!selectedPathEl || !contentEl) return;
      const p = selectedPathEl.textContent;
      if (!p) return;
      onInsert(p, contentEl.value);
    });
  }

  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      if (!selectedPathEl || !contentEl) return;
      const path = selectedPathEl.textContent;
      if (!path) return;
      if (hintEl) hintEl.textContent = '保存中…';
      try {
        const data = await write(path, contentEl.value);
        if (hintEl) hintEl.textContent = data.ok ? '已保存' : (data.error || '保存失败');
        setTimeout(() => {
          if (hintEl) hintEl.textContent = '';
        }, 2000);
      } catch (err) {
        if (hintEl) hintEl.textContent = err.message;
      }
    });
  }

  loadDir(initialPath);

  return { open, close, reload: loadDir };
}
