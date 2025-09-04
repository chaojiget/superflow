import { describe, it, expect } from 'vitest';
import { clamp, lerp, distance } from '../src/math';

describe('math 工具函数', () => {
  describe('clamp', () => {
    it('在范围内返回原值', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('小于最小值时返回最小值', () => {
      expect(clamp(-1, 0, 10)).toBe(0);
    });

    it('大于最大值时返回最大值', () => {
      expect(clamp(11, 0, 10)).toBe(10);
    });
  });

  describe('lerp', () => {
    it('t=0 返回起始值', () => {
      expect(lerp(0, 10, 0)).toBe(0);
    });

    it('t=1 返回结束值', () => {
      expect(lerp(0, 10, 1)).toBe(10);
    });

    it('t=0.5 返回中间值', () => {
      expect(lerp(0, 10, 0.5)).toBe(5);
    });
  });

  describe('distance', () => {
    it('计算两点间距离', () => {
      expect(distance(0, 0, 3, 4)).toBe(5);
    });

    it('相同点距离为 0', () => {
      expect(distance(1, 1, 1, 1)).toBe(0);
    });
  });
});
