import { describe, it, expect } from 'vitest'

describe('Example Test Suite', () => {
  it('should pass basic math test', () => {
    expect(2 + 2).toBe(4)
  })

  it('should handle string operations', () => {
    const message = 'Hello World'
    expect(message).toContain('World')
    expect(message.length).toBe(11)
  })

  it('should work with arrays', () => {
    const items = [1, 2, 3, 4, 5]
    expect(items).toHaveLength(5)
    expect(items).toContain(3)
  })
})