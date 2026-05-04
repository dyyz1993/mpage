import type { Options } from 'tsup';
import { defineConfig } from 'tsup';

const noDts = !!process.env.NO_DTS;

type SingleOrArray = Options | Options[];

function withNoDts(config: SingleOrArray): SingleOrArray {
  if (Array.isArray(config)) {
    return config.map((c) => ({ ...c, dts: noDts ? false : c.dts }));
  }
  return { ...config, dts: noDts ? false : config.dts };
}

export function createConfig(config: SingleOrArray) {
  return defineConfig(withNoDts(config) as Parameters<typeof defineConfig>[0]);
}
