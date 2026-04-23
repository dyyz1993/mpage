const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { STRUCTURE_EXTRACTOR_CODE } = require('./src/server/commands/structure-extractor.ts');

const websitesDir = './tests/fixtures/websites';
const outputDir = './tests/fixtures/structures';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function processFile(filename) {
  const filepath = path.join(websitesDir, filename);
  const html = fs.readFileSync(filepath, 'utf-8');
  
  try {
    const dom = new JSDOM(html, { 
      url: 'https://example.com',
      runScripts: undefined,  // 不执行页面脚本
      resources: undefined,
      pretendToBeVisual: true,
      beforeParse(window) {
        window.matchMedia = function() { return { matches: false, addListener: function() {}, removeListener: function() {} }; };
        window.innerWidth = 1920;
        window.innerHeight = 1080;
        window.requestAnimationFrame = function(cb) { return setTimeout(cb, 16); };
        window.cancelAnimationFrame = function(id) { clearTimeout(id); };
      }
    });
    
    const window = dom.window;
    
    // 使用 vm 模块执行提取器
    const vm = require('vm');
    const context = vm.createContext({
      document: window.document,
      window: window,
      Set: Set,
      Map: Map,
      Array: Array,
      Object: Object,
      JSON: JSON,
      Math: Math,
      parseInt: parseInt,
      parseFloat: parseFloat,
      isNaN: isNaN,
      isFinite: isFinite,
      RegExp: RegExp,
      Date: Date,
      String: String,
      Number: Number,
      Boolean: Boolean
    });
    const result = vm.runInContext(`(${STRUCTURE_EXTRACTOR_CODE})({ selector: 'body', maxTokens: 300 })`, context);
    
    const outputPath = path.join(outputDir, filename.replace('.html', '.yaml'));
    fs.writeFileSync(outputPath, result.yaml);
    
    return { success: true, tokens: result.tokens };
  } catch (e) {
    return { success: false, tokens: 0 };
  }
}

const files = fs.readdirSync(websitesDir).filter(f => f.endsWith('.html'));
console.log(`Found ${files.length} HTML files\n`);

let totalTokens = 0;
let successCount = 0;

for (const file of files) {
  const r = processFile(file);
  if (r.success) {
    successCount++;
    totalTokens += r.tokens;
  }
}

console.log(`✅ 成功处理 ${successCount}/${files.length} 个文件`);
console.log(`📊 平均 Token: ${Math.round(totalTokens / successCount)}`);
