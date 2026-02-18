/**
 * Utility for handling fatal errors with exhaustive type checking
 */

export function assertNever(x: never, message?: string): never {
  throw new Error(message || `Unexpected object: ${x}`);
}
