import React, { useMemo, useRef, useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  useEdgesState,
  useNodesState,
  type ReactFlowInstance,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

// 添加CSS动画
const workflowStyles = `
  @keyframes pulse {
    0% {
      opacity: 0.3;
      transform: scale(0.98);
    }
    50% {
      opacity: 0.9;
      transform: scale(1.03);
    }
    100% {
      opacity: 0.3;
      transform: scale(0.98);
    }
  }
  
  @keyframes progressPulse {
    0%, 100% {
      opacity: 0.7;
      transform: translateX(0);
    }
    50% {
      opacity: 1;
      transform: translateX(5px);
    }
  }
  
  @keyframes nodeGlow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
    }
    50% {
      box-shadow: 0 0 30px rgba(59, 130, 246, 0.6);
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  
  @keyframes subtlePulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.95;
      transform: scale(1.005);
    }
  }
  
  @keyframes elegantFloat {
    0%, 100% {
      transform: translateY(0px) rotate(0deg);
    }
    33% {
      transform: translateY(-4px) rotate(1deg);
    }
    66% {
      transform: translateY(-2px) rotate(-1deg);
    }
  }
  
  .subtle-glow {
    animation: subtlePulse 4s ease-in-out infinite;
  }
  
  .elegant-float {
    animation: elegantFloat 6s ease-in-out infinite;
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-8px);
    }
  }
  
  @keyframes ripple {
    0% {
      transform: scale(0);
      opacity: 1;
    }
    100% {
      transform: scale(4);
      opacity: 0;
    }
  }
  
  @keyframes glowPulse {
    0%, 100% {
      filter: drop-shadow(0 0 8px currentColor) drop-shadow(0 0 16px currentColor);
    }
    50% {
      filter: drop-shadow(0 0 12px currentColor) drop-shadow(0 0 24px currentColor);
    }
  }
  
  .react-flow__node.selected {
    animation: nodeGlow 2s ease-in-out infinite;
  }
  
  .workflow-shimmer {
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
  }
  
  .workflow-card {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8));
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }
`;

// 注入样式
const styleSheet = document.createElement('style');
styleSheet.textContent = workflowStyles;
document.head.appendChild(styleSheet);

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
import BlueprintNode from '@/components/nodes/src/BlueprintNode';

type Status =
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'cached';
interface NodeMeta {
  status: Status;
  inputs: string[];
  outputs: string[];
  retry: number;
  timeoutSec: number;
  cacheKey: string;
  cpu: number;
  memoryGB: number;
  env: string[];
}
const STATUS_THEME: Record<
  Status,
  { bg: string; color: string; border: string; shadow: string; iconBg: string }
> = {
  queued: { 
    bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
    color: '#334155', 
    border: '#cbd5e1',
    shadow: '0 2px 4px rgba(203, 213, 225, 0.3)',
    iconBg: '#94a3b8'
  },
  running: { 
    bg: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)', 
    color: '#1e40af', 
    border: '#60a5fa',
    shadow: '0 4px 16px rgba(59, 130, 246, 0.4)',
    iconBg: '#3b82f6'
  },
  success: { 
    bg: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', 
    color: '#16a34a', 
    border: '#4ade80',
    shadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
    iconBg: '#22c55e'
  },
  failed: { 
    bg: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 50%, #fca5a5 100%)', 
    color: '#b91c1c', 
    border: '#f87171',
    shadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
    iconBg: '#ef4444'
  },
  skipped: { 
    bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
    color: '#d97706', 
    border: '#fbbf24',
    shadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
    iconBg: '#f59e0b'
  },
  cached: { 
    bg: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)', 
    color: '#7c3aed', 
    border: '#a78bfa',
    shadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
    iconBg: '#8b5cf6'
  },
};

const initialMeta: Record<string, NodeMeta> = {
  blueprint: {
    status: 'queued',
    inputs: ['user_description: str'],
    outputs: ['node_blueprint: json'],
    retry: 0,
    timeoutSec: 60,
    cacheKey: 'blueprint:${user_description}',
    cpu: 1,
    memoryGB: 1,
    env: ['ai-agent'],
  },
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

const initialNodes: Node[] = [
  {
    id: 'blueprint',
    position: { x: 80, y: 240 },
    type: 'blueprint',
    data: {
      label: '蓝图生成器',
      description: '通过AI对话生成节点蓝图',
      onGenerate: (_blueprint: string) => {
        // Handle blueprint generation
      }
    },
  },
  {
    id: 'ingest',
    position: { x: 80, y: 120 },
    data: {
      label: 'ingest',
      status: (initialMeta['ingest'] as NodeMeta).status as Status,
      meta: initialMeta['ingest'] as NodeMeta,
    },
  },
  {
    id: 'clean',
    position: { x: 260, y: 120 },
    data: {
      label: 'clean',
      status: (initialMeta['clean'] as NodeMeta).status as Status,
      meta: initialMeta['clean'] as NodeMeta,
    },
  },
  {
    id: 'feature',
    position: { x: 440, y: 120 },
    data: {
      label: 'feature',
      status: (initialMeta['feature'] as NodeMeta).status as Status,
      meta: initialMeta['feature'] as NodeMeta,
    },
  },
  {
    id: 'train',
    position: { x: 620, y: 120 },
    data: {
      label: 'train',
      status: (initialMeta['train'] as NodeMeta).status as Status,
      meta: initialMeta['train'] as NodeMeta,
    },
  },
  {
    id: 'eval',
    position: { x: 800, y: 120 },
    data: {
      label: 'eval',
      status: (initialMeta['eval'] as NodeMeta).status as Status,
      meta: initialMeta['eval'] as NodeMeta,
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'ingest', target: 'clean' },
  { id: 'e2', source: 'clean', target: 'feature' },
  { id: 'e3', source: 'feature', target: 'train' },
  { id: 'e4', source: 'train', target: 'eval' },
];

function statusBadge(s: Status) {
  const t = STATUS_THEME[s];
  const statusIcons = {
    queued: '⏳',
    running: '⚡',
    success: '✅',
    failed: '❌',
    skipped: '⏭️',
    cached: '💾'
  };
  
  return (
    <span
      style={{
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
        padding: '4px 8px',
        borderRadius: 999,
        fontSize: '12px',
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        boxShadow: t.shadow,
        backdropFilter: 'blur(4px)',
      }}
    >
      <span style={{ fontSize: '10px' }}>{statusIcons[s]}</span>
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

// 工作流类型定义
interface Workflow {
  id: string;
  name: string;
  description: string;
  folder: string;
  status: string;
}

const WorkflowStudio: React.FC<{ currentWorkflow?: Workflow }> = ({ currentWorkflow }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selected, setSelected] = useState<string>('feature');
  const rf = useRef<ReactFlowInstance | null>(null);

  // 节点选中状态管理
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelected(node.id);
    
    // 添加选中动画效果
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === node.id) {
          // 选中的节点
          return {
            ...n,
            style: {
              ...n.style,
              transform: 'scale(1.05)',
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            },
          };
        } else {
          return {
            ...n,
            style: {
              ...n.style,
              transform: 'scale(1)',
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            },
          };
        }
      })
    );
    
    // 重置缩放
    setTimeout(() => {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          style: {
            ...n.style,
            transform: 'scale(1)',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        }))
      );
    }, 200);
  }, [setNodes]);

  const nodeTypes = useMemo(
    () => ({
      blueprint: BlueprintNode,
      default: ({ data }: any) => {
        const s: Status = data.status ?? 'queued';
        const theme = STATUS_THEME[s];
        
        // 节点类型对应的图标
        const nodeIcons = {
          blueprint: '🎯',
          ingest: '📥',
          clean: '🧹',
          feature: '⚙️',
          train: '🧠',
          eval: '📊'
        };
        
        const icon = nodeIcons[data.label as keyof typeof nodeIcons] || '📋';
        
        return (
          <div
            style={{
              position: 'relative',
              background: theme.bg,
              border: `2px solid ${theme.border}`,
              borderRadius: 16,
              padding: '16px',
              minWidth: 160,
              boxShadow: `0 8px 25px ${theme.shadow.replace('0.3)', '0.15)')}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(12px)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)';
              e.currentTarget.style.boxShadow = `0 12px 35px ${theme.shadow.replace('0.3)', '0.3)')}`;
              e.currentTarget.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = `0 8px 25px ${theme.shadow.replace('0.3)', '0.15)')}`;
              e.currentTarget.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px) scale(0.97)';
              e.currentTarget.style.transition = 'all 0.1s cubic-bezier(0.32, 0, 0.67, 0)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)';
              e.currentTarget.style.transition = 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
            }}
          >
            {/* 节点头部 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: `1px solid ${theme.border}40`,
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                flex: 1
              }}>
                <span style={{ 
                  fontSize: '16px',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
                  animation: s === 'running' ? 'glowPulse 2s ease-in-out infinite' : 'none',
                  display: 'inline-block',
                  transition: 'transform 0.2s ease'
                }}>
                  {icon}
                </span>
                <strong style={{ 
                  color: theme.color, 
                  fontSize: '15px',
                  fontWeight: 700,
                  letterSpacing: '0.025em',
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {data.label}
                </strong>
              </div>
              {statusBadge(s)}
            </div>
            
            {/* 进度指示器（针对运行状态的节点） */}
            {s === 'running' && (
              <div style={{
                height: '3px',
                background: `${theme.border}40`,
                borderRadius: '2px',
                marginBottom: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  background: `linear-gradient(90deg, ${theme.iconBg}, ${theme.color})`,
                  borderRadius: '2px',
                  width: '60%',
                  animation: 'progressPulse 2s ease-in-out infinite'
                }} />
              </div>
            )}
            
            {/* 性能指标 */}
            {data.meta && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                color: theme.color,
                opacity: 0.8
              }}>
                <span>⚡ {(data.meta as NodeMeta).cpu}核</span>
                <span>💾 {(data.meta as NodeMeta).memoryGB}GB</span>
                <span>⏱️ {(data.meta as NodeMeta).timeoutSec}s</span>
              </div>
            )}
            
            {/* 节点类型指示器 */}
            <div style={{
              position: 'absolute',
              top: '-4px',
              left: '-4px',
              width: '10px',
              height: '10px',
              background: `linear-gradient(135deg, ${theme.iconBg}, ${theme.color})`,
              borderRadius: '50%',
              border: `2px solid white`,
              boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2)'
            }} />
            
            {/* 状态光环效果 */}
            {s === 'running' && (
              <div style={{
                position: 'absolute',
                top: '-6px',
                left: '-6px',
                right: '-6px',
                bottom: '-6px',
                borderRadius: '20px',
                background: `linear-gradient(135deg, ${theme.iconBg}40, transparent 70%)`,
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                pointerEvents: 'none'
              }} />
            )}
            
            {/* 左侧作为目标（输入）、右侧作为源（输出） */}
            <Handle 
              type="target" 
              position={Position.Left} 
              style={{
                background: 'linear-gradient(135deg, #64748b, #475569)',
                border: '2px solid white',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2)',
                left: '-6px'
              }}
            />
            <Handle 
              type="source" 
              position={Position.Right} 
              style={{
                background: 'linear-gradient(135deg, #64748b, #475569)',
                border: '2px solid white',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2)',
                right: '-6px'
              }}
            />
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
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: '8px',
            height: '8px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: '50%',
            boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.3)'
          }} />
          <strong style={{ 
            fontSize: '16px', 
            fontWeight: 700,
            color: '#1e293b',
            letterSpacing: '0.025em'
          }}>
            工作流编排 Studio
          </strong>
          {currentWorkflow && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginLeft: 16,
              padding: '4px 8px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: 500 }}>
                {currentWorkflow.name}
              </span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                ({currentWorkflow.folder})
              </span>
            </div>
          )}
        </div>
        <span style={{ 
          color: '#64748b',
          fontSize: '14px',
          fontWeight: 500,
          background: '#f1f5f9',
          padding: '4px 8px',
          borderRadius: '6px',
          border: '1px solid #e2e8f0'
        }}>
          模拟
        </span>
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
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderBottom: '1px solid #e2e8f0',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              }}
            >
              <Button 
                onClick={() => rf.current?.fitView()}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  border: '1px solid #d1d5db',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                }}
              >
                适配
              </Button>
              <Button
                onClick={async () => {
                  const laid = await autoLayout(nodes, edges);
                  setNodes(laid.nodes);
                  setTimeout(() => rf.current?.fitView({ duration: 300 }), 0);
                }}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  border: '1px solid #d1d5db',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  borderRadius: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                }}
              >
                自动布局
              </Button>
              <Button 
                style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: 'white',
                  border: '1px solid #16a34a',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  borderRadius: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(34, 197, 94, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(34, 197, 94, 0.2)';
                }}
              >
                启动
              </Button>
              <Button 
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  border: '1px solid #d97706',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  borderRadius: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(245, 158, 11, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(245, 158, 11, 0.2)';
                }}
              >
                暂停
              </Button>
              <Button 
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: '1px solid #1d4ed8',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                }}
              >
                调试
              </Button>
              <Button 
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  border: '1px solid #7c3aed',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(139, 92, 246, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                }}
              >
                从 feature 重跑
              </Button>
            </div>
            {/* 画布 */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                onInit={(inst) => (rf.current = inst)}
                style={{
                  background: `linear-gradient(135deg, 
                    #f8fafc 0%, 
                    #f1f5f9 25%, 
                    #e2e8f0 50%, 
                    #cbd5e1 75%, 
                    #94a3b8 100%)`
                }}
                connectionLineStyle={{
                  stroke: '#64748b',
                  strokeWidth: 2,
                  strokeDasharray: '5,5'
                }}
                defaultEdgeOptions={{
                  style: {
                    stroke: '#94a3b8',
                    strokeWidth: 2,
                    strokeLinecap: 'round',
                  },
                  animated: true,
                  type: 'smoothstep',
                  markerEnd: {
                    type: 'arrowclosed',
                    width: 12,
                    height: 12,
                    color: '#64748b'
                  }
                }}
              >
                <Background 
                  color="#cbd5e1" 
                  gap={16} 
                  size={1}
                  style={{
                    backgroundImage: `
                      radial-gradient(circle at 1px 1px, rgba(203, 213, 225, 0.3) 1px, transparent 0)
                    `
                  }}
                />
                <MiniMap 
                  style={{
                    background: 'rgba(248, 250, 252, 0.9)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                  maskColor="rgba(241, 245, 249, 0.7)"
                  nodeColor={(node) => {
                    const status = (node.data as any)?.status ?? 'queued';
                    return STATUS_THEME[status].iconBg;
                  }}
                />
                <Controls 
                  style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    backdropFilter: 'blur(8px)'
                  }}
                />
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
          <div style={{ height: '100%', padding: '12px' }}>
            <Card 
              className="h-full"
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
              }}
            >
              <CardHeader 
                className="py-3"
                style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderBottom: '1px solid #e2e8f0',
                  borderRadius: '12px 12px 0 0'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <CardTitle
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8,
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#1e293b'
                    }}
                  >
                    <div style={{
                      width: '6px',
                      height: '6px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      borderRadius: '50%'
                    }} />
                    节点 Inspector：{selected}
                  </CardTitle>
                  <div
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8 
                    }}
                  >
                    <Badge 
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        color: 'white',
                        border: '1px solid #1d4ed8'
                      }}
                    >
                      typescript
                    </Badge>
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
                        <div style={{ marginTop: 12 }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 8
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>DSL 预览</div>
                            <Badge style={{
                              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                              color: 'white',
                              border: '1px solid #1d4ed8',
                              fontSize: 11,
                              fontWeight: 500
                            }}>双向联动</Badge>
                          </div>
                          <pre
                            style={{
                              fontSize: 12,
                              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                              color: '#e2e8f0',
                              borderRadius: 12,
                              padding: 16,
                              overflow: 'auto',
                              border: '1px solid #334155',
                              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)',
                              fontFamily: '"Monaco", "Menlo", "Consolas", "Liberation Mono", monospace',
                              lineHeight: '1.6',
                              letterSpacing: '0.025em',
                              tabSize: 2
                            }}
                          >
                            {JSON.stringify(dsl, null, 2)}
                          </pre>
                          <p style={{ fontSize: 12, color: '#64748b', marginTop: 8, lineHeight: '1.5' }}>
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
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          alignItems: 'center',
          background: 'rgba(241, 245, 249, 0.8)',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
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
        <div style={{ 
          color: '#64748b',
          background: 'rgba(241, 245, 249, 0.8)',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          fontSize: '14px',
          fontWeight: 500
        }}>
          当前节点：<strong style={{ color: '#1e293b' }}>{selected}</strong>
          <span style={{ marginLeft: 12 }}>语言：typescript，版本：v1</span>
        </div>
      </div>
    </div>
  );
};

export default WorkflowStudio;
