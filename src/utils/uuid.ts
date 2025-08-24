/**
 * UUID 和唯一ID工具函数
 */

import { ulid } from 'ulid';

/**
 * 生成 ULID
 */
export function generateULID(): string {
  return ulid();
}

/**
 * 生成短ID（8位随机字符串）
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * 生成纳米ID（21位字符串）
 */
export function generateNanoId(size: number = 21): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let id = '';
  
  for (let i = 0; i < size; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  
  return id;
}

/**
 * 验证ULID格式
 */
export function isValidULID(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  // ULID 格式: 26字符，使用 Crockford's Base32
  const ulidPattern = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;
  return ulidPattern.test(id);
}

/**
 * 从ULID提取时间戳
 */
export function getTimestampFromULID(ulid: string): number {
  if (!isValidULID(ulid)) {
    throw new Error('Invalid ULID format');
  }
  
  // ULID的前10个字符是时间戳部分
  const timeComponent = ulid.substring(0, 10);
  
  // Crockford's Base32解码
  const base32Chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let timestamp = 0;
  
  for (let i = 0; i < timeComponent.length; i++) {
    const char = timeComponent[i];
    const value = base32Chars.indexOf(char);
    if (value === -1) {
      throw new Error('Invalid ULID character');
    }
    timestamp = timestamp * 32 + value;
  }
  
  return timestamp;
}

/**
 * 比较两个ULID的时间顺序
 */
export function compareULIDTime(ulid1: string, ulid2: string): number {
  const time1 = getTimestampFromULID(ulid1);
  const time2 = getTimestampFromULID(ulid2);
  return time1 - time2;
}

/**
 * 生成带前缀的ID
 */
export function generatePrefixedId(prefix: string): string {
  return `${prefix}_${generateULID()}`;
}

/**
 * 解析带前缀的ID
 */
export function parsePrefixedId(prefixedId: string): { prefix: string; id: string } {
  const parts = prefixedId.split('_');
  if (parts.length < 2) {
    throw new Error('Invalid prefixed ID format');
  }
  
  return {
    prefix: parts[0],
    id: parts.slice(1).join('_')
  };
}

/**
 * 生成基于时间的排序ID
 */
export function generateSortableId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return `${timestamp.toString(36)}_${random}`;
}

/**
 * 生成UUID v4 (仅在浏览器环境下)
 */
export function generateUUIDv4(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 验证UUID v4格式
 */
export function isValidUUIDv4(uuid: string): boolean {
  const uuidv4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidv4Pattern.test(uuid);
}

/**
 * 批量生成ID
 */
export function generateIds(count: number, generator: () => string = generateULID): string[] {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    ids.push(generator());
  }
  return ids;
}

/**
 * 确保ID唯一性
 */
export function ensureUniqueId(existingIds: Set<string>, generator: () => string = generateULID): string {
  let id = generator();
  while (existingIds.has(id)) {
    id = generator();
  }
  return id;
}