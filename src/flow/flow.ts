export interface DAG {
  nodes: Record<string, (input: any) => any>;
  edges: Array<{ from: string; to: string }>;
}

export class Flow {
  private graph?: DAG;

  constructor(private host: HTMLElement) {}

  load(graph: DAG) {
    this.graph = graph;
    this.host.innerHTML = `<pre>${JSON.stringify(graph, null, 2)}</pre>`;
  }

  /** 从指定节点开始按连线运行子图 */
  runSubgraph(start: string, input: any): any {
    if (!this.graph) return undefined;
    let current = start;
    let value = this.graph.nodes[current](input);
    while (true) {
      const edge = this.graph.edges.find((e) => e.from === current);
      if (!edge) break;
      current = edge.to;
      value = this.graph.nodes[current](value);
    }
    return value;
  }
}
