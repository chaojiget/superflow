/**
 * 数学工具函数
 */

/**
 * 将数值限制在指定范围内
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 线性插值
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * 将数值从一个范围映射到另一个范围
 */
export function map(
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number
): number {
  const t = (value - fromMin) / (fromMax - fromMin);
  return lerp(toMin, toMax, t);
}

/**
 * 计算两点间距离
 */
export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 计算角度（弧度）
 */
export function angle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * 弧度转角度
 */
export function radToDeg(rad: number): number {
  return rad * (180 / Math.PI);
}

/**
 * 角度转弧度
 */
export function degToRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * 生成随机数
 */
export function random(min: number = 0, max: number = 1): number {
  return min + Math.random() * (max - min);
}

/**
 * 生成随机整数
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max + 1));
}

/**
 * 四舍五入到指定小数位
 */
export function round(value: number, decimals: number = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * 检查数值是否在范围内
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * 计算平均值
 */
export function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

/**
 * 计算中位数
 */
export function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

/**
 * 计算标准差
 */
export function standardDeviation(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  const avg = average(numbers);
  const squaredDiffs = numbers.map((num) => Math.pow(num - avg, 2));
  const avgSquaredDiff = average(squaredDiffs);

  return Math.sqrt(avgSquaredDiff);
}

/**
 * 计算百分位数
 */
export function percentile(numbers: number[], p: number): number {
  if (numbers.length === 0) return 0;

  const sorted = [...numbers].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);

  if (Math.floor(index) === index) {
    return sorted[index];
  } else {
    const lower = sorted[Math.floor(index)];
    const upper = sorted[Math.ceil(index)];
    return lerp(lower, upper, index - Math.floor(index));
  }
}
