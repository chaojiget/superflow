import { describe, expect, it, vi } from 'vitest';

vi.mock('../renderFlow', () => ({
  renderFlow: vi.fn(
    (
      _bp: unknown,
      _container: HTMLElement,
      onChange?: (dag: { nodes: any[]; edges: any[] }) => void
    ) => {
      let flow = {
        nodes: [{ id: 'n1', data: { label: '' }, position: { x: 0, y: 0 } }],
        edges: [] as { id: string; source: string; target: string }[],
        dragNode(id: string, position: { x: number; y: number }) {
          const node = flow.nodes.find((n) => n.id === id);
          if (node) {
            node.position = position;
            onChange?.({ nodes: flow.nodes, edges: flow.edges });
          }
        },
        connect(source: string, target: string) {
          const id = `${source}-${target}`;
          flow.edges.push({ id, source, target });
          onChange?.({ nodes: flow.nodes, edges: flow.edges });
          return id;
        },
        deleteNode(id: string) {
          flow.nodes = flow.nodes.filter((n) => n.id !== id);
          flow.edges = flow.edges.filter(
            (e) => e.source !== id && e.target !== id
          );
          onChange?.({ nodes: flow.nodes, edges: flow.edges });
        },
        deleteEdge(id: string) {
          flow.edges = flow.edges.filter((e) => e.id !== id);
          onChange?.({ nodes: flow.nodes, edges: flow.edges });
        },
      };
      onChange?.({ nodes: flow.nodes, edges: flow.edges });
      return flow;
    }
  ),
}));

import { FlowCanvasElement } from '../FlowCanvas';
import { renderFlow } from '../renderFlow';

describe('FlowCanvasElement', () => {
  it('renders blueprint and支持交互', () => {
    const el = new FlowCanvasElement();
    document.body.appendChild(el);
    el.blueprint = { a: 1 } as any;
    expect(renderFlow).toHaveBeenCalled();

    const nodeId = el.dag!.nodes[0].id;
    el.dragNode(nodeId, { x: 10, y: 20 });
    expect(el.dag!.nodes[0].position).toEqual({ x: 10, y: 20 });

    const edgeId = el.connect(nodeId, 'temp')!;
    expect(el.dag!.edges.find((e) => e.id === edgeId)).toBeTruthy();

    el.deleteEdge(edgeId);
    expect(el.dag!.edges.find((e) => e.id === edgeId)).toBeUndefined();

    el.deleteNode(nodeId);
    expect(el.dag!.nodes.find((n) => n.id === nodeId)).toBeUndefined();
  });

  it.each(['dark', 'light'])(
    '设置 theme="%s" 时 container 的 data-theme 更新',
    (theme) => {
      const el = new FlowCanvasElement();
      document.body.appendChild(el);
      const container = el.shadowRoot!.querySelector('div')!;
      el.setAttribute('theme', theme);
      expect(container.getAttribute('data-theme')).toBe(theme);
    }
  );

  it('正确解析 readonly 布尔属性', () => {
    const el = new FlowCanvasElement();
    document.body.appendChild(el);
    expect(el.readonly).toBe(false);
    const desc = Object.getOwnPropertyDescriptor(
      FlowCanvasElement.prototype,
      'readonly'
    )!;
    Object.defineProperty(el, 'readonly', {
      get: desc.get!,
      set(v: boolean) {
        (el as any)._readonly = v;
      },
    });
    el.setAttribute('readonly', '');
    expect(el.readonly).toBe(true);
    el.removeAttribute('readonly');
    expect(el.readonly).toBe(false);
    el.setAttribute('readonly', 'false');
    expect(el.readonly).toBe(false);
  });

  it('字符串 blueprint 属性能被解析为对象', () => {
    vi.clearAllMocks();
    const el = new FlowCanvasElement();
    document.body.appendChild(el);
    const bp = { a: 1 };
    el.setAttribute('blueprint', JSON.stringify(bp));
    expect(el.blueprint).toEqual(bp);
    expect(renderFlow).toHaveBeenCalled();
  });
});
