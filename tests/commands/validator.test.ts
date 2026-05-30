import { describe, it, expect } from 'vitest';
import {
  validateCommandParams,
  extractParamSchema,
  ParamValidationError,
} from '../../src/commands/validator.js';

describe('validateCommandParams', () => {
  it('should pass valid params for goto', () => {
    const result = validateCommandParams('goto', {
      url: 'https://example.com',
      waitUntil: 'load',
    });
    expect(result.url).toBe('https://example.com');
    expect(result.waitUntil).toBe('load');
  });

  it('should pass valid params for click with optional fields omitted', () => {
    const result = validateCommandParams('click', { selector: '#btn' });
    expect(result.selector).toBe('#btn');
  });

  it('should reject missing required param', () => {
    expect(() => validateCommandParams('goto', {})).toThrow(ParamValidationError);
  });

  it('should include command name in error', () => {
    try {
      validateCommandParams('goto', {});
    } catch (e) {
      expect(e).toBeInstanceOf(ParamValidationError);
      expect((e as ParamValidationError).command).toBe('goto');
    }
  });

  it('should include field path in error message', () => {
    try {
      validateCommandParams('goto', {});
    } catch (e) {
      expect((e as Error).message).toContain('url');
    }
  });

  it('should reject invalid enum value for waitUntil', () => {
    expect(() =>
      validateCommandParams('goto', { url: 'https://example.com', waitUntil: 'invalid' })
    ).toThrow(ParamValidationError);
  });

  it('should reject invalid enum value for click.button', () => {
    expect(() => validateCommandParams('click', { selector: '#btn', button: 'top' })).toThrow(
      ParamValidationError
    );
  });

  it('should reject invalid enum for waitForSelector.state', () => {
    expect(() =>
      validateCommandParams('waitForSelector', {
        selector: '.item',
        state: 'nowhere',
      })
    ).toThrow(ParamValidationError);
  });

  it('should accept valid enum for waitForSelector.state', () => {
    for (const state of ['attached', 'detached', 'visible', 'hidden'] as const) {
      const result = validateCommandParams('waitForSelector', {
        selector: '.item',
        state,
      });
      expect(result.state).toBe(state);
    }
  });

  it('should accept valid enum for mouse.action', () => {
    for (const action of ['move', 'down', 'up', 'click', 'dblclick'] as const) {
      const result = validateCommandParams('mouse', { action });
      expect(result.action).toBe(action);
    }
  });

  it('should reject invalid enum for mouse.action', () => {
    expect(() => validateCommandParams('mouse', { action: 'scroll' })).toThrow(
      ParamValidationError
    );
  });

  it('should reject wrong type for number field', () => {
    expect(() => validateCommandParams('click', { selector: '#btn', timeout: 'abc' })).toThrow(
      ParamValidationError
    );
  });

  it('should reject wrong type for boolean field', () => {
    expect(() => validateCommandParams('click', { selector: '#btn', force: 'yes' })).toThrow(
      ParamValidationError
    );
  });

  it('should pass valid screenshot params', () => {
    const result = validateCommandParams('screenshot', {
      path: '/tmp/shot.png',
      fullPage: true,
      type: 'png',
    });
    expect(result.path).toBe('/tmp/shot.png');
    expect(result.fullPage).toBe(true);
  });

  it('should reject invalid screenshot type enum', () => {
    expect(() => validateCommandParams('screenshot', { type: 'gif' })).toThrow(
      ParamValidationError
    );
  });

  it('should accept valid sameSite enum for setCookie', () => {
    for (const val of ['Strict', 'Lax', 'None'] as const) {
      const result = validateCommandParams('setCookie', {
        name: 'test',
        value: 'val',
        sameSite: val,
      });
      expect(result.sameSite).toBe(val);
    }
  });

  it('should reject invalid sameSite enum', () => {
    expect(() =>
      validateCommandParams('setCookie', {
        name: 'test',
        value: 'val',
        sameSite: 'Invalid',
      })
    ).toThrow(ParamValidationError);
  });

  it('should pass fill with required fields', () => {
    const result = validateCommandParams('fill', {
      selector: '#input',
      value: 'hello',
    });
    expect(result.selector).toBe('#input');
    expect(result.value).toBe('hello');
  });

  it('should pass commands with empty schema like getCookies', () => {
    const result = validateCommandParams('getCookies', {});
    expect(result).toEqual({});
  });

  it('should pass evaluate with expression', () => {
    const result = validateCommandParams('evaluate', { expression: '1+1' });
    expect(result.expression).toBe('1+1');
  });

  it('should return raw params for unknown command without schema', () => {
    const result = validateCommandParams('nonexistent', { foo: 'bar' });
    expect(result).toEqual({ foo: 'bar' });
  });

  it('should validate hover with array enum modifiers', () => {
    const result = validateCommandParams('hover', {
      selector: '#el',
      modifiers: ['Alt', 'Control'],
    });
    expect(result.modifiers).toEqual(['Alt', 'Control']);
  });

  it('should reject invalid modifier in array', () => {
    expect(() =>
      validateCommandParams('hover', {
        selector: '#el',
        modifiers: ['Alt', 'InvalidKey'],
      })
    ).toThrow(ParamValidationError);
  });

  it('should validate a11y format enum', () => {
    const yaml = validateCommandParams('a11y', { format: 'yaml' });
    expect(yaml.format).toBe('yaml');
    const json = validateCommandParams('a11y', { format: 'json' });
    expect(json.format).toBe('json');
  });

  it('should reject invalid a11y format', () => {
    expect(() => validateCommandParams('a11y', { format: 'xml' })).toThrow(ParamValidationError);
  });

  it('should validate setViewport', () => {
    const result = validateCommandParams('setViewport', { width: 1920, height: 1080 });
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
  });

  it('should validate frame command', () => {
    const result = validateCommandParams('frame', { index: 0 });
    expect(result.index).toBe(0);
  });

  it('should validate structure command with optional fields', () => {
    const result = validateCommandParams('structure', {});
    expect(result).toBeDefined();
  });

  it('should validate wait state enum', () => {
    for (const state of ['load', 'domcontentloaded', 'networkidle'] as const) {
      const result = validateCommandParams('wait', { state });
      expect(result.state).toBe(state);
    }
  });

  it('should reject invalid wait state', () => {
    expect(() => validateCommandParams('wait', { state: 'idle' })).toThrow(ParamValidationError);
  });
});

describe('extractParamSchema', () => {
  it('should extract goto schema fields', () => {
    const schema = extractParamSchema('goto');
    expect(schema).not.toBeNull();
    expect(schema!.fields.url).toBeDefined();
    expect(schema!.fields.url.type).toBe('string');
    expect(schema!.fields.url.required).toBe(true);
  });

  it('should extract enum field from goto.waitUntil', () => {
    const schema = extractParamSchema('goto');
    expect(schema!.fields.waitUntil).toBeDefined();
    expect(schema!.fields.waitUntil.type).toBe('enum');
    expect(schema!.fields.waitUntil.enumValues).toEqual([
      'load',
      'domcontentloaded',
      'networkidle',
      'commit',
    ]);
    expect(schema!.fields.waitUntil.required).toBe(false);
  });

  it('should extract optional number field', () => {
    const schema = extractParamSchema('goto');
    expect(schema!.fields.timeout.type).toBe('number');
    expect(schema!.fields.timeout.required).toBe(false);
  });

  it('should extract click schema with all fields', () => {
    const schema = extractParamSchema('click');
    expect(schema!.fields.selector.type).toBe('string');
    expect(schema!.fields.selector.required).toBe(true);
    expect(schema!.fields.button.type).toBe('enum');
    expect(schema!.fields.button.enumValues).toEqual(['left', 'right', 'middle']);
    expect(schema!.fields.force.type).toBe('boolean');
    expect(schema!.fields.force.required).toBe(false);
  });

  it('should extract hover with array enum modifiers', () => {
    const schema = extractParamSchema('hover');
    expect(schema!.fields.modifiers.type).toBe('array');
    expect(schema!.fields.modifiers.itemType?.type).toBe('enum');
    expect(schema!.fields.modifiers.itemType?.enumValues).toEqual([
      'Alt',
      'Control',
      'Meta',
      'Shift',
    ]);
  });

  it('should return null for unknown command', () => {
    const schema = extractParamSchema('nonexistent');
    expect(schema).toBeNull();
  });

  it('should extract setCookie sameSite enum', () => {
    const schema = extractParamSchema('setCookie');
    expect(schema!.fields.sameSite.type).toBe('enum');
    expect(schema!.fields.sameSite.enumValues).toEqual(['Strict', 'Lax', 'None']);
  });

  it('should extract screenshot type enum', () => {
    const schema = extractParamSchema('screenshot');
    expect(schema!.fields.type.type).toBe('enum');
    expect(schema!.fields.type.enumValues).toEqual(['png', 'jpeg']);
  });

  it('should extract mouse action enum', () => {
    const schema = extractParamSchema('mouse');
    expect(schema!.fields.action.type).toBe('enum');
    expect(schema!.fields.action.enumValues).toEqual(['move', 'down', 'up', 'click', 'dblclick']);
  });

  it('should extract empty schema for getCookies', () => {
    const schema = extractParamSchema('getCookies');
    expect(schema).not.toBeNull();
    expect(Object.keys(schema!.fields)).toHaveLength(0);
  });

  it('should extract evaluate expression', () => {
    const schema = extractParamSchema('evaluate');
    expect(schema!.fields.expression.type).toBe('string');
    expect(schema!.fields.expression.required).toBe(true);
  });

  it('should extract fill schema', () => {
    const schema = extractParamSchema('fill');
    expect(schema!.fields.selector.required).toBe(true);
    expect(schema!.fields.value.required).toBe(true);
    expect(schema!.fields.clear.required).toBe(false);
  });

  it('should extract waitForSelector state enum', () => {
    const schema = extractParamSchema('waitForSelector');
    expect(schema!.fields.state.type).toBe('enum');
    expect(schema!.fields.state.enumValues).toEqual(['attached', 'detached', 'visible', 'hidden']);
  });

  it('should extract a11y format enum', () => {
    const schema = extractParamSchema('a11y');
    expect(schema!.fields.format.type).toBe('enum');
    expect(schema!.fields.format.enumValues).toEqual(['yaml', 'json']);
  });
});
