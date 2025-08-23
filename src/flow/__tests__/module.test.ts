import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FlowCanvas } from '../FlowCanvas'
import { renderFlow } from '../renderFlow'

// Mock React Flow
vi.mock('reactflow', () => ({
  ReactFlow: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-flow">{children}</div>
  ),
  Controls: () => <div data-testid="flow-controls" />,
  Background: () => <div data-testid="flow-background" />,
  MiniMap: () => <div data-testid="flow-minimap" />
}))

describe('Flow Module', () => {
  describe('FlowCanvas', () => {
    it('应该渲染流程画布', () => {
      const mockNodes = [
        { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } }
      ]
      const mockEdges = [
        { id: 'e1-2', source: '1', target: '2' }
      ]

      const canvas = new FlowCanvas()
      expect(canvas).toBeInstanceOf(FlowCanvas)
    })

    it('应该处理节点操作', () => {
      const canvas = new FlowCanvas()
      expect(typeof canvas.addNode).toBe('function')
      expect(typeof canvas.deleteNode).toBe('function')
      expect(typeof canvas.updateNode).toBe('function')
    })

    it('应该处理边操作', () => {
      const canvas = new FlowCanvas()
      expect(typeof canvas.addEdge).toBe('function')
      expect(typeof canvas.deleteEdge).toBe('function')
    })
  })

  describe('renderFlow', () => {
    it('应该渲染流程组件', () => {
      const nodes = [
        { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } }
      ]
      const edges = [
        { id: 'e1-2', source: '1', target: '2' }
      ]

      render(renderFlow(nodes, edges))
      
      expect(screen.getByTestId('react-flow')).toBeInTheDocument()
      expect(screen.getByTestId('flow-controls')).toBeInTheDocument()
      expect(screen.getByTestId('flow-background')).toBeInTheDocument()
    })

    it('应该处理空节点数组', () => {
      const result = render(renderFlow([], []))
      expect(screen.getByTestId('react-flow')).toBeInTheDocument()
    })
  })
})