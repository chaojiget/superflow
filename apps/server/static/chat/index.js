import { setupWorkspaceDrawer } from './workspace.js';
import { setupToolsPanel } from './tools.js';
import { TaskManager } from './tasks.js';

const box = document.getElementById('chatBox');
const form = document.getElementById('chatForm');
const sessionInput = document.getElementById('chatSession');
const hintEl = document.getElementById('chatHint');
const spinEl = document.getElementById('chatSpin');
const actionBox = document.getElementById('actionBox');

const fmtTime = () => {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
};

const formatHtml = (text) => {
  if (text === undefined || text === null) return '';
  return String(text).replace(/\n/g, '<br>');
};

function appendMessage(role, text) {
  if (!box) return;
  const me = role === '你' || role === 'user';
  const wrap = document.createElement('div');
  wrap.className = 'msg' + (me ? ' user' : '');
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  const label = me ? '你' : role || '助手';
  bubble.innerHTML = `<b>${label}</b> · <span class="meta">${fmtTime()}</span><br>${formatHtml(text)}`;
  wrap.appendChild(bubble);
  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
}

async function loadHistory() {
  if (!sessionInput || !box) return;
  try {
    const resp = await fetch(`/api/chat/history?session=${encodeURIComponent(sessionInput.value)}`);
    const data = await resp.json();
    if (data.ok && Array.isArray(data.history)) {
      box.innerHTML = '';
      data.history.forEach((m) => {
        appendMessage(m.role === 'user' ? '你' : '助手', m.content);
      });
    }
  } catch (err) {
    console.warn('load history failed', err);
  }
}

function setHint(msg) {
  if (hintEl) hintEl.textContent = msg || '';
}

function setSpin(on) {
  if (spinEl) spinEl.style.display = on ? 'inline-block' : 'none';
}

function taskTitleFromArgs(args) {
  if (!args) return '最小闭环执行';
  return args.goal || (args.data_path ? `最小闭环 · ${args.data_path}` : '最小闭环执行');
}

async function startJob(taskManager, runArgs) {
  if (!runArgs) return;
  const fd = new FormData();
  fd.append('srs_path', runArgs.srs_path || runArgs.srsPath || 'examples/srs/weekly_report.json');
  fd.append('data_path', runArgs.data_path || runArgs.dataPath || 'examples/data/weekly.csv');
  fd.append('out_path', runArgs.out_path || runArgs.out || 'reports/weekly_report.md');
  fd.append('planner', runArgs.planner || 'llm');
  fd.append('executor', runArgs.executor || 'llm');
  fd.append('critic', runArgs.critic || 'llm');
  fd.append('reviser', runArgs.reviser || 'llm');
  if (runArgs.provider) fd.append('provider', runArgs.provider);
  if (runArgs.temp_planner) fd.append('temp_planner', runArgs.temp_planner);
  if (runArgs.temp_executor) fd.append('temp_executor', runArgs.temp_executor);
  if (runArgs.temp_critic) fd.append('temp_critic', runArgs.temp_critic);
  if (runArgs.temp_reviser) fd.append('temp_reviser', runArgs.temp_reviser);
  if (runArgs.retries !== undefined) fd.append('retries', runArgs.retries);
  if (runArgs.max_rows !== undefined) fd.append('max_rows', runArgs.max_rows);

  try {
    setHint('开始执行…');
    setSpin(true);
    const resp = await fetch('/api/run', { method: 'POST', body: fd });
    const data = await resp.json();
    if (data.ok) {
      setHint(`已提交，job=${data.job_id || ''}`);
      taskManager.observeJob(data.job_id, {
        title: taskTitleFromArgs(runArgs),
        goal: runArgs.goal,
        args: runArgs
      });
    } else {
      setHint(data.error || '提交失败');
    }
  } catch (err) {
    setHint(`提交失败: ${err.message}`);
  } finally {
    setTimeout(() => setSpin(false), 200);
  }
}

function renderRunAction(taskManager, resp) {
  if (!actionBox) return;
  actionBox.innerHTML = '';
  if (!resp || !resp.action || resp.action.type !== 'run') return;
  const args = resp.action.args || {};
  const card = document.createElement('div');
  card.className = 'card';
  const summary = [
    args.srs_path ? `SRS：${args.srs_path}` : '',
    args.data_path ? `数据：${args.data_path}` : '',
    (args.out_path || args.out) ? `输出：${args.out_path || args.out}` : ''
  ].filter(Boolean).join('<br>');
  card.innerHTML = `
    <div><b>执行建议</b> — 最小闭环</div>
    ${summary ? `<div class="hint" style="margin-top:6px">${summary}</div>` : ''}
    <div class="hint" style="margin-top:4px">Planner/Executor：${args.planner || 'llm'} / ${args.executor || 'llm'}</div>
    ${resp.srs_path ? `<div class="hint" style="margin-top:4px">SRS 已保存：${resp.srs_path}</div>` : ''}
    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px">
      <button data-action="run-now">立即运行</button>
      <button data-action="edit-run" class="btn ghost">编辑并运行</button>
    </div>
  `;
  actionBox.appendChild(card);
  const runBtn = card.querySelector('button[data-action="run-now"]');
  const editBtn = card.querySelector('button[data-action="edit-run"]');
  runBtn?.addEventListener('click', () => startJob(taskManager, args));
  editBtn?.addEventListener('click', () => {
    try {
      localStorage.setItem('runArgs', JSON.stringify(args));
    } catch (err) {
      console.warn('store runArgs fail', err);
    }
    location.href = '/?tab=run';
  });
}

function init() {
  if (sessionInput && !sessionInput.value) {
    sessionInput.value = 's-' + Math.random().toString(16).slice(2, 10);
  }

  const taskManager = new TaskManager({
    runningList: document.getElementById('taskListRunning'),
    approvalList: document.getElementById('taskListApproval'),
    doneList: document.getElementById('taskListDone'),
    runningEmpty: document.getElementById('taskEmptyRunning'),
    approvalEmpty: document.getElementById('taskEmptyApproval'),
    doneEmpty: document.getElementById('taskEmptyDone'),
    detail: {
      card: document.getElementById('taskDetailCard'),
      body: document.getElementById('taskDetailBody'),
      title: document.getElementById('taskDetailTitle'),
      subtitle: document.getElementById('taskDetailSubtitle'),
      closeBtn: document.getElementById('taskDetailClose')
    },
    budget: {
      banner: document.getElementById('budgetBanner'),
      message: document.getElementById('budgetMessage'),
      payload: document.getElementById('budgetPayload'),
      dismissBtn: document.getElementById('budgetDismiss')
    },
    onApproval: (task, payload) => openApprovalModal(task, payload),
    onBudget: (task, info) => {
      appendMessage('系统', `${info.message}${task ? `（任务 ${task.title || task.jobId || ''}）` : ''}`);
    },
    appendMessage
  });
  taskManager.init();

  document.getElementById('refreshTasks')?.addEventListener('click', () => taskManager.reloadCompleted());

  setupWorkspaceDrawer({
    drawer: document.getElementById('wsDrawer'),
    openButton: document.getElementById('btnWs'),
    closeButton: document.getElementById('btnCloseWs'),
    backdrop: document.querySelector('#wsDrawer .backdrop'),
    treeEl: document.getElementById('wsTree'),
    cwdEl: document.getElementById('wsCwd'),
    previewWrap: document.getElementById('wsPreviewWrap'),
    selectedPathEl: document.getElementById('wsSel'),
    contentEl: document.getElementById('wsContent'),
    hintEl: document.getElementById('wsHint'),
    tokenInput: document.getElementById('wsToken'),
    insertButton: document.getElementById('btnInsert'),
    saveButton: document.getElementById('btnSave'),
    onInsert: (path, content) => {
      if (form && form.text) {
        form.text.value = `请参考文件 ${path} 的内容：\n\n\u0060\u0060\u0060\n${content}\n\u0060\u0060\u0060\n`;
        form.text.focus();
      }
    },
    initialPath: 'examples'
  });

  setupToolsPanel({
    toggleButton: document.getElementById('btnTools'),
    panelEl: document.getElementById('toolsPanel'),
    hintEl,
    spinEl,
    appendMessage
  });

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const text = fd.get('text');
      if (!text) return;
      appendMessage('你', text);
      if (form.text) form.text.value = '';
      setHint('思考中…');
      setSpin(true);
      try {
        const resp = await fetch(form.action, { method: 'POST', body: fd });
        const data = await resp.json();
        if (data.ok) {
          appendMessage('助手', data.reply || '');
        } else {
          appendMessage('系统', data.error || '发送失败');
        }
        renderRunAction(taskManager, data);
      } catch (err) {
        appendMessage('系统', `发送失败: ${err.message}`);
      } finally {
        setHint('');
        setTimeout(() => setSpin(false), 200);
      }
    });
  }

  loadHistory();

  setupApprovalModal(taskManager, appendMessage);
}

let approvalHandler = null;

function setupApprovalModal(taskManager, appendMessageFn) {
  const modal = document.getElementById('approvalModal');
  if (!modal) return;
  const messageEl = document.getElementById('approvalMessage');
  const payloadEl = document.getElementById('approvalPayload');
  const closeBtn = document.getElementById('approvalClose');
  const backdrop = modal.querySelector('.modal-backdrop');
  const actionButtons = modal.querySelectorAll('.modal-actions button[data-action]');

  const close = () => {
    modal.classList.remove('open');
    modal.removeAttribute('data-task-id');
  };

  const open = (task, payload) => {
    modal.dataset.taskId = task.id;
    if (messageEl) {
      messageEl.textContent = (payload && (payload.message || payload.reason)) || '任务需要审批';
    }
    if (payloadEl) {
      if (payload) {
        payloadEl.style.display = 'block';
        payloadEl.textContent = JSON.stringify(payload, null, 2);
      } else {
        payloadEl.style.display = 'none';
        payloadEl.textContent = '';
      }
    }
    modal.classList.add('open');
  };

  const submitDecision = async (decision) => {
    const taskId = modal.dataset.taskId;
    if (!taskId) {
      close();
      return;
    }
    const task = taskManager.getTask(taskId);
    close();
    if (!task) return;
    try {
      const payload = { decision };
      if (task.jobId) payload.job_id = task.jobId;
      if (task.traceId) payload.trace_id = task.traceId;
      const resp = await fetch('/agent/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (!data.ok) {
        appendMessageFn('系统', `审批提交失败: ${data.error || ''}`);
      } else {
        appendMessageFn('系统', `审批已提交（${decision}）`);
        taskManager.resolveApproval(task.id, decision);
      }
    } catch (err) {
      appendMessageFn('系统', `审批提交失败: ${err.message}`);
    }
  };

  actionButtons.forEach((btn) => {
    btn.addEventListener('click', () => submitDecision(btn.getAttribute('data-action')));
  });
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);

  approvalHandler = open;
}

function openApprovalModal(task, payload) {
  if (approvalHandler) {
    approvalHandler(task, payload);
  }
}

init();
