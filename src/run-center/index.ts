export interface RunRecord {
  id: string;
  input: string;
  output: string;
  status: 'success' | 'error';
  duration: number; // ms
  createdAt: number;
  version: number;
}

const STORAGE_KEY = 'superflow:runs';

function loadRuns(): RunRecord[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RunRecord[]) : [];
  } catch {
    return [];
  }
}

const runQueue: RunRecord[] = loadRuns();

function saveRuns(): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(runQueue));
  } catch {
    // ignore
  }
}

export function logRun(record: Partial<RunRecord>): void {
  const safeRecord: RunRecord = {
    id: record.id ?? Date.now().toString(),
    input: record.input ?? '',
    output: record.output ?? '',
    status: record.status ?? 'success',
    duration: record.duration ?? 0,
    createdAt: record.createdAt ?? Date.now(),
    version: record.version ?? 1,
  };

  runQueue.push(safeRecord);
  saveRuns();
}

export function getRunRecords(): RunRecord[] {
  return [...runQueue];
}

export function clearRunRecords(): void {
  runQueue.length = 0;
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function RunRecordList(root: HTMLElement): void {
  const filterSelect = document.createElement('select');
  filterSelect.innerHTML = `
    <option value="all">全部</option>
    <option value="success">成功</option>
    <option value="error">失败</option>
  `;

  const clearButton = document.createElement('button');
  clearButton.textContent = '清空';

  const list = document.createElement('ul');

  root.append(filterSelect, clearButton, list);

  function render(records: RunRecord[]): void {
    list.innerHTML = '';
    records.forEach((r) => {
      const li = document.createElement('li');
      li.textContent = `${r.status} | ${r.duration}ms | ${r.input} -> ${r.output}`;
      list.append(li);
    });
  }

  function update(): void {
    const filter = filterSelect.value;
    const records = getRunRecords().filter((r) =>
      filter === 'all' ? true : r.status === filter
    );
    render(records);
  }

  filterSelect.addEventListener('change', update);
  clearButton.addEventListener('click', () => {
    clearRunRecords();
    update();
  });

  update();
}
