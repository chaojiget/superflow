import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import ReactFlow from 'reactflow';
import type { Dag, DagNode, DagEdge } from '../planner/blueprintToDag';
import { blueprintToDag } from '../planner/blueprintToDag';

export interface FlowInstance {
  nodes: DagNode[];
  edges: DagEdge[];
  dragNode: (id: string, position: { x: number; y: number }) => void;
  connect: (source: string, target: string) => string;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
}

export function renderFlow(
  blueprint: Parameters<typeof blueprintToDag>[0],
  container: HTMLElement,
  onChange?: (dag: Dag) => void
): FlowInstance {
  let { nodes, edges } = blueprintToDag(blueprint);
  const root: Root = createRoot(container);

  const render = () => {
    root.render(<ReactFlow nodes={nodes} edges={edges} />);
  };

  const emit = () => {
    onChange?.({ nodes, edges });
  };

  const instance: FlowInstance = {
    get nodes() {
      return nodes;
    },
    get edges() {
      return edges;
    },
    dragNode(id, position) {
      const node = nodes.find((n) => n.id === id);
      if (node) {
        node.position = position;
        render();
        emit();
      }
    },
    connect(source, target) {
      const id = `${source}-${target}-${Date.now()}`;
      const edge = { id, source, target };
      edges = [...edges, edge];
      render();
      emit();
      return id;
    },
    deleteNode(id) {
      nodes = nodes.filter((n) => n.id !== id);
      edges = edges.filter((e) => e.source !== id && e.target !== id);
      render();
      emit();
    },
    deleteEdge(id) {
      edges = edges.filter((e) => e.id !== id);
      render();
      emit();
    },
  };

  render();
  emit();

  return instance;
}

export default renderFlow;
