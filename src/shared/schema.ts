import Ajv, { ValidateFunction, ErrorObject } from 'ajv';

// 全局 Ajv 实例和简单的 Schema 管理
const ajv = new Ajv({ allErrors: true, strict: false });
const validatorCache = new WeakMap<object, ValidateFunction>();

/**
 * 校验数据与给定的 JSON Schema 是否匹配
 */
export function validateSchema(
  schema: object,
  data: unknown
): { valid: boolean; errors: ErrorObject[] } {
  let validate = validatorCache.get(schema);
  if (!validate) {
    validate = ajv.compile(schema);
    validatorCache.set(schema, validate);
  }
  const valid = validate(data) as boolean;
  return { valid, errors: valid ? [] : validate.errors || [] };
}

/**
 * 向 Ajv 注册一个命名 Schema
 */
export function addSchema(id: string, schema: object): void {
  ajv.addSchema(schema, id);
}

/**
 * 获取已编译的 Schema 校验函数
 */
export function getSchema(id: string): ValidateFunction | undefined {
  return ajv.getSchema(id);
}

export { ajv };
