import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('用户工作流 E2E 测试', () => {
  let app: any
  let server: any

  beforeAll(async () => {
    // 启动测试服务器
    const { startTestServer } = await import('../helpers/test-server')
    const { createTestApp } = await import('../helpers/test-app')
    
    server = await startTestServer()
    app = await createTestApp()
  })

  afterAll(async () => {
    await server?.close()
    await app?.cleanup()
  })

  it('完整的用户工作流：从想法到执行', async () => {
    // 1. 用户进入想法页面
    await app.navigate('/ideas')
    expect(await app.getCurrentPath()).toBe('/ideas')

    // 2. 输入想法
    const ideaText = '创建一个用户登录验证流程'
    await app.fillInput('[data-testid="idea-input"]', ideaText)
    await app.click('[data-testid="generate-blueprint"]')

    // 3. 等待蓝图生成
    await app.waitForElement('[data-testid="blueprint-result"]')
    const blueprint = await app.getBlueprint()
    expect(blueprint.nodes.length).toBeGreaterThan(0)

    // 4. 进入规划器
    await app.click('[data-testid="go-to-planner"]')
    expect(await app.getCurrentPath()).toBe('/planner')

    // 5. 生成执行计划
    await app.click('[data-testid="generate-dag"]')
    await app.waitForElement('[data-testid="dag-result"]')

    const dag = await app.getDAG()
    expect(dag.executionOrder).toBeDefined()

    // 6. 进入流程画布
    await app.click('[data-testid="go-to-flow"]')
    expect(await app.getCurrentPath()).toBe('/flow')

    // 7. 验证节点已加载
    await app.waitForElement('[data-testid="flow-canvas"]')
    const nodes = await app.getFlowNodes()
    expect(nodes.length).toEqual(blueprint.nodes.length)

    // 8. 执行流程
    await app.click('[data-testid="execute-flow"]')
    await app.waitForElement('[data-testid="execution-complete"]')

    const result = await app.getExecutionResult()
    expect(result.status).toBe('completed')

    // 9. 查看运行中心
    await app.click('[data-testid="go-to-run-center"]')
    expect(await app.getCurrentPath()).toBe('/run-center')

    await app.waitForElement('[data-testid="run-history"]')
    const runs = await app.getRunHistory()
    expect(runs.length).toBeGreaterThan(0)

    // 10. 查看日志
    await app.click('[data-testid="view-logs"]')
    await app.waitForElement('[data-testid="log-entries"]')
    
    const logs = await app.getLogs()
    expect(logs.length).toBeGreaterThan(0)
    expect(logs.some(log => log.event === 'flow_started')).toBe(true)
    expect(logs.some(log => log.event === 'flow_completed')).toBe(true)
  })

  it('节点调试工作流', async () => {
    // 1. 进入节点页面
    await app.navigate('/nodes')
    expect(await app.getCurrentPath()).toBe('/nodes')

    // 2. 创建新节点
    await app.click('[data-testid="create-node"]')
    await app.fillInput('[data-testid="node-name"]', '测试节点')
    await app.select('[data-testid="node-type"]', 'transform')
    
    // 3. 编写节点代码
    const nodeCode = `
      export async function handler(input, ctx) {
        const { logger } = ctx;
        logger.info({ event: 'node_started', data: { input } });
        
        const result = input.toUpperCase();
        
        logger.info({ event: 'node_completed', data: { result } });
        return result;
      }
    `
    await app.fillCodeEditor('[data-testid="node-code"]', nodeCode)

    // 4. 保存节点
    await app.click('[data-testid="save-node"]')
    await app.waitForElement('[data-testid="save-success"]')

    // 5. 调试节点
    await app.click('[data-testid="debug-node"]')
    await app.fillInput('[data-testid="debug-input"]', 'hello world')
    await app.click('[data-testid="run-debug"]')

    // 6. 验证调试结果
    await app.waitForElement('[data-testid="debug-result"]')
    const debugResult = await app.getDebugResult()
    expect(debugResult.output).toBe('HELLO WORLD')
    expect(debugResult.logs.length).toBeGreaterThan(0)

    // 7. 查看性能指标
    const metrics = await app.getDebugMetrics()
    expect(metrics.executionTime).toBeGreaterThan(0)
    expect(metrics.memoryUsage).toBeGreaterThan(0)
  })

  it('协作工作流：多用户编辑', async () => {
    // 模拟多用户场景
    const user1 = await app.createUser('user1')
    const user2 = await app.createUser('user2')

    // 用户1创建流程
    await user1.navigate('/flow')
    await user1.createFlow('协作测试流程')
    
    const flowId = await user1.getCurrentFlowId()
    
    // 用户1添加节点
    await user1.addNode({
      type: 'input',
      position: { x: 100, y: 100 },
      data: { name: 'Start' }
    })

    // 用户2加入协作
    await user2.navigate(`/flow/${flowId}`)
    await user2.waitForFlowLoad()

    // 验证用户2能看到用户1的更改
    const nodesUser2 = await user2.getFlowNodes()
    expect(nodesUser2.length).toBe(1)
    expect(nodesUser2[0].data.name).toBe('Start')

    // 用户2添加节点
    await user2.addNode({
      type: 'process',
      position: { x: 300, y: 100 },
      data: { name: 'Process' }
    })

    // 验证用户1能看到用户2的更改
    await user1.waitForFlowUpdate()
    const nodesUser1 = await user1.getFlowNodes()
    expect(nodesUser1.length).toBe(2)

    // 用户1连接节点
    await user1.connectNodes('Start', 'Process')

    // 验证连接对用户2可见
    await user2.waitForFlowUpdate()
    const edgesUser2 = await user2.getFlowEdges()
    expect(edgesUser2.length).toBe(1)

    // 执行协作创建的流程
    await user1.executeFlow()
    await user1.waitForExecutionComplete()

    const result = await user1.getExecutionResult()
    expect(result.status).toBe('completed')

    // 验证执行历史对两个用户都可见
    await user2.navigate('/run-center')
    const runs = await user2.getRunHistory()
    expect(runs.some(run => run.flowId === flowId)).toBe(true)
  })

  it('错误处理和恢复工作流', async () => {
    // 1. 创建包含错误节点的流程
    await app.navigate('/flow')
    await app.createFlow('错误测试流程')

    await app.addNode({
      type: 'input',
      data: { value: 'test input' }
    })

    await app.addNode({
      type: 'error',
      data: {
        handler: 'throw new Error("Intentional error")'
      }
    })

    await app.addNode({
      type: 'output',
      data: {}
    })

    await app.connectNodes('input', 'error')
    await app.connectNodes('error', 'output')

    // 2. 执行流程并处理错误
    await app.executeFlow()
    await app.waitForExecutionFailure()

    const result = await app.getExecutionResult()
    expect(result.status).toBe('failed')
    expect(result.error).toBeDefined()

    // 3. 查看错误日志
    await app.click('[data-testid="view-error-logs"]')
    const errorLogs = await app.getErrorLogs()
    expect(errorLogs.length).toBeGreaterThan(0)
    expect(errorLogs[0].level).toBe('error')

    // 4. 修复错误节点
    await app.click('[data-testid="edit-error-node"]')
    await app.fillCodeEditor('[data-testid="node-code"]', `
      export async function handler(input, ctx) {
        return input + " processed";
      }
    `)
    await app.click('[data-testid="save-node"]')

    // 5. 重新执行
    await app.click('[data-testid="retry-execution"]')
    await app.waitForExecutionComplete()

    const retryResult = await app.getExecutionResult()
    expect(retryResult.status).toBe('completed')

    // 6. 验证修复后的输出
    expect(retryResult.outputs.output).toBe('test input processed')
  })

  it('性能监控工作流', async () => {
    // 1. 创建包含多个节点的复杂流程
    await app.navigate('/flow')
    await app.createFlow('性能测试流程')

    // 添加多个处理节点
    for (let i = 0; i < 10; i++) {
      await app.addNode({
        type: 'process',
        data: {
          delay: Math.random() * 100,
          iteration: i
        }
      })
    }

    // 创建复杂的连接
    await app.createComplexFlow()

    // 2. 执行流程并监控性能
    const startTime = Date.now()
    await app.executeFlow()
    await app.waitForExecutionComplete()
    const endTime = Date.now()

    // 3. 查看性能指标
    await app.navigate('/run-center')
    const metrics = await app.getPerformanceMetrics()

    expect(metrics.totalExecutionTime).toBeGreaterThan(0)
    expect(metrics.nodeExecutionTimes).toHaveLength(10)
    expect(metrics.parallelEfficiency).toBeGreaterThan(0)

    // 4. 验证内存使用
    expect(metrics.memoryUsage.peak).toBeGreaterThan(0)
    expect(metrics.memoryUsage.average).toBeGreaterThan(0)

    // 5. 检查性能警告
    const warnings = await app.getPerformanceWarnings()
    if (warnings.length > 0) {
      expect(warnings.every(w => w.type === 'performance')).toBe(true)
    }
  })
})