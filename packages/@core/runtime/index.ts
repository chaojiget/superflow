import Ajv, { AnySchema } from 'ajv';

export function createExecutor(schemas: {
  input: AnySchema;
  output: AnySchema;
}) {
  const ajv = new Ajv();
  const validateInput = ajv.compile(schemas.input);
  const validateOutput = ajv.compile(schemas.output);

  return async function run(
    handler: (input: unknown) => Promise<unknown> | unknown,
    input: unknown
  ): Promise<unknown> {
    if (!validateInput(input)) {
      throw new Error(ajv.errorsText(validateInput.errors));
    }
    const result = await handler(input);
    if (!validateOutput(result)) {
      throw new Error(ajv.errorsText(validateOutput.errors));
    }
    return result;
  };
}
