import { describe, it, expect } from 'vitest';
import { formatSize, a11yToYaml } from '../../../../src/server/commands/extractors/a11y.js';
import type { A11yNode } from '../../../../src/server/commands/extractors/types.js';

describe('formatSize', () => {
  it('should format bytes < 1024 as B', () => {
    expect(formatSize(0)).toBe('0B');
    expect(formatSize(512)).toBe('512B');
    expect(formatSize(1023)).toBe('1023B');
  });

  it('should format bytes < 1MB as KB', () => {
    expect(formatSize(1024)).toBe('1.0KB');
    expect(formatSize(2048)).toBe('2.0KB');
    expect(formatSize(1536)).toBe('1.5KB');
  });

  it('should format bytes >= 1MB as MB', () => {
    expect(formatSize(1024 * 1024)).toBe('1.0MB');
    expect(formatSize(2.5 * 1024 * 1024)).toBe('2.5MB');
  });
});

describe('a11yToYaml', () => {
  it('should return empty string for null', () => {
    expect(a11yToYaml(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(a11yToYaml(undefined as unknown as A11yNode)).toBe('');
  });

  it('should format node with role and name', () => {
    const node: A11yNode = { tag: 'button', role: 'button', name: 'Submit' };
    expect(a11yToYaml(node)).toBe('- button "Submit"');
  });

  it('should format node with only name (no role)', () => {
    const node: A11yNode = { tag: 'span', name: 'Hello' };
    expect(a11yToYaml(node)).toBe('- Hello');
  });

  it('should format node with only tag (no role, no name)', () => {
    const node: A11yNode = { tag: 'div' };
    expect(a11yToYaml(node)).toBe('- div');
  });

  it('should include selector when present', () => {
    const node: A11yNode = { tag: 'input', selector: '#email' };
    const result = a11yToYaml(node);
    expect(result).toBe('- input\n  selector: #email');
  });

  it('should include href for links', () => {
    const node: A11yNode = {
      tag: 'a',
      role: 'link',
      name: 'Home',
      href: 'https://example.com',
    };
    const result = a11yToYaml(node);
    expect(result).toBe('- link "Home"\n  href: https://example.com');
  });

  it('should include disabled flag', () => {
    const node: A11yNode = { tag: 'button', role: 'button', name: 'Go', disabled: true };
    const result = a11yToYaml(node);
    expect(result).toBe('- button "Go"\n  disabled: true');
  });

  it('should render children with increased indent', () => {
    const node: A11yNode = {
      tag: 'nav',
      role: 'navigation',
      name: 'Main',
      children: [
        { tag: 'a', role: 'link', name: 'Home' },
        { tag: 'a', role: 'link', name: 'About' },
      ],
    };
    const result = a11yToYaml(node);
    expect(result).toBe('- navigation "Main"\n' + '  - link "Home"\n' + '  - link "About"');
  });

  it('should respect custom indent level', () => {
    const node: A11yNode = { tag: 'span', role: 'text', name: 'Hi' };
    const result = a11yToYaml(node, 2);
    expect(result).toBe('    - text "Hi"');
  });

  it('should handle deep nesting', () => {
    const node: A11yNode = {
      tag: 'ul',
      role: 'list',
      children: [
        {
          tag: 'li',
          role: 'listitem',
          name: 'Item',
          children: [{ tag: 'a', role: 'link', name: 'Link' }],
        },
      ],
    };
    const result = a11yToYaml(node);
    expect(result).toBe('- list\n  - listitem "Item"\n    - link "Link"');
  });

  it('should include all properties together', () => {
    const node: A11yNode = {
      tag: 'a',
      role: 'link',
      name: 'Click',
      selector: '.btn',
      href: '/page',
      disabled: true,
    };
    const result = a11yToYaml(node);
    expect(result).toBe('- link "Click"\n  selector: .btn\n  href: /page\n  disabled: true');
  });
});
