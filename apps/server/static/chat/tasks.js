const STAGE_ORDER = ['perceive', 'plan', 'execute', 'review', 'revise', 'record', 'deliver'];
const STAGE_LABELS = {
  perceive: '感知',
  plan: '规划',
  execute: '执行',
  review: '评审',
  revise: '修补',
  record: '记账',
  deliver: '交付'
};
const DONE_STATUSES = new Set(['done', 'success', 'completed', 'artifact']);
const FAILED_STATUSES = new Set(['failed', 'error', 'stopped']);

const STATUS_TEXT = {
  running: '进行中',
  approval: '待审批',
  done: '已完成',
  failed: '失败'
};

const escapeHtml = (value) => {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const stageLabel = (id) => STAGE_LABELS[id] || id || '';

const formatTimestamp = (ts) => {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString('zh-CN', { hour12: false });
    }
  } catch (err) {
    // ignore
  }
  return ts;
};

export class TaskManager {
  constructor(options) {
    this.options = options || {};
    this.tasks = new Map();
    this.listEls = {
      running: options.runningList || null,
      approval: options.approvalList || null,
      done: options.doneList || null
    };
    this.emptyEls = {
      running: options.runningEmpty || null,
      approval: options.approvalEmpty || null,
      done: options.doneEmpty || null
    };
    this.detail = options.detail || {};
    this.budget = options.budget || {};
  }

  init() {
    if (this.detail && this.detail.closeBtn) {
      this.detail.closeBtn.addEventListener('click', () => this.hideDetail());
    }
    if (this.budget && this.budget.dismissBtn) {
      this.budget.dismissBtn.addEventListener('click', () => this.hideBudgetNotice());
    }
    this.reloadCompleted();
  }

  getTask(id) {
    return this.tasks.get(id);
  }

  async reloadCompleted(limit = 20) {
    try {
      const resp = await fetch(`/api/episodes?limit=${encodeURIComponent(limit)}`);
      const data = await resp.json();
      if (data.ok && Array.isArray(data.items)) {
        data.items.forEach((item) => this._upsertCompleted(item));
        this._updateEmptyState('done');
      }
    } catch (err) {
      console.warn('load episodes failed', err);
    }
  }

  observeJob(jobId, meta = {}) {
    if (!jobId) return null;
    const taskId = `job-${jobId}`;
    let task = this.tasks.get(taskId);
    if (!task) {
      task = {
        id: taskId,
        jobId,
        status: 'running',
        title: meta.title || meta.goal || '最小闭环执行',
        goal: meta.goal,
        createdAt: new Date().toISOString(),
        progress: { stage: null, status: 'pending', message: '', percent: 0 },
        stages: new Map(),
        logs: [],
        events: [],
        meta
      };
      this.tasks.set(taskId, task);
      this._ensureElement(task);
      this._setTaskGroup(task, 'running');
      this._updateTaskElement(task);
      this._connect(task);
    } else if (!task.ws) {
      this._connect(task);
    }
    return task;
  }

  showDetail(taskId) {
    const task = this.tasks.get(taskId);
    if (!task || !this.detail || !this.detail.card || !this.detail.body) {
      return;
    }
    this.detail.currentId = task.id;
    this.detail.card.style.display = 'block';
    if (this.detail.title) {
      this.detail.title.textContent = task.title || (task.traceId ? `Episode ${task.traceId}` : '执行详情');
    }
    if (this.detail.subtitle) {
      const info = [task.traceId ? `trace ${task.traceId}` : '', task.jobId ? `job ${task.jobId}` : '']
        .filter(Boolean)
        .join(' • ');
      this.detail.subtitle.textContent = info;
    }
    if (task.traceId && task.status === 'done') {
      if (task.episodeDetail && task.episodeDetailLoaded) {
        this._renderEpisodeDetail(task);
      } else {
        this._fetchEpisodeDetail(task);
      }
    } else {
      this._renderLiveDetail(task);
    }
  }

  hideDetail() {
    if (this.detail && this.detail.card) {
      this.detail.card.style.display = 'none';
      this.detail.currentId = null;
    }
  }

  resolveApproval(taskId, decision) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.approvalDecision = decision;
    if (decision === 'reject') {
      this._markError(task, '已终止');
    } else {
      task.status = 'running';
      this._setTaskGroup(task, 'running');
      this._updateTaskElement(task);
    }
  }

  hideBudgetNotice() {
    if (this.budget && this.budget.banner) {
      this.budget.banner.style.display = 'none';
      if (this.budget.message) this.budget.message.textContent = '';
      if (this.budget.payload) this.budget.payload.textContent = '';
      this.budget.currentTaskId = null;
    }
  }

  showBudgetNotice(task, info) {
    if (!this.budget || !this.budget.banner) return;
    const { banner, message, payload } = this.budget;
    banner.style.display = 'block';
    if (message) {
      message.textContent = info.message || '预算提示';
    }
    if (payload) {
      if (info.payload) {
        payload.style.display = 'block';
        payload.textContent = typeof info.payload === 'string'
          ? info.payload
          : JSON.stringify(info.payload, null, 2);
      } else {
        payload.style.display = 'none';
        payload.textContent = '';
      }
    }
    this.budget.currentTaskId = task ? task.id : null;
  }

  // ---- private helpers ----
  _upsertCompleted(item) {
    if (!item || !item.trace_id) return;
    const id = `ep-${item.trace_id}`;
    let task = this.tasks.get(id);
    if (!task) {
      task = {
        id,
        traceId: item.trace_id,
        status: 'done',
        title: item.goal || `Episode ${item.trace_id}`,
        goal: item.goal,
        createdAt: item.created_ts,
        completedAt: item.created_ts,
        statusText: item.status,
        provider: item.provider,
        model: item.model,
        attempts: item.attempts,
        cost: item.cost,
        latency: item.latency_ms,
        progress: { stage: 'deliver', status: 'done', percent: 100 },
        stages: new Map(),
        logs: [],
        events: []
      };
      this.tasks.set(id, task);
      this._ensureElement(task);
      this._setTaskGroup(task, 'done');
    } else {
      task.traceId = item.trace_id;
      task.status = 'done';
      task.title = item.goal || task.title;
      task.goal = item.goal || task.goal;
      task.statusText = item.status || task.statusText;
      task.provider = item.provider;
      task.model = item.model;
      task.attempts = item.attempts;
      task.cost = item.cost;
      task.latency = item.latency_ms;
      task.completedAt = item.created_ts || task.completedAt;
      this._ensureElement(task);
      this._setTaskGroup(task, 'done');
    }
    this._updateTaskElement(task);
  }

  _ensureElement(task) {
    if (task.element) {
      task.element.dataset.taskId = task.id;
      return task.element;
    }
    const el = document.createElement('div');
    el.className = 'task-item';
    el.dataset.taskId = task.id;
    el.innerHTML = `
      <div class="task-item-header">
        <div class="task-title"></div>
        <span class="task-badge neutral"></span>
      </div>
      <div class="task-meta"></div>
      <div class="task-progress"><div class="task-progress-bar"></div></div>
      <div class="task-extra"></div>
    `;
    el.addEventListener('click', () => this.showDetail(task.id));
    task.element = el;
    return el;
  }

  _setTaskGroup(task, group) {
    if (!task.element) this._ensureElement(task);
    if (task.group === group) {
      this._updateEmptyState(group);
      return;
    }
    if (task.element && task.element.parentElement) {
      const oldParent = task.element.parentElement;
      oldParent.removeChild(task.element);
      const oldGroup = task.group;
      if (oldGroup) this._updateEmptyState(oldGroup);
    }
    const list = this.listEls[group];
    if (list) {
      list.appendChild(task.element);
    }
    task.group = group;
    this._updateEmptyState(group);
  }

  _updateEmptyState(group) {
    const list = this.listEls[group];
    const empty = this.emptyEls[group];
    if (!empty) return;
    const hasChild = !!(list && list.children && list.children.length);
    empty.style.display = hasChild ? 'none' : 'block';
  }

  _calcProgressPercent(task) {
    if (!task || !task.progress) {
      return task && task.status === 'done' ? 100 : 0;
    }
    const stage = task.progress.stage;
    const status = (task.progress.status || '').toLowerCase();
    if (!stage) {
      return task.status === 'done' ? 100 : 0;
    }
    const idx = STAGE_ORDER.indexOf(stage);
    if (idx === -1) {
      return task.status === 'done' ? 100 : 0;
    }
    const total = STAGE_ORDER.length;
    let percent;
    if (DONE_STATUSES.has(status) || task.status === 'done') {
      percent = ((idx + 1) / total) * 100;
    } else if (FAILED_STATUSES.has(status) || task.status === 'failed') {
      percent = ((idx + 0.5) / total) * 100;
    } else {
      percent = ((idx + 0.5) / total) * 100;
    }
    if (task.status === 'done') percent = 100;
    if (task.status === 'failed') percent = Math.min(100, Math.max(5, percent));
    return Math.round(percent);
  }

  _updateTaskElement(task) {
    if (!task) return;
    const el = this._ensureElement(task);
    const titleEl = el.querySelector('.task-title');
    const badgeEl = el.querySelector('.task-badge');
    const metaEl = el.querySelector('.task-meta');
    const extraEl = el.querySelector('.task-extra');
    const progressWrap = el.querySelector('.task-progress');
    const barEl = el.querySelector('.task-progress-bar');

    if (titleEl) {
      titleEl.textContent = task.title || task.goal || (task.traceId ? `Episode ${task.traceId}` : '最小闭环执行');
    }

    if (badgeEl) {
      badgeEl.classList.remove('danger', 'success', 'neutral');
      let badgeClass = 'neutral';
      if (task.status === 'done') badgeClass = 'success';
      if (task.status === 'failed' || task.status === 'approval') badgeClass = 'danger';
      badgeEl.classList.add(badgeClass);
      badgeEl.textContent = STATUS_TEXT[task.status] || STATUS_TEXT.running;
    }

    if (metaEl) {
      const parts = [];
      if (task.jobId) parts.push(`job ${task.jobId}`);
      if (task.traceId && task.status !== 'running') parts.push(task.traceId);
      if (task.status === 'running' && task.progress && task.progress.stage) {
        const statusText = task.progress.status ? `(${task.progress.status})` : '';
        parts.push(`当前阶段：${stageLabel(task.progress.stage)} ${statusText}`.trim());
      } else if (task.status === 'approval') {
        parts.push(task.approvalMessage || '等待审批');
      } else if (task.status === 'done') {
        if (task.statusText) parts.push(`状态：${task.statusText}`);
        if (task.cost !== undefined && task.cost !== null) parts.push(`成本 ${task.cost}`);
        if (task.latency !== undefined && task.latency !== null) parts.push(`耗时 ${task.latency}ms`);
      } else if (task.status === 'failed' && task.error) {
        parts.push(task.error);
      }
      metaEl.textContent = parts.filter(Boolean).join(' • ');
    }

    if (extraEl) {
      if (task.status === 'failed' && task.error) {
        extraEl.textContent = `错误：${task.error}`;
      } else if (task.progress && task.progress.message) {
        extraEl.textContent = task.progress.message;
      } else if (task.approvalMessage && task.status === 'approval') {
        extraEl.textContent = task.approvalMessage;
      } else {
        extraEl.textContent = '';
      }
    }

    if (progressWrap && barEl) {
      const percent = this._calcProgressPercent(task);
      barEl.style.width = `${percent}%`;
      barEl.classList.toggle('error', task.status === 'failed');
      progressWrap.style.display = task.status === 'done' && percent >= 100 ? 'none' : 'block';
    }
  }

  _connect(task) {
    if (!task || !task.jobId) return;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/agent/events?job_id=${encodeURIComponent(task.jobId)}`);
    task.ws = ws;
    ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        this._handleWsMessage(task, msg);
      } catch (err) {
        console.warn('ws message parse fail', err);
      }
    });
    ws.addEventListener('close', () => {
      task.ws = null;
    });
    ws.addEventListener('error', () => {
      this._markError(task, '事件通道异常');
    });
  }

  _handleWsMessage(task, msg) {
    if (!msg) return;
    switch (msg.type) {
      case 'progress':
        this._handleProgress(task, msg.data || {});
        break;
      case 'log':
        this._handleLog(task, msg);
        break;
      case 'event':
        this._handleEvent(task, msg.event || msg);
        break;
      case 'final':
        this._handleFinal(task, msg);
        break;
      case 'error':
        this._markError(task, msg.message || '执行失败');
        break;
      case 'status':
        task.statusText = msg.state || task.statusText;
        if (msg.state === 'completed' && task.status !== 'done') {
          // 等待 final 事件
        }
        this._updateTaskElement(task);
        break;
      default:
        this._handleLog(task, { ts: msg.ts, line: JSON.stringify(msg) });
    }
  }

  _handleProgress(task, data) {
    if (!task) return;
    const stage = (data.stage || 'progress').toLowerCase();
    const status = (data.status || '').toLowerCase();
    const ts = data.ts || new Date().toISOString();
    const message = data.message || '';
    task.progress = {
      stage,
      status,
      message,
      ts,
      percent: this._calcProgressPercent({ ...task, progress: { stage, status } })
    };
    if (!task.stages) task.stages = new Map();
    task.stages.set(stage, { status, message, ts, extra: data.extra });
    this._pushLog(task, { type: 'progress', stage, status, message, ts, extra: data.extra });
    this._updateTaskElement(task);
    if (this.detail.currentId === task.id && (!task.traceId || task.status !== 'done')) {
      this._renderLiveDetail(task);
    }
  }

  _handleLog(task, msg) {
    if (!task) return;
    this._pushLog(task, { type: 'log', ts: msg.ts, line: msg.line });
    if (this.detail.currentId === task.id && (!task.traceId || task.status !== 'done')) {
      this._renderLiveDetail(task);
    }
  }

  _handleEvent(task, event) {
    if (!task) return;
    const payload = event && event.payload ? event : { payload: event };
    const type = ((event && event.type) || (payload.payload && payload.payload.type) || '').toLowerCase();
    if (!task.events) task.events = [];
    task.events.push({ ...payload, type: event && event.type ? event.type : type });
    if (type.includes('approval')) {
      this._enterApproval(task, payload.payload || payload);
    }
    if (type.includes('budget')) {
      const message = payload.payload && (payload.payload.message || payload.payload.reason) || '预算提示';
      this.showBudgetNotice(task, { message, payload: payload.payload || payload });
      if (this.options.onBudget) {
        this.options.onBudget(task, { message, payload: payload.payload || payload });
      }
    }
    if (this.detail.currentId === task.id && task.status !== 'done') {
      this._renderLiveDetail(task);
    }
  }

  _enterApproval(task, payload) {
    task.status = 'approval';
    task.approvalPayload = payload;
    task.approvalMessage = (payload && (payload.message || payload.reason)) || '等待审批';
    this._setTaskGroup(task, 'approval');
    this._updateTaskElement(task);
    if (this.options.onApproval) {
      this.options.onApproval(task, payload);
    }
  }

  _handleFinal(task, msg) {
    if (!task) return;
    const oldId = task.id;
    task.status = 'done';
    const traceId = msg.trace_id || (msg.result && msg.result.trace_id) || task.traceId;
    if (traceId) {
      const newId = `ep-${traceId}`;
      if (task.id !== newId) {
        this.tasks.delete(task.id);
        task.id = newId;
        this.tasks.set(newId, task);
        if (task.element) {
          task.element.dataset.taskId = newId;
        }
        if (this.detail && this.detail.currentId === oldId) {
          this.detail.currentId = newId;
        }
        if (this.budget && this.budget.currentTaskId === oldId) {
          this.budget.currentTaskId = newId;
        }
      }
      task.traceId = traceId;
    }
    task.result = msg.result || task.result;
    task.episode = msg.episode || task.episode;
    task.statusText = (msg.episode && msg.episode.status) || task.statusText || 'completed';
    if (msg.episode && msg.episode.goal) {
      task.title = msg.episode.goal;
      task.goal = msg.episode.goal;
    }
    task.completedAt = new Date().toISOString();
    this.hideBudgetNotice();
    this._setTaskGroup(task, 'done');
    this._updateTaskElement(task);
    if (this.detail && this.detail.currentId === task.id) {
      this._fetchEpisodeDetail(task);
    }
  }

  _markError(task, message) {
    task.status = 'failed';
    task.error = message;
    this._setTaskGroup(task, 'done');
    this._updateTaskElement(task);
    if (this.options.appendMessage) {
      this.options.appendMessage('系统', message);
    }
  }

  _pushLog(task, entry) {
    if (!task.logs) task.logs = [];
    task.logs.push(entry);
    if (task.logs.length > 80) {
      task.logs.splice(0, task.logs.length - 80);
    }
  }

  async _fetchEpisodeDetail(task) {
    if (!task.traceId) {
      this._renderLiveDetail(task);
      return;
    }
    try {
      const resp = await fetch(`/api/episodes/${encodeURIComponent(task.traceId)}`);
      const data = await resp.json();
      if (data.ok) {
        task.episodeDetail = data.episode;
        task.episodeDetailLoaded = true;
        if (this.detail.currentId === task.id) {
          this._renderEpisodeDetail(task);
        }
      } else {
        this._renderDetailError(task, data.error || '加载 Episode 失败');
      }
    } catch (err) {
      this._renderDetailError(task, err.message);
    }
  }

  _renderDetailError(task, msg) {
    if (!this.detail || this.detail.currentId !== task.id || !this.detail.body) return;
    this.detail.body.innerHTML = `<div class="task-detail-section"><div class="task-detail-item">${escapeHtml(msg)}</div></div>`;
  }

  _renderLiveDetail(task) {
    if (!this.detail || this.detail.currentId !== task.id || !this.detail.body) return;
    const stages = [];
    if (task.stages) {
      for (const [id, info] of task.stages.entries()) {
        const line = `<div class="task-detail-item"><strong>${stageLabel(id)}</strong> — ${escapeHtml(info.status || '')}
          ${info.ts ? `<span class="hint">${escapeHtml(formatTimestamp(info.ts))}</span>` : ''}
          ${info.message ? `<div class="task-detail-item">${escapeHtml(info.message)}</div>` : ''}
          ${info.extra ? `<pre>${escapeHtml(JSON.stringify(info.extra, null, 2))}</pre>` : ''}
        </div>`;
        stages.push(line);
      }
    }
    const logs = (task.logs || []).slice(-20).map((log) => {
      const body = log.line ? `<pre>${escapeHtml(log.line)}</pre>` : '';
      const desc = log.stage ? `${stageLabel(log.stage)} ${escapeHtml(log.status || '')}` : '';
      return `<div class="task-detail-log">
        <div class="hint">${escapeHtml(formatTimestamp(log.ts || ''))}</div>
        ${desc ? `<div class="task-detail-item">${desc}</div>` : ''}
        ${body}
      </div>`;
    });
    const progress = task.progress ? `<div class="task-detail-item"><strong>${stageLabel(task.progress.stage)}</strong> — ${escapeHtml(task.progress.status || '')}</div>` : '<div class="hint">尚未开始</div>';
    this.detail.body.innerHTML = `
      <div class="task-detail-section">
        <h4>当前阶段</h4>
        ${progress}
        ${task.progress && task.progress.message ? `<div class="task-detail-item">${escapeHtml(task.progress.message)}</div>` : ''}
      </div>
      <div class="task-detail-section">
        <h4>阶段进度</h4>
        ${stages.length ? stages.join('') : '<div class="hint">暂无阶段信息</div>'}
      </div>
      <div class="task-detail-section">
        <h4>执行日志</h4>
        ${logs.length ? logs.join('') : '<div class="hint">暂无日志</div>'}
      </div>
    `;
  }

  _renderEpisodeDetail(task) {
    if (!this.detail || this.detail.currentId !== task.id || !this.detail.body) return;
    const ep = task.episodeDetail || task.episode || {};
    if (this.detail.title) {
      this.detail.title.textContent = ep.goal || task.title || `Episode ${task.traceId}`;
    }
    if (this.detail.subtitle) {
      const summary = [task.traceId ? `trace ${task.traceId}` : '', ep.status ? `状态 ${ep.status}` : '']
        .filter(Boolean)
        .join(' • ');
      this.detail.subtitle.textContent = summary;
    }
    const header = ep.header || {};
    const summaryParts = [
      header.provider ? `provider: ${escapeHtml(header.provider)}` : '',
      header.model ? `model: ${escapeHtml(header.model)}` : '',
      header.cost !== undefined ? `cost: ${escapeHtml(header.cost)}` : '',
      ep.latency_ms !== undefined ? `latency: ${escapeHtml(ep.latency_ms)}ms` : ''
    ].filter(Boolean);
    const events = Array.isArray(ep.events) ? ep.events : [];
    const eventHtml = events.slice(-20).map((ev) => {
      const payload = ev.payload ? JSON.stringify(ev.payload, null, 2) : '';
      return `<div class="task-detail-log">
        <div class="hint">${escapeHtml(formatTimestamp(ev.ts || ''))}</div>
        <div class="task-detail-item"><strong>${escapeHtml(ev.type || '')}</strong></div>
        ${payload ? `<pre>${escapeHtml(payload)}</pre>` : ''}
      </div>`;
    });
    this.detail.body.innerHTML = `
      <div class="task-detail-section">
        <h4>概要</h4>
        <div class="task-detail-item">trace：${escapeHtml(task.traceId || '')}</div>
        ${summaryParts.length ? `<div class="task-detail-item">${summaryParts.join(' • ')}</div>` : ''}
        ${ep.artifacts && ep.artifacts.output_path ? `<div class="task-detail-item">产物：${escapeHtml(ep.artifacts.output_path)}</div>` : ''}
      </div>
      <div class="task-detail-section">
        <h4>事件</h4>
        ${eventHtml.length ? eventHtml.join('') : '<div class="hint">暂无事件</div>'}
      </div>
    `;
  }
}
