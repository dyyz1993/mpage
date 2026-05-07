import { describe, it, expect } from 'vitest';
import { layoutToYaml } from '../../../../src/server/commands/extractors/layout-formatters.js';
import type { LayoutNode } from '../../../../src/server/commands/extractors/types.js';

describe('layoutToYaml', () => {
  it('should return empty string for null', () => {
    expect(layoutToYaml(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(layoutToYaml(undefined as unknown as LayoutNode)).toBe('');
  });

  it('should format a simple node with only type', () => {
    const node: LayoutNode = { type: 'div' };
    expect(layoutToYaml(node)).toBe('div: [div]\n');
  });

  it('should use selector when present', () => {
    const node: LayoutNode = { type: 'div', selector: '.container' };
    expect(layoutToYaml(node)).toBe('.container: [div]\n');
  });

  it('should include role in parts', () => {
    const node: LayoutNode = { type: 'div', role: 'navigation' };
    expect(layoutToYaml(node)).toBe('div: [navigation]\n');
  });

  it('should include region in parts', () => {
    const node: LayoutNode = { type: 'section', region: 'sidebar' };
    expect(layoutToYaml(node)).toBe('section: [sidebar]\n');
  });

  it('should include keywords array', () => {
    const node: LayoutNode = { type: 'div', keywords: ['search', 'filter'] };
    expect(layoutToYaml(node)).toBe('div: [search filter]\n');
  });

  it('should include isHidden and isActive flags', () => {
    const node: LayoutNode = { type: 'div', isHidden: true, isActive: true };
    expect(layoutToYaml(node)).toBe('div: [hidden active]\n');
  });

  it('should include hasSearch and hasForm flags', () => {
    const node: LayoutNode = { type: 'div', hasSearch: true, hasForm: true };
    expect(layoutToYaml(node)).toBe('div: [search form]\n');
  });

  it('should include inputCount, buttonCount, linkCount', () => {
    const node: LayoutNode = {
      type: 'form',
      inputCount: 3,
      buttonCount: 2,
      linkCount: 5,
    };
    expect(layoutToYaml(node)).toBe('form: [i:3 b:2 l:5]\n');
  });

  it('should include repeatCount, size, a11ySize', () => {
    const node: LayoutNode = {
      type: 'ul',
      repeatCount: 10,
      size: '2KB',
      a11ySize: '500B',
    };
    expect(layoutToYaml(node)).toBe('ul: [×10 2KB a11y:500B]\n');
  });

  it('should deduplicate duplicate parts', () => {
    const node: LayoutNode = {
      type: 'div',
      role: 'search',
      keywords: ['search'],
    };
    expect(layoutToYaml(node)).toBe('div: [search]\n');
  });

  it('should render children with increased indent', () => {
    const node: LayoutNode = {
      type: 'main',
      children: [
        { type: 'header', role: 'banner' },
        {
          type: 'nav',
          role: 'navigation',
          children: [{ type: 'a', role: 'link', linkCount: 1 }],
        },
      ],
    };
    const result = layoutToYaml(node);
    expect(result).toBe(
      'main: [main]\n' + '  header: [banner]\n' + '  nav: [navigation]\n' + '    a: [link l:1]\n'
    );
  });

  it('should respect custom indent level', () => {
    const node: LayoutNode = { type: 'span', role: 'text' };
    expect(layoutToYaml(node, 2)).toBe('    span: [text]\n');
  });
});
