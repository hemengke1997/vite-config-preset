export enum Env {
  development = 'development',
  test = 'test',
  production = 'production',
}

export function getEnv(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.MODE
  } else if (typeof process !== 'undefined' && process.env.NODE_ENV) {
    return process.env.NODE_ENV
  } else {
    return Env.production
  }
}

export function isDev(): boolean {
  return getEnv() === Env.development
}

export function isTest(): boolean {
  return getEnv() === Env.test
}

export function isProd(): boolean {
  return getEnv() === Env.production
}
