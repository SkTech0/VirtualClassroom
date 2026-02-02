/**
 * Browser polyfill for Node's "util" module (used by readable-stream/simple-peer).
 * Prevents "Module util has been externalized" and "util.debuglog/util.inspect" errors.
 */
function noop(): (...args: unknown[]) => void {
  return () => {};
}
export function debuglog(_key: string): (...args: unknown[]) => void {
  return noop();
}
export function inspect(obj: unknown): string {
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (typeof obj === 'object' && obj !== null && typeof (obj as { inspect?: () => string }).inspect === 'function') {
    return (obj as { inspect(): string }).inspect();
  }
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}
export default { debuglog, inspect };
