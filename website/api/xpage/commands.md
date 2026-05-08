---
title: 全部命令
---

# 全部命令参考

## 导航命令

### goto

```typescript
interface GotoArgs {
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
}

const result = await executePageCommand(page, 'goto', { url: 'https://example.com' });
```

### goBack / goForward / reload

```typescript
await executePageCommand(page, 'goBack', {});
await executePageCommand(page, 'goForward', {});
await executePageCommand(page, 'reload', {});
```

### title / url

```typescript
const { title } = await executePageCommand(page, 'title', {});
const { url } = await executePageCommand(page, 'url', {});
```

## 交互命令

### click

```typescript
interface ClickArgs {
  selector: string;
  timeout?: number;
  force?: boolean;
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
}

await executePageCommand(page, 'click', { selector: '#button' });
```

### fill

```typescript
interface FillArgs {
  selector: string;
  value: string;
  timeout?: number;
}

await executePageCommand(page, 'fill', { selector: '#input', value: 'Hello World' });
```

### type

```typescript
interface TypeArgs {
  selector: string;
  text: string;
  delay?: number;
}

await executePageCommand(page, 'type', { selector: '#search', text: 'keyword', delay: 50 });
```

### press / hover / select / check / dblclick

```typescript
await executePageCommand(page, 'press', { selector: 'body', key: 'Enter' });
await executePageCommand(page, 'hover', { selector: '#menu' });
await executePageCommand(page, 'select', { selector: '#dropdown', value: 'option1' });
await executePageCommand(page, 'check', { selector: '#agree' });
await executePageCommand(page, 'dblclick', { selector: '#item' });
```

## 查询命令

### html / text / textContent / inputValue / getAttribute

```typescript
const { html } = await executePageCommand(page, 'html', { selector: '#main', clean: true });
const { text } = await executePageCommand(page, 'text', { selector: '.content' });
const { textContent } = await executePageCommand(page, 'textContent', { selector: '#el' });
const { value } = await executePageCommand(page, 'inputValue', { selector: '#input' });
const { value: href } = await executePageCommand(page, 'getAttribute', { selector: '#link', name: 'href' });
```

### query / find

```typescript
const { elements } = await executePageCommand(page, 'query', { selector: '.item' });
const { element } = await executePageCommand(page, 'find', { text: 'Login', tag: 'a' });
```

## 等待命令

### waitForSelector / wait

```typescript
await executePageCommand(page, 'waitForSelector', { selector: '#content', timeout: 5000 });
await executePageCommand(page, 'wait', { timeout: 1000 });
```

## 截图命令

### screenshot / screenshotBase64

```typescript
await executePageCommand(page, 'screenshot', { path: 'screenshot.png', fullPage: true });
const { base64 } = await executePageCommand(page, 'screenshotBase64', {});
```

## 结构命令

### structure

```typescript
const { structure, yaml } = await executePageCommand(page, 'structure', {
  selector: 'body',
  maxDepth: 5,
});
```

### a11y / snapshot

```typescript
const { snapshot } = await executePageCommand(page, 'a11y', { selector: 'main', format: 'yaml' });
const { snapshot: aria } = await executePageCommand(page, 'snapshot', { selector: 'body' });
```

## 执行命令

### evaluate / evaluateRaw

```typescript
const { result } = await executePageCommand(page, 'evaluate', { expression: 'document.title' });
const { result: asyncResult } = await executePageCommand(page, 'evaluateRaw', {
  script: 'async () => { return await fetch("/api").then(r => r.json()) }',
});
```

## 滚动命令

### scroll

```typescript
interface ScrollArgs {
  selector?: string;
  x?: number;
  y?: number;
}

await executePageCommand(page, 'scroll', { y: 500 });
```
