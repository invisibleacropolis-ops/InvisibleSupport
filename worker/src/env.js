/**
 * @fileoverview Reads named secrets/vars from the Worker env.
 * Centralizes the `env.X || ''` pattern and the throw-on-missing helper.
 */

export function requiredSecret(env, name) {
  const value = env[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required secret: ${name}`);
  }
  return value;
}

export function allowedOrigin(env) {
  return (env.ALLOWED_ORIGIN || '').trim();
}
