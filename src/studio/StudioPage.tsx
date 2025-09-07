import React, { useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  type Connection,
  type Node,
  useEdgesState,
  useNodesState,
  type ReactFlowInstance,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { PanelGroup, Panel, PanelResizeHandle } from '@/shims/resizable-panels';
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
import {
  FlaskConical,
  Timer,
  Cpu,
  Zap,
  Save,
  Wand2,
  FileDiff,
  ChevronLeft,
} from '@/shims/lucide-react';
import { autoLayout } from '@/flow/utils';
import {
  initialNodes,
  initialEdges,
  type Status,
  type NodeMeta,
} from '@/studio/mock-data';

const STATUS_THEME: Record<
  Status,
  { bg: string; color: string; border: string }
> = {
  queued: { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' },
  running: { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
  success: { bg: '#dcfce7', color: '#16a34a', border: '#86efac' },
  failed: { bg: '#ffe4e6', color: '#e11d48', border: '#fecdd3' },
  skipped: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
  cached: { bg: '#ede9fe', color: '#7c3aed', border: '#ddd6fe' },
};

// 静态数据已拆分至 mock-data.ts

function statusBadge(s: Status) {
  const t = STATUS_THEME[s];
  return (
    <span
      style={{
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
        padding: '2px 6px',
        borderRadius: 999,
      }}
    >
      {s}
    </span>
  );
}

const StudioPage: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selected, setSelected] = useState<string>('feature');
  const rf = useRef<ReactFlowInstance | null>(null);

  const nodeTypes = useMemo(
    () => ({
      default: ({ data }: any) => {
        const s: Status = data.status ?? 'queued';
        const theme = STATUS_THEME[s];
        return (
          <div
            style={{
              position: 'relative',
              background: '#fff',
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              padding: 8,
              minWidth: 120,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <strong>{data.label}</strong>
              {statusBadge(s)}
            </div>
            {/* 左侧作为目标（输入）、右侧作为源（输出） */}
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
          </div>
        );
      },
    }),
    []
  );

  const onConnect = (connection: Connection) =>
    setEdges((eds) => addEdge(connection, eds));

  const dsl = useMemo(
    () => ({
      nodes: nodes.map((n) => ({
        id: n.id,
        status: (n.data as any)?.status as Status,
        inputs: ((n.data as any)?.meta?.inputs ?? []) as string[],
        outputs: ((n.data as any)?.meta?.outputs ?? []) as string[],
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    }),
    [nodes, edges]
  );

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selected),
    [nodes, selected]
  );
  const selMeta: NodeMeta = useMemo(
    () => ({
      status: ((selectedNode?.data as any)?.meta?.status ??
        (selectedNode?.data as any)?.status ??
        'queued') as Status,
      inputs: [
        ...(((selectedNode?.data as any)?.meta?.inputs as
          | string[]
          | undefined) ?? []),
      ],
      outputs: [
        ...(((selectedNode?.data as any)?.meta?.outputs as
          | string[]
          | undefined) ?? []),
      ],
      retry: ((selectedNode?.data as any)?.meta?.retry ?? 0) as number,
      timeoutSec: ((selectedNode?.data as any)?.meta?.timeoutSec ??
        0) as number,
      cacheKey: ((selectedNode?.data as any)?.meta?.cacheKey ?? '') as string,
      cpu: ((selectedNode?.data as any)?.meta?.cpu ?? 1) as number,
      memoryGB: ((selectedNode?.data as any)?.meta?.memoryGB ?? 1) as number,
      env: [
        ...(((selectedNode?.data as any)?.meta?.env as string[] | undefined) ??
          []),
      ],
    }),
    [selectedNode]
  );

  const updateSelectedMeta = (updater: (m: NodeMeta) => NodeMeta) => {
    setNodes((ns) =>
      ns.map((n) => {
        if (n.id !== selected) return n;
        const next = updater(((n.data as any)?.meta ?? {}) as NodeMeta);
        return {
          ...n,
          data: { ...(n.data as any), status: next.status, meta: next },
        } as Node;
      })
    );
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <div
        style={{
          padding: 8,
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <strong>工作流编排 Studio</strong>
        <span style={{ color: '#64748b' }}>模拟</span>
      </div>
      <PanelGroup direction="horizontal">
        {/* 左侧：图 + 下方运行区 */}
        <Panel>
          <div
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            {/* 顶部工具条 */}
            <div
              style={{
                padding: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <Button onClick={() => rf.current?.fitView()}>适配</Button>
              <Button
                onClick={async () => {
                  const laid = await autoLayout(nodes, edges);
                  setNodes(laid.nodes);
                  setTimeout(() => rf.current?.fitView({ duration: 300 }), 0);
                }}
              >
                自动布局
              </Button>
              <Button>启动</Button>
              <Button>暂停</Button>
              <Button>调试</Button>
              <Button>从 feature 重跑</Button>
            </div>
            {/* 画布 */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_, n) => setSelected(n.id)}
                nodeTypes={nodeTypes}
                onInit={(inst) => (rf.current = inst)}
              >
                <Background />
                <MiniMap />
                <Controls />
              </ReactFlow>
            </div>
            {/* 运行板块（占位） */}
            <div style={{ borderTop: '1px solid #e5e7eb', padding: 8 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button>运行面板</Button>
                  <Button>错误修复</Button>
                  <Button>测试 (0/0)</Button>
                </div>
                <div style={{ width: 240 }}>
                  <div
                    style={{
                      height: 6,
                      background: '#e5e7eb',
                      borderRadius: 999,
                    }}
                  >
                    <div
                      style={{
                        height: 6,
                        width: '30%',
                        background: '#60a5fa',
                        borderRadius: 999,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>
        <PanelResizeHandle />
        {/* 右侧：Inspector */}
        <Panel>
          <div style={{ height: '100%', padding: 8 }}>
            <Card className="h-full">
              <CardHeader className="py-3">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <CardTitle
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    节点 Inspector：{selected}
                  </CardTitle>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <Badge>typescript</Badge>
                    {statusBadge('running')}
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent
                style={{
                  height: 'calc(100% - 46px)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Tabs defaultValue="config" className="h-full">
                  <div style={{ padding: '4px 8px' }}>
                    <TabsList>
                      <TabsTrigger value="config">配置</TabsTrigger>
                      <TabsTrigger value="code">代码</TabsTrigger>
                      <TabsTrigger value="log">日志/Artifact</TabsTrigger>
                    </TabsList>
                  </div>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <TabsContent value="config" className="h-full">
                      <ScrollArea className="h-full">
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 12,
                          }}
                        >
                          <div style={{ gridColumn: '1 / -1' }}>
                            <Label>入参 (一行一个)</Label>
                            <Textarea
                              rows={3}
                              value={selMeta.inputs.join('\n')}
                              onChange={(e) =>
                                updateSelectedMeta((m) => ({
                                  ...m,
                                  inputs: e.target.value
                                    .split('\n')
                                    .filter(Boolean),
                                }))
                              }
                            />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <Label>
                              出参 (一行一个) <Badge>签名提示</Badge>
                            </Label>
                            <Textarea
                              rows={3}
                              value={selMeta.outputs.join('\n')}
                              onChange={(e) =>
                                updateSelectedMeta((m) => ({
                                  ...m,
                                  outputs: e.target.value
                                    .split('\n')
                                    .filter(Boolean),
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <Timer /> 超时 (秒)
                            </Label>
                            <Input
                              type="number"
                              value={selMeta.timeoutSec}
                              onChange={(e) =>
                                updateSelectedMeta((m) => ({
                                  ...m,
                                  timeoutSec: Number(e.target.value),
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <ChevronLeft /> 重试次数
                            </Label>
                            <Input
                              type="number"
                              value={selMeta.retry}
                              onChange={(e) =>
                                updateSelectedMeta((m) => ({
                                  ...m,
                                  retry: Number(e.target.value),
                                }))
                              }
                            />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <Label>缓存键</Label>
                            <Input
                              value={selMeta.cacheKey}
                              onChange={(e) =>
                                updateSelectedMeta((m) => ({
                                  ...m,
                                  cacheKey: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <Cpu /> CPU
                            </Label>
                            <Input
                              type="number"
                              value={selMeta.cpu}
                              onChange={(e) =>
                                updateSelectedMeta((m) => ({
                                  ...m,
                                  cpu: Number(e.target.value),
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <Zap /> 内存 (GB)
                            </Label>
                            <Input
                              type="number"
                              value={selMeta.memoryGB}
                              onChange={(e) =>
                                updateSelectedMeta((m) => ({
                                  ...m,
                                  memoryGB: Number(e.target.value),
                                }))
                              }
                            />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <Label>环境依赖 (一行一个)</Label>
                            <Textarea
                              rows={3}
                              value={selMeta.env.join('\n')}
                              onChange={(e) =>
                                updateSelectedMeta((m) => ({
                                  ...m,
                                  env: e.target.value
                                    .split('\n')
                                    .filter(Boolean),
                                }))
                              }
                            />
                          </div>
                        </div>

                        <Separator />
                        <div style={{ marginTop: 8 }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div style={{ fontWeight: 500 }}>DSL 预览</div>
                            <Badge>双向联动</Badge>
                          </div>
                          <pre
                            style={{
                              fontSize: 12,
                              background: '#0f172a',
                              color: '#e2e8f0',
                              borderRadius: 8,
                              padding: 8,
                              overflow: 'auto',
                            }}
                          >
                            {JSON.stringify(dsl, null, 2)}
                          </pre>
                          <p style={{ fontSize: 12, color: '#64748b' }}>
                            在图上改连线/参数，会自动更新此 DSL。
                          </p>
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="code" className="h-full">
                      <div
                        style={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div
                          style={{
                            padding: '4px 8px',
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        >
                          <Badge>v1</Badge>
                          <div
                            style={{
                              marginLeft: 'auto',
                              display: 'flex',
                              gap: 8,
                            }}
                          >
                            <Button>
                              <Save /> 保存
                            </Button>
                            <Button>
                              <Wand2 /> 由 Agent 生成补丁
                            </Button>
                          </div>
                        </div>
                        <div style={{ flex: 1, minHeight: 0 }}>
                          {/* 使用简化编辑器占位 */}
                          <Textarea
                            defaultValue={`// v1\nexport function run() {\n  return 'ok'\n}`}
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="log" className="h-full">
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          height: '100%',
                        }}
                      >
                        <div
                          style={{
                            borderRight: '1px solid #e5e7eb',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <div
                            style={{
                              padding: '4px 8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <FlaskConical /> 实时日志
                            </div>
                            <Switch />
                          </div>
                          <ScrollArea className="flex-1">
                            <ul style={{ padding: 8 }}>
                              <li style={{ fontSize: 12, color: '#64748b' }}>
                                暂无日志
                              </li>
                            </ul>
                          </ScrollArea>
                        </div>
                        <div
                          style={{ display: 'flex', flexDirection: 'column' }}
                        >
                          <div
                            style={{
                              padding: '4px 8px',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <FileDiff /> Artifacts
                          </div>
                          <ScrollArea className="flex-1">
                            <ul style={{ padding: 8 }}>
                              <li style={{ fontSize: 12, color: '#64748b' }}>
                                暂无文件
                              </li>
                            </ul>
                          </ScrollArea>
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </Panel>
      </PanelGroup>
      {/* 整体状态栏 */}
      <div
        style={{
          padding: 8,
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {(
            [
              'queued',
              'running',
              'success',
              'failed',
              'skipped',
              'cached',
            ] as Status[]
          ).map((s) => (
            <div
              key={s}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {statusBadge(s)}
            </div>
          ))}
        </div>
        <div style={{ color: '#64748b' }}>
          当前节点：<strong>{selected}</strong>
          <span style={{ marginLeft: 12 }}>语言：typescript，版本：v1</span>
        </div>
      </div>
    </div>
  );
};

export default StudioPage;
