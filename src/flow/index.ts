import { loadFlow, saveFlow } from '../shared/storage';

export { FlowCanvasElement } from './FlowCanvas';

export interface FlowData {
  [key: string]: unknown;
}

export class Flow {
  data: FlowData;

  constructor() {
    this.data = loadFlow<FlowData>() ?? {};
  }

  update(data: FlowData): void {
    this.data = data;
    saveFlow(this.data);
  }
}
