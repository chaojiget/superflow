/* eslint-disable */
// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  Edge,
  Node,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Editor } from '@monaco-editor/react';
import DiffViewer from 'react-diff-viewer-continued';
// react-resizable-panels v2 导入
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge, STATUS_THEME } from '@/studio/components/StatusBadge';
import type { Status } from '@/studio/components/StatusBadge';
import {
  Check,
  X,
  Play,
  Pause,
  RotateCcw,
  FlaskConical,
  Bug,
  Braces,
  UploadCloud,
  Share2,
  Link2,
  Boxes,
  Timer,
  Cpu,
  Zap,
  Save,
  Wand2,
  Undo2,
  FileDiff,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

// ---- 模拟数据结构 ----

interface NodeMeta {
  status: Status;
  inputs: string[]; // 形如 "param: type"
  outputs: string[]; // 形如 "name: type" 或 "name"（演示）
  retry: number;
  timeoutSec: number;
  cacheKey: string;
  cpu: number;
  memoryGB: number;
  env: string[];
}

interface NodeCode {
  lang: 'python' | 'typescript';
  content: string;
  version: number;
  history: string[]; // older versions
}

interface Artifact {
  name: string;
  size: string;
  href?: string;
}

interface RunEvent {
  ts: number;
  level: 'info' | 'warn' | 'error';
  message: string;
}

interface TestResult {
  name: string;
  pass: boolean;
  detail?: string;
}

// 迁移向导状态（两级：节点级 -> 字段级）
interface MigrationGuideState {
  open: boolean;
  step: 'nodes' | 'fields';
  oldOutputs: string[];
  newOutputs: string[];
  impacted: string[]; // 受影响下游节点
  selected: Record<string, boolean>; // 节点级：被勾选的下游节点
  selectedOrder: string[]; // 进入字段级后固定的遍历顺序
  targetIndex: number; // 当前正在做字段映射的节点索引
  fieldMappings: Record<string, Record<string, string | null>>; // nodeId -> (oldInputName -> newOutputName|null)
}

// ---- 初始 DAG ----
const initialNodes: Node[] = [
  {
    id: 'ingest',
    position: { x: 80, y: 80 },
    data: { label: 'Ingest' },
    type: 'default',
  },
  {
    id: 'clean',
    position: { x: 320, y: 80 },
    data: { label: 'Clean' },
    type: 'default',
  },
  {
    id: 'feature',
    position: { x: 560, y: 80 },
    data: { label: 'Feature' },
    type: 'default',
  },
  {
    id: 'train',
    position: { x: 800, y: 80 },
    data: { label: 'Train' },
    type: 'default',
  },
  {
    id: 'eval',
    position: { x: 1040, y: 80 },
    data: { label: 'Eval' },
    type: 'default',
  },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'ingest', target: 'clean' },
  { id: 'e2', source: 'clean', target: 'feature' },
  { id: 'e3', source: 'feature', target: 'train' },
  { id: 'e4', source: 'train', target: 'eval' },
];

const initialMeta: Record<string, NodeMeta> = {
  ingest: {
    status: 'cached',
    inputs: ['source_uri: str'],
    outputs: ['raw_path: str'],
    retry: 1,
    timeoutSec: 120,
    cacheKey: 'ingest:${source_uri}',
    cpu: 1,
    memoryGB: 2,
    env: ['python=3.11', 'pandas'],
  },
  clean: {
    status: 'success',
    inputs: ['raw_path: str'],
    outputs: ['clean_path: str'],
    retry: 1,
    timeoutSec: 180,
    cacheKey: 'clean:${raw_path}',
    cpu: 1,
    memoryGB: 4,
    env: ['python=3.11', 'pyarrow'],
  },
  feature: {
    status: 'running',
    inputs: ['clean_path: str'],
    outputs: ['features_path: str'],
    retry: 0,
    timeoutSec: 300,
    cacheKey: 'feat:${clean_path}',
    cpu: 2,
    memoryGB: 8,
    env: ['python=3.11', 'scikit-learn'],
  },
  train: {
    status: 'queued',
    inputs: ['features_path: str'],
    outputs: ['model_uri: str'],
    retry: 2,
    timeoutSec: 600,
    cacheKey: 'train:${features_path}',
    cpu: 4,
    memoryGB: 16,
    env: ['python=3.11', 'pytorch'],
  },
  eval: {
    status: 'skipped',
    inputs: ['model_uri: str'],
    outputs: ['metrics: json'],
    retry: 0,
    timeoutSec: 120,
    cacheKey: 'eval:${model_uri}',
    cpu: 1,
    memoryGB: 2,
    env: ['python=3.11'],
  },
};

const initialCode: Record<string, NodeCode> = {
  ingest: {
    lang: 'python',
    version: 3,
    history: [
      `# v1\n# outputs: raw_path\nprint("ingest v1")`,
      `# v2\n# outputs: raw_path\nprint("ingest v2")`,
    ],
    content: `# v3\n# outputs: raw_path\nimport os\n\n# 输入: source_uri: str\n# 输出: raw_path: str\n\ndef run(source_uri: str) -> str:\n    path = "/tmp/raw.parquet"\n    print(f"downloading {source_uri} -> {path}")\n    return path\n`,
  },
  clean: {
    lang: 'python',
    version: 2,
    history: [`# v1\n# outputs: clean_path\nprint("clean v1")`],
    content: `# v2\n# outputs: clean_path\nfrom typing import Optional\n\n# 输入: raw_path: str\n# 输出: clean_path: str\n\ndef run(raw_path: str, *, dedupe: bool = True) -> str:\n    print("cleaning", raw_path)\n    return "/tmp/clean.parquet"\n`,
  },
  feature: {
    lang: 'typescript',
    version: 1,
    history: [],
    content: `// v1\n// outputs: features_path\n// 输入: clean_path: string\n// 输出: features_path: string\nexport function run(clean_path: string): string {\n  console.log('featurizing', clean_path)\n  return '/tmp/features.parquet'\n}`,
  },
  train: {
    lang: 'python',
    version: 1,
    history: [],
    content: `# v1\n# outputs: model_uri\n# 输入: features_path: str\n# 输出: model_uri: str\n\ndef run(features_path: str) -> str:\n    print("training on", features_path)\n    return "s3://bucket/model.pt"\n`,
  },
  eval: {
    lang: 'python',
    version: 1,
    history: [],
    content: `# v1\n# outputs: metrics\n# 输入: model_uri: str\n# 输出: metrics: json\n\nimport json\n\ndef run(model_uri: str) -> dict:\n    return {"acc": 0.91}\n`,
  },
};

const initialArtifacts: Record<string, Artifact[]> = {
  train: [
    { name: 'model.pt', size: '23.4MB' },
    { name: 'training.log', size: '84KB' },
  ],
  eval: [{ name: 'metrics.json', size: '2KB' }],
};

// ---- 辅助方法 ----
function nodeLabel(id: string, meta: NodeMeta) {
  return (
    <div className="flex items-center gap-2">
      <Boxes className="h-4 w-4" />
      <span className="font-medium">{id}</span>
      <StatusBadge status={meta.status} />
    </div>
  );
}

export function extractOutputsFromCode(code: string): string[] {
  // 读取 “# outputs: a, b” 或 “// outputs: a, b”（大小写不敏感）
  const m = code.match(/^[#\/]{1,2}\s*outputs:\s*([^\n]+)/im);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function nowFmt() {
  const d = new Date();
  return d.toLocaleTimeString();
}

function getDownstream(startId: string, edges: Edge[]): string[] {
  const visited = new Set<string>();
  const stack = [startId];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const e of edges) {
      if (e.source === cur && !visited.has(e.target)) {
        visited.add(e.target);
        stack.push(e.target);
      }
    }
  }
  return Array.from(visited);
}

function parseParamName(input: string): string {
  const idx = input.indexOf(':');
  return (idx === -1 ? input : input.slice(0, idx)).trim();
}

function renameInputsByMapping(
  inputs: string[],
  mapping: Record<string, string | null>
): string[] {
  return inputs.map((line) => {
    const name = parseParamName(line);
    if (mapping[name]) {
      const idx = line.indexOf(':');
      const suffix = idx === -1 ? '' : line.slice(idx);
      return `${mapping[name]}${suffix}`;
    }
    return line;
  });
}

function suggestFieldMapping(
  oldOutputs: string[],
  newOutputs: string[],
  downstreamInputs: string[]
): Record<string, string | null> {
  const oldNames = oldOutputs.map(parseParamName);
  const newNames = newOutputs.map(parseParamName);
  const mapping: Record<string, string | null> = {};
  for (const ipt of downstreamInputs) {
    const name = parseParamName(ipt);
    if (oldNames.includes(name)) {
      // 1) 如果新 outputs 含同名，优先同名
      if (newNames.includes(name)) {
        mapping[name] = name;
      } else if (newNames.length === 1) {
        // 2) 若只有一个新输出，默认映射过去
        mapping[name] = newNames[0];
      } else {
        // 3) 需人工选择
        mapping[name] = null;
      }
    }
  }
  return mapping;
}

function runUnitTests(): TestResult[] {
  const results: TestResult[] = [];

  // --- 提取 outputs 的用例 ---
  const t1 = extractOutputsFromCode(`# outputs: a, b`);
  results.push({
    name: 'parse python comment outputs',
    pass: JSON.stringify(t1) === JSON.stringify(['a', 'b']),
  });

  const t2 = extractOutputsFromCode(`// outputs: features_path`);
  results.push({
    name: 'parse ts comment outputs',
    pass: JSON.stringify(t2) === JSON.stringify(['features_path']),
  });

  const t3 = extractOutputsFromCode(`# Outputs: X, Y`);
  results.push({
    name: "case-insensitive 'outputs'",
    pass: JSON.stringify(t3) === JSON.stringify(['X', 'Y']),
  });

  const t4 = extractOutputsFromCode(`print('no header')`);
  results.push({
    name: 'no outputs returns []',
    pass: Array.isArray(t4) && t4.length === 0,
  });

  // --- 图下游遍历 ---
  const d1 = getDownstream('clean', initialEdges).sort();
  const want = ['feature', 'train', 'eval'].sort();
  results.push({
    name: "downstream from 'clean'",
    pass: JSON.stringify(d1) === JSON.stringify(want),
  });

  // --- 字段映射建议 ---
  const mapping = suggestFieldMapping(
    ['clean_path: str'],
    ['features_path: str'],
    ['clean_path: str', 'foo: str']
  );
  results.push({
    name: 'suggest mapping single target',
    pass:
      JSON.stringify(mapping) ===
      JSON.stringify({ clean_path: 'features_path' /* foo 未受影响 */ }),
  });

  const mapping2 = suggestFieldMapping(
    ['a: str', 'b: str'],
    ['a: str', 'c: str'],
    ['a: str', 'b: str']
  );
  results.push({
    name: 'suggest mapping prefer same name',
    pass: mapping2['a'] === 'a' && mapping2['b'] === null,
  });

  // --- v2 API 组件存在性 ---
  results.push({
    name: 'PanelGroup available',
    pass: typeof PanelGroup !== 'undefined',
  });
  results.push({ name: 'Panel available', pass: typeof Panel !== 'undefined' });
  results.push({
    name: 'PanelResizeHandle available',
    pass: typeof PanelResizeHandle !== 'undefined',
  });

  return results;
}

// ---- 主组件 ----
export default function StudioPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [meta, setMeta] = useState<Record<string, NodeMeta>>(initialMeta);
  const [code, setCode] = useState<Record<string, NodeCode>>(initialCode);
  const [artifacts, setArtifacts] =
    useState<Record<string, Artifact[]>>(initialArtifacts);
  const [selected, setSelected] = useState<string>('feature');

  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<RunEvent[]>([]);

  const [dryRunOK, setDryRunOK] = useState<boolean | null>(null);
  const [patch, setPatch] = useState<{ before: string; after: string } | null>(
    null
  );

  const [dslGuide, setDslGuide] = useState<MigrationGuideState>({
    open: false,
    step: 'nodes',
    oldOutputs: [],
    newOutputs: [],
    impacted: [],
    selected: {},
    selectedOrder: [],
    targetIndex: 0,
    fieldMappings: {},
  });

  const [tests, setTests] = useState<TestResult[]>([]);
  const [testsRunning, setTestsRunning] = useState(false);

  // 弹窗状态控制
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [runPanelOpen, setRunPanelOpen] = useState(false);
  const [fixPanelOpen, setFixPanelOpen] = useState(false);
  const [testPanelOpen, setTestPanelOpen] = useState(false);

  const handleRunTests = () => {
    if (testsRunning) return;
    setTestsRunning(true);
    const res = runUnitTests();
    setTests(res);
    setTestsRunning(false);
  };

  // 图节点着色
  const rfNodes = useMemo<Node[]>(() => {
    return nodes.map((n) => {
      const m = meta[n.id];
      return {
        ...n,
        data: { label: nodeLabel(n.id, m) },
        style: {
          borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.08)',
          padding: 8,
          background: 'white',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        },
      };
    });
  }, [nodes, meta]);

  // DSL 预览（极简 JSON）
  const dsl = useMemo(() => {
    return {
      nodes: rfNodes.map((n) => ({
        id: n.id,
        inputs: meta[n.id]?.inputs || [],
        outputs: meta[n.id]?.outputs || [],
      })),
      edges: edges.map((e) => ({ from: e.source, to: e.target })),
    };
  }, [rfNodes, edges, meta]);

  // 运行事件模拟
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setEvents((prev) => [
        ...prev,
        { ts: Date.now(), level: 'info', message: `tick @ ${nowFmt()}` },
      ]);
    }, 1200);
    return () => clearInterval(id);
  }, [running]);

  // 首次挂载运行一次测试
  useEffect(() => {
    setTests(runUnitTests());
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInspectorOpen(false);
        setRunPanelOpen(false);
        setFixPanelOpen(false);
        setTestPanelOpen(false);
      }
      if (e.key === 'i' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setInspectorOpen(!inspectorOpen);
      }
      if (e.key === 'r' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setRunPanelOpen(!runPanelOpen);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectorOpen, runPanelOpen]);

  // 点击画布空白处关闭抽屉
  const handlePaneClick = () => {
    if (inspectorOpen || runPanelOpen || fixPanelOpen || testPanelOpen) {
      // 可选：点击空白处关闭抽屉
      // setInspectorOpen(false);
      // setRunPanelOpen(false);
      // setFixPanelOpen(false);
      // setTestPanelOpen(false);
    }
  };

  // code 变化时，检测 outputs 变化，引导 DSL 迁移（两级流程触发）
  const prevOutputsRef = useRef<string[]>(
    extractOutputsFromCode(code[selected].content)
  );
  useEffect(() => {
    const outs = extractOutputsFromCode(code[selected].content);
    const prevOuts = prevOutputsRef.current;
    if (JSON.stringify(outs) !== JSON.stringify(prevOuts)) {
      const impacted = getDownstream(selected, edges).filter(
        (id) => id !== selected
      );
      const selectedMap: Record<string, boolean> = Object.fromEntries(
        impacted.map((id) => [id, true])
      );
      setDslGuide({
        open: true,
        step: 'nodes',
        oldOutputs: prevOuts,
        newOutputs: outs,
        impacted,
        selected: selectedMap,
        selectedOrder: [],
        targetIndex: 0,
        fieldMappings: {},
      });
      prevOutputsRef.current = outs;
    }
  }, [selected, code, edges]);

  const onConnect = (params: Edge | Connection) =>
    setEdges((eds) => addEdge(params, eds));

  function onSaveCode() {
    setCode((prev) => {
      const c = prev[selected];
      return {
        ...prev,
        [selected]: {
          ...c,
          version: c.version + 1,
          history: [...c.history, c.content],
        },
      };
    });
    setEvents((e) => [
      ...e,
      {
        ts: Date.now(),
        level: 'info',
        message: `已保存 ${selected} v${code[selected].version + 1}`,
      },
    ]);
  }

  function generatePatch() {
    const before = code[selected].content;
    const after =
      before +
      (code[selected].lang === 'python'
        ? "\n\n# hotfix: handle empty input\nif __name__ == '__main__':\n    print('dry-run ok')\n"
        : "\n\n// hotfix: handle empty input\nconsole.log('dry-run ok')\n");
    setPatch({ before, after });
  }

  function dryRun() {
    // 纯模拟
    setDryRunOK(Math.random() > 0.2);
  }

  function mergeAndRerun() {
    if (!patch) return;
    setCode((prev) => ({
      ...prev,
      [selected]: { ...prev[selected], content: patch.after },
    }));
    setEvents((e) => [
      ...e,
      { ts: Date.now(), level: 'info', message: `合并补丁并重跑 ${selected}` },
    ]);
    setRunning(true);
  }

  function rerunFromNode() {
    setRunning(true);
    setEvents((e) => [
      ...e,
      { ts: Date.now(), level: 'info', message: `从 ${selected} 重新执行` },
    ]);
  }

  // 根据 selected 渲染侧栏内容
  const selMeta = meta[selected];
  const selCode = code[selected];

  const passCount = tests.filter((t) => t.pass).length;

  // —— 字段级向导的辅助 ——
  function enterFieldStep() {
    const order = Object.entries(dslGuide.selected)
      .filter(([_, ok]) => ok)
      .map(([id]) => id);
    // 进入字段级前，先更新当前节点的 outputs（作为“上游签名”真相）
    setMeta((prev) => ({
      ...prev,
      [selected]: { ...prev[selected], outputs: dslGuide.newOutputs },
    }));

    // 为每个选中下游节点生成默认映射
    const fm: Record<string, Record<string, string | null>> = {};
    for (const nid of order) {
      const mapping = suggestFieldMapping(
        dslGuide.oldOutputs,
        dslGuide.newOutputs,
        meta[nid]?.inputs || []
      );
      fm[nid] = mapping;
    }
    setDslGuide((g) => ({
      ...g,
      step: 'fields',
      selectedOrder: order,
      targetIndex: 0,
      fieldMappings: fm,
    }));

    setEvents((e) => [
      ...e,
      {
        ts: Date.now(),
        level: 'info',
        message: `DSL 迁移：进入字段级确认（${order.length} 个下游）`,
      },
    ]);
  }

  function applyCurrentNodeFieldMapping() {
    const nid = dslGuide.selectedOrder[dslGuide.targetIndex];
    if (!nid) return;
    const mapping = dslGuide.fieldMappings[nid] || {};
    setMeta((prev) => ({
      ...prev,
      [nid]: {
        ...prev[nid],
        inputs: renameInputsByMapping(prev[nid].inputs, mapping),
      },
    }));
    setDslGuide((g) => ({
      ...g,
      fieldMappings: { ...g.fieldMappings, [nid]: mapping },
    }));
    setEvents((e) => [
      ...e,
      {
        ts: Date.now(),
        level: 'info',
        message: `已应用字段映射到下游节点 ${nid}`,
      },
    ]);
  }

  function gotoNode(offset: number) {
    const nextIndex = Math.min(
      Math.max(dslGuide.targetIndex + offset, 0),
      Math.max(dslGuide.selectedOrder.length - 1, 0)
    );
    setDslGuide((g) => ({ ...g, targetIndex: nextIndex }));
    const nid = dslGuide.selectedOrder[nextIndex];
    setEvents((e) => [
      ...e,
      {
        ts: Date.now(),
        level: 'info',
        message: `字段级向导：跳转至下游节点 ${nid}`,
      },
    ]);
  }

  function finishFieldStep() {
    setDslGuide((g) => ({
      ...g,
      open: false,
      step: 'nodes',
      selected: {},
      selectedOrder: [],
      targetIndex: 0,
    }));
    setEvents((e) => [
      ...e,
      {
        ts: Date.now(),
        level: 'info',
        message: 'DSL 迁移：字段级确认完成',
      },
    ]);
  }

  function setMapping(nid: string, inputName: string, to: string | null) {
    setDslGuide((g) => ({
      ...g,
      fieldMappings: {
        ...g.fieldMappings,
        [nid]: { ...(g.fieldMappings[nid] || {}), [inputName]: to },
      },
    }));
  }

  function onExposeApi() {
    console.log('onExposeApi');
  }

  function onRegisterMcp() {
    console.log('onRegisterMcp');
  }

  function onPublish() {
    console.log('onPublish');
  }

  // —— 渲染 ——
  return (
    <div className="h-screen w-full bg-slate-50 relative">
      {/* 顶部栏 */}
      <header className="h-14 px-4 flex items-center justify-between border-b bg-white absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-xl font-semibold">工作流编排 Studio</span>
          <Badge variant="secondary" className="rounded-full">
            模拟
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="gap-2" onClick={onExposeApi}>
            <Share2 className="h-4 w-4" />
            暴露为 API
          </Button>
          <Button variant="secondary" className="gap-2" onClick={onRegisterMcp}>
            <Link2 className="h-4 w-4" />
            注册为 MCP 工具
          </Button>
          <Button className="gap-2" onClick={onPublish}>
            <UploadCloud className="h-4 w-4" />
            发布此版本
          </Button>
        </div>
      </header>

      {/* 全屏画布 */}
      <div 
        className="absolute inset-0 pt-14" 
        style={{ width: '100vw', height: 'calc(100vh - 56px)' }}
        onClick={handlePaneClick}
      >
        <ReactFlow
          nodes={rfNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, n) => {
            setSelected(n.id);
            setInspectorOpen(true);
          }}
          onNodeDoubleClick={(_, n) => {
            setSelected(n.id);
            setInspectorOpen(true);
          }}
          fitView
          style={{ width: '100%', height: '100%' }}
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>

      {/* 浮动工具栏 */}
      <div className="absolute top-20 left-4 flex flex-col gap-2 z-20">
        <Button
          variant={inspectorOpen ? "default" : "outline"}
          size="sm"
          className="gap-2 bg-white shadow-sm"
          onClick={() => setInspectorOpen(!inspectorOpen)}
          title="打开/关闭 Inspector (Cmd+I)"
        >
          <FlaskConical className="h-4 w-4" />
          Inspector
        </Button>
        <Button
          variant={runPanelOpen ? "default" : "outline"}
          size="sm"
          className="gap-2 bg-white shadow-sm"
          onClick={() => setRunPanelOpen(!runPanelOpen)}
          title="打开/关闭运行面板 (Cmd+R)"
        >
          <Play className="h-4 w-4" />
          运行面板
        </Button>
        <Button
          variant={fixPanelOpen ? "default" : "outline"}
          size="sm"
          className="gap-2 bg-white shadow-sm"
          onClick={() => setFixPanelOpen(!fixPanelOpen)}
          title="打开/关闭错误修复"
        >
          <Wand2 className="h-4 w-4" />
          错误修复
        </Button>
        <Button
          variant={testPanelOpen ? "default" : "outline"}
          size="sm"
          className="gap-2 bg-white shadow-sm"
          onClick={() => setTestPanelOpen(!testPanelOpen)}
          title="打开/关闭测试面板"
        >
          <Check className="h-4 w-4" />
          测试 ({passCount}/{tests.length})
        </Button>
      </div>

      {/* 运行控制栏 */}
      <div className="absolute top-20 right-4 flex items-center gap-2 z-20">
        <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => setRunning(true)}
          >
            <Play className="h-4 w-4" />
            启动
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => setRunning(false)}
          >
            <Pause className="h-4 w-4" />
            暂停
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={rerunFromNode}
          >
            <RotateCcw className="h-4 w-4" />
            从 {selected} 重跑
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Trace</span>
            <div className="h-2 bg-slate-200 rounded-full w-24">
              <div
                className={`h-2 rounded-full ${running ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'}`}
                style={{ width: running ? '66%' : '33%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 状态栏 */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border">
          {(Object.keys(STATUS_THEME) as Status[]).map((s) => (
            <div key={s} className="flex items-center gap-1 text-xs">
              <span
                className={`h-2 w-2 rounded-full ${STATUS_THEME[s].dot}`}
              />
              <span className="capitalize">{s}</span>
            </div>
          ))}
        </div>
        <div className="text-xs text-slate-600 bg-white rounded-lg px-3 py-2 shadow-sm border">
          当前节点：<b>{selected}</b> | 语言：<b>{selCode.lang}</b> | 版本：<b>v{selCode.version}</b>
        </div>
      </div>

      {/* Inspector 抽屉 - 从右侧滑出 */}
      <div className={`fixed top-14 right-0 h-[calc(100vh-56px)] w-[400px] bg-white shadow-xl border-l transform transition-transform duration-300 z-40 ${
        inspectorOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b bg-slate-50">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              <span className="text-lg font-semibold">Inspector: {selected}</span>
              <Badge variant="outline" className="rounded-full">
                {selCode.lang}
              </Badge>
              <StatusBadge status={selMeta.status} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInspectorOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="config" className="h-full flex flex-col">
              <div className="px-4 pt-2">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="config">配置</TabsTrigger>
                  <TabsTrigger value="code">代码</TabsTrigger>
                  <TabsTrigger value="log">日志</TabsTrigger>
                </TabsList>
              </div>
              <div className="flex-1 min-h-0">
                <TabsContent value="config" className="h-full m-0">
                  <ScrollArea className="h-full px-4 py-2">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>入参 (一行一个)</Label>
                        <Textarea
                          rows={3}
                          value={selMeta.inputs.join('\n')}
                          onChange={(e) => {
                            const lines = e.target.value.split('\n');
                            setMeta((prev) => ({
                              ...prev,
                              [selected]: {
                                ...prev[selected],
                                inputs: lines,
                              },
                            }));
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>
                          出参 (一行一个){' '}
                          <Badge variant="secondary" className="text-xs">签名提示</Badge>
                        </Label>
                        <Textarea
                          rows={3}
                          value={selMeta.outputs.join('\n')}
                          onChange={(e) => {
                            const lines = e.target.value.split('\n');
                            setMeta((prev) => ({
                              ...prev,
                              [selected]: {
                                ...prev[selected],
                                outputs: lines,
                              },
                            }));
                          }}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Timer className="h-4 w-4" />
                            超时 (秒)
                          </Label>
                          <Input
                            type="number"
                            value={selMeta.timeoutSec}
                            onChange={(e) =>
                              setMeta((prev) => ({
                                ...prev,
                                [selected]: {
                                  ...prev[selected],
                                  timeoutSec: Number(e.target.value),
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Undo2 className="h-4 w-4" />
                            重试次数
                          </Label>
                          <Input
                            type="number"
                            value={selMeta.retry}
                            onChange={(e) =>
                              setMeta((prev) => ({
                                ...prev,
                                [selected]: {
                                  ...prev[selected],
                                  retry: Number(e.target.value),
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Cpu className="h-4 w-4" />
                            CPU
                          </Label>
                          <Input
                            type="number"
                            value={selMeta.cpu}
                            onChange={(e) =>
                              setMeta((prev) => ({
                                ...prev,
                                [selected]: {
                                  ...prev[selected],
                                  cpu: Number(e.target.value),
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            内存 (GB)
                          </Label>
                          <Input
                            type="number"
                            value={selMeta.memoryGB}
                            onChange={(e) =>
                              setMeta((prev) => ({
                                ...prev,
                                [selected]: {
                                  ...prev[selected],
                                  memoryGB: Number(e.target.value),
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>缓存键</Label>
                        <Input
                          value={selMeta.cacheKey}
                          onChange={(e) =>
                            setMeta((prev) => ({
                              ...prev,
                              [selected]: {
                                ...prev[selected],
                                cacheKey: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>环境依赖 (一行一个)</Label>
                        <Textarea
                          rows={3}
                          value={selMeta.env.join('\n')}
                          onChange={(e) =>
                            setMeta((prev) => ({
                              ...prev,
                              [selected]: {
                                ...prev[selected],
                                env: e.target.value.split('\n').filter(Boolean),
                              },
                            }))
                          }
                        />
                      </div>

                      <Separator />
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">DSL 预览</div>
                          <Badge variant="outline" className="text-xs">双向联动</Badge>
                        </div>
                        <pre className="text-xs bg-slate-950 text-slate-100 rounded-lg p-3 overflow-auto max-h-40">
                          {JSON.stringify(dsl, null, 2)}
                        </pre>
                        <p className="text-xs text-slate-500">
                          在图上改连线/参数，会自动更新此 DSL
                        </p>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="code" className="h-full m-0">
                  <div className="h-full flex flex-col">
                    <div className="px-4 py-2 flex items-center gap-2 border-b">
                      <Badge variant="secondary">
                        v{selCode.version}
                      </Badge>
                      <div className="ml-auto flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={onSaveCode}
                        >
                          <Save className="h-4 w-4" />
                          保存
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => generatePatch()}
                        >
                          <Wand2 className="h-4 w-4" />
                          补丁
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 min-h-0">
                      <Editor
                        height="100%"
                        defaultLanguage={selCode.lang}
                        value={selCode.content}
                        onChange={(val) => {
                          setCode((prev) => ({
                            ...prev,
                            [selected]: {
                              ...prev[selected],
                              content: val || '',
                            },
                          }));
                        }}
                        options={{
                          fontSize: 12,
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                        }}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="log" className="h-full m-0">
                  <div className="h-full flex flex-col">
                    <div className="px-4 py-2 flex items-center justify-between border-b">
                      <div className="font-medium flex items-center gap-2">
                        <Bug className="h-4 w-4" />
                        实时日志
                      </div>
                      <Switch
                        checked={running}
                        onCheckedChange={setRunning}
                        size="sm"
                      />
                    </div>
                    <ScrollArea className="flex-1">
                      <ul className="px-4 py-2 space-y-2">
                        {events.slice(-50).map((e, i) => (
                          <li key={i} className="text-xs">
                            <span className="text-slate-500 mr-2">
                              {new Date(e.ts).toLocaleTimeString()}
                            </span>
                            <span className="mr-2 uppercase tracking-wide text-[10px]">
                              {e.level}
                            </span>
                            <span>{e.message}</span>
                          </li>
                        ))}
                        {events.length === 0 && (
                          <li className="text-xs text-slate-400">暂无日志</li>
                        )}
                      </ul>
                    </ScrollArea>
                    
                    <Separator />
                    
                    <div className="px-4 py-2">
                      <div className="font-medium flex items-center gap-2 mb-2">
                        <FileDiff className="h-4 w-4" />
                        Artifacts
                      </div>
                      <ul className="space-y-1">
                        {(artifacts[selected] || []).map((a, i) => (
                          <li
                            key={i}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Download className="h-3 w-3" />
                              <span>{a.name}</span>
                            </div>
                            <span className="text-slate-500 text-xs">
                              {a.size}
                            </span>
                          </li>
                        ))}
                        {(!artifacts[selected] ||
                          artifacts[selected].length === 0) && (
                          <li className="text-xs text-slate-400">
                            暂无文件
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>

      {/* DSL 迁移向导：节点级 → 字段级 */}
      {dslGuide.open && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[860px] max-w-[94vw] p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="text-lg font-semibold">DSL 迁移向导</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setDslGuide({
                    open: false,
                    step: 'nodes',
                    oldOutputs: [],
                    newOutputs: [],
                    impacted: [],
                    selected: {},
                    selectedOrder: [],
                    targetIndex: 0,
                    fieldMappings: {},
                  })
                }
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              检测到 <b>{selected}</b> 的 <code>outputs</code> 发生变化。
            </p>

            <div className="bg-slate-50 rounded-xl p-3 text-xs mb-3">
              <div>
                旧 outputs: <b>{dslGuide.oldOutputs.join(', ') || '(空)'}</b>
              </div>
              <div>
                新 outputs: <b>{dslGuide.newOutputs.join(', ') || '(空)'}</b>
              </div>
            </div>

            {dslGuide.step === 'nodes' && (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-medium">
                    受影响范围（{dslGuide.impacted.length} 个下游节点）
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDslGuide((g) => ({
                          ...g,
                          selected: Object.fromEntries(
                            g.impacted.map((id) => [id, true])
                          ),
                        }))
                      }
                    >
                      全选
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDslGuide((g) => ({
                          ...g,
                          selected: Object.fromEntries(
                            g.impacted.map((id) => [id, false])
                          ),
                        }))
                      }
                    >
                      全不选
                    </Button>
                  </div>
                </div>

                <div className="max-h-64 overflow-auto border rounded-xl">
                  <ul>
                    {dslGuide.impacted.length === 0 && (
                      <li className="px-3 py-2 text-sm text-slate-500">
                        没有发现下游节点。
                      </li>
                    )}
                    {dslGuide.impacted.map((id) => (
                      <li
                        key={id}
                        className="px-3 py-2 border-b last:border-b-0 flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={!!dslGuide.selected[id]}
                          onCheckedChange={(v) =>
                            setDslGuide((g) => ({
                              ...g,
                              selected: { ...g.selected, [id]: !!v },
                            }))
                          }
                        />
                        <span className="font-medium">{id}</span>
                        <span className="ml-auto text-xs text-slate-500">
                          状态：{meta[id]?.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-end gap-2 mt-3">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setDslGuide({
                        open: false,
                        step: 'nodes',
                        oldOutputs: [],
                        newOutputs: [],
                        impacted: [],
                        selected: {},
                        selectedOrder: [],
                        targetIndex: 0,
                        fieldMappings: {},
                      })
                    }
                  >
                    稍后再说
                  </Button>
                  <Button
                    onClick={enterFieldStep}
                    disabled={Object.values(dslGuide.selected).every((v) => !v)}
                  >
                    下一步（字段级）
                  </Button>
                </div>
              </>
            )}

            {dslGuide.step === 'fields' && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">
                    字段级确认（{dslGuide.targetIndex + 1}/
                    {dslGuide.selectedOrder.length}）
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => gotoNode(-1)}
                      disabled={dslGuide.targetIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      上一节点
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => gotoNode(1)}
                      disabled={
                        dslGuide.targetIndex >=
                        dslGuide.selectedOrder.length - 1
                      }
                    >
                      下一节点
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {(() => {
                  const nid = dslGuide.selectedOrder[dslGuide.targetIndex];
                  const inputs = meta[nid]?.inputs || [];
                  const mapping = dslGuide.fieldMappings[nid] || {};
                  const impactedInputs = inputs.filter((i) =>
                    dslGuide.oldOutputs
                      .map(parseParamName)
                      .includes(parseParamName(i))
                  );
                  return (
                    <div className="border rounded-xl">
                      <div className="px-3 py-2 border-b text-sm bg-slate-50 flex items-center gap-2">
                        <span className="font-medium">目标下游节点：</span>
                        <Badge variant="secondary">{nid}</Badge>
                      </div>
                      <div className="max-h-64 overflow-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-slate-500">
                              <th className="px-3 py-2">下游入参</th>
                              <th className="px-3 py-2">映射到新 output</th>
                            </tr>
                          </thead>
                          <tbody>
                            {impactedInputs.length === 0 && (
                              <tr>
                                <td
                                  className="px-3 py-3 text-slate-500"
                                  colSpan={2}
                                >
                                  此节点未直接引用旧 outputs。
                                </td>
                              </tr>
                            )}
                            {impactedInputs.map((line) => {
                              const iptName = parseParamName(line);
                              const current = mapping[iptName] ?? null;
                              return (
                                <tr key={line}>
                                  <td className="px-3 py-2 font-mono text-xs">
                                    {line}
                                  </td>
                                  <td className="px-3 py-2">
                                    <Select
                                      value={current ?? '__none'}
                                      onValueChange={(val) =>
                                        setMapping(
                                          nid,
                                          iptName,
                                          val === '__none' ? null : val
                                        )
                                      }
                                    >
                                      <SelectTrigger className="w-64">
                                        <SelectValue placeholder="选择新的输出字段" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none">
                                          （不变 / 手动处理）
                                        </SelectItem>
                                        {dslGuide.newOutputs.map((o) => (
                                          <SelectItem
                                            key={o}
                                            value={parseParamName(o)}
                                          >
                                            {o}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="px-3 py-2 border-t flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => gotoNode(-1)}
                          disabled={dslGuide.targetIndex === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          上一节点
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => gotoNode(1)}
                          disabled={
                            dslGuide.targetIndex >=
                            dslGuide.selectedOrder.length - 1
                          }
                        >
                          下一节点
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={applyCurrentNodeFieldMapping}
                        >
                          仅应用当前节点
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={finishFieldStep}
                        >
                          完成
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}

      {/* 运行面板抽屉 - 从底部滑出 */}
      <div className={`fixed bottom-0 left-0 right-0 h-[300px] bg-white shadow-xl border-t transform transition-transform duration-300 z-40 ${
        runPanelOpen ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b bg-slate-50">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              <span className="text-lg font-semibold">运行面板</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRunPanelOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 grid grid-cols-4 overflow-hidden">
            <div className="col-span-3 border-r p-4">
              <div className="flex items-center gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setRunning(true)}
                >
                  <Play className="h-4 w-4" />
                  启动
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setRunning(false)}
                >
                  <Pause className="h-4 w-4" />
                  暂停
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={rerunFromNode}
                >
                  <RotateCcw className="h-4 w-4" />从 {selected} 重跑
                </Button>
                <div className="ml-auto flex items-center gap-2 text-xs text-slate-600">
                  <span>Trace</span>
                  <div className="h-2 bg-slate-200 rounded-full w-32">
                    <div
                      className={`h-2 rounded-full ${running ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'}`}
                      style={{ width: running ? '66%' : '33%' }}
                    />
                  </div>
                </div>
              </div>
              <ScrollArea className="h-[calc(100%-60px)]">
                <ul className="space-y-2 pr-3">
                  {events
                    .slice()
                    .reverse()
                    .map((e, i) => (
                      <li key={i} className="text-sm">
                        <span className="text-slate-500 mr-2">
                          {new Date(e.ts).toLocaleTimeString()}
                        </span>
                        <span className="mr-2 uppercase tracking-wide text-[10px]">
                          {e.level}
                        </span>
                        <span>{e.message}</span>
                      </li>
                    ))}
                  {events.length === 0 && (
                    <li className="text-sm text-slate-400">暂无运行事件</li>
                  )}
                </ul>
              </ScrollArea>
            </div>
            <div className="p-4">
              <div className="font-medium mb-2">整体状态</div>
              <div className="grid grid-cols-2 gap-1">
                {(Object.keys(STATUS_THEME) as Status[]).map((s) => (
                  <div
                    key={s}
                    className="flex items-center gap-1 text-xs bg-slate-50 rounded px-2 py-1 border"
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${STATUS_THEME[s].dot}`}
                    />
                    <span className="capitalize">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 错误修复抽屉 - 从左侧滑出 */}
      <div className={`fixed top-14 left-0 h-[calc(100vh-56px)] w-[500px] bg-white shadow-xl border-r transform transition-transform duration-300 z-40 ${
        fixPanelOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b bg-slate-50">
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              <span className="text-lg font-semibold">错误修复</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFixPanelOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden p-4">
            <div className="space-y-4">
              <div>
                <div className="font-medium mb-2">一键修复</div>
                <p className="text-sm text-slate-600 mb-3">
                  让 Agent 根据日志生成补丁，先 Dry‑Run 验证，再合并并重跑。
                </p>
                <div className="flex flex-col gap-2 mb-3">
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={generatePatch}
                  >
                    <Wand2 className="h-4 w-4" />
                    生成补丁
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={dryRun}
                    className="gap-2"
                  >
                    <FlaskConical className="h-4 w-4" />
                    Dry‑Run
                  </Button>
                </div>
                {dryRunOK !== null && (
                  <div
                    className={`text-sm mb-3 ${dryRunOK ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {dryRunOK ? 'Dry‑Run 通过' : 'Dry‑Run 未通过'}
                  </div>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-2 w-full"
                  onClick={mergeAndRerun}
                  disabled={!patch}
                >
                  <FileDiff className="h-4 w-4" />
                  合并并重跑此节点
                </Button>
              </div>
              
              <Separator />
              
              <div>
                <div className="font-medium mb-2">补丁预览</div>
                <div className="h-[300px] rounded-lg overflow-hidden border">
                  {patch ? (
                    <DiffViewer
                      oldValue={patch.before}
                      newValue={patch.after}
                      splitView={false}
                      showDiffOnly={true}
                      styles={{
                        variables: {
                          light: { 
                            diffViewerBackground: 'white',
                            codeFoldGutterBackground: '#f8fafc',
                          },
                        },
                      }}
                    />
                  ) : (
                    <div className="h-full grid place-items-center text-slate-400 text-sm">
                      尚未生成补丁
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 测试面板抽屉 - 从顶部滑出 */}
      <div className={`fixed top-14 left-0 right-0 h-[350px] bg-white shadow-xl border-b transform transition-transform duration-300 z-40 ${
        testPanelOpen ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b bg-slate-50">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              <span className="text-lg font-semibold">单元测试</span>
              <Badge variant="outline">
                {passCount}/{tests.length} 通过
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRunTests}
                disabled={testsRunning}
                className="flex items-center gap-1"
              >
                {testsRunning && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                {testsRunning ? '运行中...' : '重新运行'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTestPanelOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden p-4">
            <div className="border rounded-lg overflow-hidden h-full">
              <ScrollArea className="h-full">
                <ul className="divide-y">
                  {tests.map((t, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between px-4 py-3 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        {t.pass ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <X className="h-4 w-4 text-rose-600" />
                        )}
                        <span>{t.name}</span>
                      </div>
                      {!t.pass && t.detail && (
                        <span className="text-xs text-rose-600">
                          {t.detail}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              这些用例覆盖了解析 outputs、下游遍历、字段映射建议以及组件存在性检测
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
