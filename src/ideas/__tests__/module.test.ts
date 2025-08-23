import { describe, it, expect } from 'vitest'
import { generateBlueprint } from '../generateBlueprint'
import { IdeasPage } from '../IdeasPage'

describe('Ideas Module', () => {
  describe('generateBlueprint', () => {
    it('应该从想法生成结构化蓝图', async () => {
      const idea = '创建一个用户注册流程'
      const blueprint = await generateBlueprint(idea)
      
      expect(blueprint).toBeDefined()
      expect(blueprint.nodes).toBeInstanceOf(Array)
      expect(blueprint.nodes.length).toBeGreaterThan(0)
    })

    it('应该为复杂想法生成多节点蓝图', async () => {
      const complexIdea = '创建一个包含用户注册、邮件验证、密码重置的完整认证系统'
      const blueprint = await generateBlueprint(complexIdea)
      
      expect(blueprint.nodes.length).toBeGreaterThan(2)
      expect(blueprint.edges).toBeInstanceOf(Array)
    })

    it('应该处理空输入', async () => {
      await expect(generateBlueprint('')).rejects.toThrow()
    })
  })

  describe('IdeasPage', () => {
    it('应该创建想法页面实例', () => {
      const page = new IdeasPage()
      expect(page).toBeInstanceOf(IdeasPage)
    })

    it('应该有必要的方法', () => {
      const page = new IdeasPage()
      expect(typeof page.render).toBe('function')
      expect(typeof page.handleSubmit).toBe('function')
    })
  })
})