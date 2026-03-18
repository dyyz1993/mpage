// 结构提取器 - 统一的结构提取逻辑

export const STRUCTURE_EXTRACTOR_CODE = `(function(opts) {
  // 排除的标签
  var excludeTags = new Set([
    "SCRIPT","STYLE","NOSCRIPT","META","LINK","HEAD","HTML","TITLE",
    "SVG","PATH","G","DEFS","USE","CIRCLE","RECT","POLYGON","LINE","POLYLINE"
  ]);

  // 语义化标签
  var semanticTags = new Set([
    "HEADER","NAV","MAIN","ASIDE","FOOTER","SECTION","ARTICLE","FORM",
    "UL","OL","DL","MENU","TABLE","FIGURE","DETAILS","SUMMARY","DIALOG"
  ]);

  // 布局标签
  var layoutTags = new Set([
    "DIV","HEADER","NAV","MAIN","ASIDE","FOOTER","SECTION","ARTICLE","FORM",
    "UL","OL","DL","MENU","TABLE"
  ]);

  // 重要关键词（精简版）
  var IMPORTANT_KEYWORDS = [
    "sidebar","header","footer","nav","search",
    "form","card","feed","item","post","article","comment","user",
    "profile","recommend","category","tag","tab","modal","dialog",
    "menu","button","input","login","register","cart","checkout",
    "product","price","image","video","audio","player","map","calendar",
    "table","chart","filter","sort","pagination"
  ];

  // 获取元素选择器
  function getSelector(el) {
    var id = el.id;
    if (id && id.indexOf(":") !== 0 && !/^[a-z]?[0-9a-f]{6,}$/i.test(id) && id.length < 30) {
      return "#" + id;
    }
    var testId = el.getAttribute("data-testid");
    if (testId && testId.length < 30) {
      return '[data-testid="' + testId + '"]';
    }
    var e2e = el.getAttribute("data-e2e");
    if (e2e && e2e.length > 0 && e2e.length < 30) {
      return '[data-e2e="' + e2e + '"]';
    }
    var classAttr = el.getAttribute("class") || "";
    var classes = classAttr.trim().split(/\\\\s+/)
      .filter(function(c) {
        return c &&
          c.indexOf("reds-") !== 0 &&
          c.indexOf("_") !== 0 &&
          c.indexOf("css-") !== 0 &&
          c.indexOf("prc-") !== 0 &&
          c.indexOf("sc-") !== 0 &&
          c.indexOf("r-") !== 0 &&
          !/^[a-z]?[0-9a-f]{6,}$/i.test(c) &&
          !/^[a-z][0-9a-z]{5,}$/i.test(c) &&
          c.length > 2 &&
          c.length < 30 &&
          /[a-z]{3,}/i.test(c);
      });
    if (classes.length > 0) return "." + classes[0];
    return "";
  }

  // 提取关键词
  function extractKeywords(el) {
    var keywords = [];
    var className = (el.className || "").toString().toLowerCase();
    var id = (el.id || "").toLowerCase();
    var allText = className + " " + id;

    for (var i = 0; i < IMPORTANT_KEYWORDS.length; i++) {
      var keyword = IMPORTANT_KEYWORDS[i];
      var patterns = ["-" + keyword + "-", "-" + keyword, keyword + "-", "_" + keyword, keyword + "_"];
      for (var j = 0; j < patterns.length; j++) {
        if (allText.indexOf(patterns[j]) !== -1) {
          keywords.push(keyword);
          break;
        }
      }
    }
    return keywords;
  }

  // 获取区域类型
  function getRegionType(el) {
    var tag = el.tagName;
    var role = el.getAttribute("role");
    var className = (el.className || "").toString().toLowerCase();
    var id = (el.id || "").toLowerCase();
    if (role === "navigation" || tag === "NAV" || className.indexOf("nav") !== -1 || id.indexOf("nav") !== -1) return "nav";
    if (role === "banner" || tag === "HEADER") return "header";
    if (role === "contentinfo" || tag === "FOOTER") return "footer";
    if (role === "main" || tag === "MAIN") return "main";
    if (role === "complementary" || tag === "ASIDE" || className.indexOf("sidebar") !== -1 || id.indexOf("sidebar") !== -1) return "sidebar";
    if (tag === "FORM" || className.indexOf("form") !== -1 || id.indexOf("form") !== -1) return "form";
    if (className.indexOf("search") !== -1 || id.indexOf("search") !== -1) return "search";
    if (tag === "SECTION" || tag === "ARTICLE") return "section";
    if (["UL","OL","DL","MENU"].indexOf(tag) !== -1 || role === "list") return "list";
    if (tag === "TABLE") return "table";
    if (className.indexOf("modal") !== -1 || id.indexOf("modal") !== -1 || role === "dialog") return "modal";
    if (className.indexOf("card") !== -1 || id.indexOf("card") !== -1) return "card";
    if (className.indexOf("feed") !== -1 || id.indexOf("feed") !== -1) return "feed";
    if (className.indexOf("dropdown") !== -1 || id.indexOf("dropdown") !== -1) return "dropdown";
    if (className.indexOf("tab") !== -1 || id.indexOf("tab") !== -1) return "tab";
    return undefined;
  }

  // 检查是否是搜索输入框
  function isSearchInput(el) {
    if (el.tagName !== "INPUT") return false;
    var type = el.getAttribute("type") || "text";
    if (type === "hidden" || type === "submit" || type === "button") return false;
    var placeholder = (el.getAttribute("placeholder") || "").toLowerCase();
    var name = (el.getAttribute("name") || "").toLowerCase();
    var id = (el.id || "").toLowerCase();
    var className = (el.className || "").toString().toLowerCase();
    return placeholder.indexOf("search") !== -1 || placeholder.indexOf("搜索") !== -1 || placeholder.indexOf("搜") !== -1 ||
           name.indexOf("search") !== -1 || name.indexOf("kw") !== -1 || name.indexOf("q") !== -1 ||
           id.indexOf("search") !== -1 || id.indexOf("kw") !== -1 || className.indexOf("search") !== -1;
  }

  // 统计交互元素
  function countInteractive(el) {
    var inputs = el.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
    var buttons = el.querySelectorAll('button, input[type="submit"], input[type="button"]');
    var links = el.querySelectorAll('a[href]');
    return { inputs: inputs.length, buttons: buttons.length, links: links.length };
  }

  // 检查是否隐藏
  function isHidden(el) {
    var style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return true;
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return true;
    return false;
  }

  // 检查是否活跃
  function isActive(el) {
    var className = (el.className || "").toString().toLowerCase();
    var id = (el.id || "").toLowerCase();
    return className.indexOf("active") !== -1 || className.indexOf("selected") !== -1 ||
           className.indexOf("current") !== -1 || id.indexOf("active") !== -1;
  }

  // 格式化大小
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + "B";
    var kb = bytes / 1024;
    if (kb < 1024) {
      // 去掉 .0
      var str = kb.toFixed(1);
      if (str.endsWith(".0")) str = str.slice(0, -2);
      return str + "KB";
    }
    var mb = bytes / (1024 * 1024);
    var str = mb.toFixed(1);
    if (str.endsWith(".0")) str = str.slice(0, -2);
    return str + "MB";
  }

  // 计算 A11Y 大小
  function calculateA11ySize(el) {
    function walk(node) {
      var tag = node.tagName;
      if (["SCRIPT", "STYLE", "NOSCRIPT", "META", "LINK", "HEAD", "HTML", "SVG", "PATH", "G"].indexOf(tag) !== -1) {
        return "";
      }

      var role = node.getAttribute("role") ||
        (tag === "BUTTON" ? "button" :
         tag === "A" ? "link" :
         tag === "INPUT" ? "textbox" :
         tag === "TEXTAREA" ? "textbox" :
         tag === "SELECT" ? "combobox" :
         tag === "IMG" ? "img" :
         tag === "H1" || tag === "H2" || tag === "H3" || tag === "H4" || tag === "H5" || tag === "H6" ? "heading" :
         tag === "UL" || tag === "OL" ? "list" :
         tag === "LI" ? "listitem" :
         tag === "NAV" ? "navigation" :
         tag === "MAIN" ? "main" :
         tag === "HEADER" ? "banner" :
         tag === "FOOTER" ? "contentinfo" :
         tag === "FORM" ? "form" :
         null);

      var name = node.getAttribute("aria-label") ||
        node.getAttribute("alt") ||
        node.getAttribute("title") ||
        (tag === "INPUT" || tag === "TEXTAREA" ? node.getAttribute("placeholder") : "");

      var directText = "";
      for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        if (child.nodeType === 3) {
          var txt = (child.textContent || "").trim();
          if (txt) {
            directText += (directText ? " " : "") + txt;
          }
        }
      }

      var finalName = name || (directText ? directText.slice(0, 100) : "");

      var result = "";
      if (role || finalName) {
        result = "- " + (role || "item") + (finalName ? ' "' + finalName.slice(0, 50) + '"' : "") + "\\n";
      }

      for (var i = 0; i < node.children.length; i++) {
        result += walk(node.children[i]);
      }

      return result;
    }

    return walk(el).length;
  }

  // 计算文本节点数量
  function countTextNodes(el) {
    var count = 0;
    function walk(node) {
      for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        if (child.nodeType === 3) {
          var txt = (child.textContent || "").trim();
          if (txt && txt.length > 0) count++;
        } else if (child.children) {
          for (var j = 0; j < child.children.length; j++) {
            walk(child.children[j]);
          }
        }
      }
    }
    walk(el);
    return count;
  }

  // 格式化文本数量
  function formatTextCount(count) {
    if (count === 0) return null;
    if (count < 10) return "t:" + count;
    if (count < 1000) return "t:" + count;
    if (count < 10000) return "t:" + count;
    return "t:999+";
  }

  // 是否应该包含此元素
  function shouldInclude(el) {
    var tag = el.tagName;
    if (excludeTags.has(tag)) return false;
    if (semanticTags.has(tag)) return true;
    if (layoutTags.has(tag)) return true;
    // 包含有 ID 的元素
    if (el.id && el.id.length > 0 && el.id.length < 50) return true;
    // 包含有 data-testid 或 data-e2e 的元素
    if (el.getAttribute("data-testid") || el.getAttribute("data-e2e")) return true;
    var region = getRegionType(el);
    if (region) return true;
    var counts = countInteractive(el);
    if (counts.inputs > 0 || counts.buttons > 0) return true;
    var className = (el.className || "").toString().toLowerCase();
    if (className.indexOf("container") !== -1 || className.indexOf("wrapper") !== -1 ||
        className.indexOf("content") !== -1 || className.indexOf("layout") !== -1 ||
        className.indexOf("main") !== -1 || className.indexOf("sidebar") !== -1 ||
        className.indexOf("header") !== -1 || className.indexOf("footer") !== -1) {
      return true;
    }
    return false;
  }

  // 检查是否有重要内容
  function hasSignificantContent(el) {
    var tag = el.tagName;
    if (semanticTags.has(tag)) return true;
    var region = getRegionType(el);
    if (region) return true;
    var keywords = extractKeywords(el);
    if (keywords.length > 0) return true;
    var counts = countInteractive(el);
    if (counts.inputs > 0 || counts.buttons > 0 || counts.links > 15) return true;
    var className = (el.className || "").toString().toLowerCase();
    if (className.indexOf("container") !== -1 || className.indexOf("wrapper") !== -1 ||
        className.indexOf("content") !== -1 || className.indexOf("layout") !== -1 ||
        className.indexOf("main") !== -1 || className.indexOf("sidebar") !== -1 ||
        className.indexOf("header") !== -1 || className.indexOf("footer") !== -1) {
      return true;
    }
    return false;
  }

  // 获取元素的类型签名（用于数组判断）
  function getTypeSignature(el) {
    var tag = el.tagName;
    var classAttr = (el.className || "").toString();
    var classes = classAttr.trim().split(/\\\\s+/);
    // 只取第一个有意义的 class 作为签名
    for (var i = 0; i < classes.length; i++) {
      var c = classes[i];
      if (c && c.length > 2 && c.length < 30 && !/^[a-z]?[0-9a-f]{6,}$/i.test(c) &&
          c.indexOf("reds-") !== 0 && c.indexOf("_") !== 0 && c.indexOf("css-") !== 0 &&
          c.indexOf("prc-") !== 0 && c.indexOf("sc-") !== 0 && c.indexOf("r-") !== 0) {
        return "." + c;
      }
    }
    return tag;
  }

  // 检查是否是数组类型（允许少数不同元素）
  function isArrayType(children) {
    if (children.length < 2) return false;

    // 统计每种类型签名出现的次数
    var signatureCounts = {};
    for (var i = 0; i < children.length; i++) {
      var sig = getTypeSignature(children[i]);
      signatureCounts[sig] = (signatureCounts[sig] || 0) + 1;
    }

    // 找出最常见的类型
    var maxCount = 0;
    var dominantSignature = "";
    for (var sig in signatureCounts) {
      if (signatureCounts[sig] > maxCount) {
        maxCount = signatureCounts[sig];
        dominantSignature = sig;
      }
    }

    // 如果最常见的类型占 80% 以上，认为是数组
    return maxCount / children.length >= 0.8;
  }

  // 获取数组中的主要元素类型
  function getDominantType(children) {
    var signatureCounts = {};
    for (var i = 0; i < children.length; i++) {
      var sig = getTypeSignature(children[i]);
      signatureCounts[sig] = (signatureCounts[sig] || 0) + 1;
    }

    var maxCount = 0;
    var dominantSignature = "";
    for (var sig in signatureCounts) {
      if (signatureCounts[sig] > maxCount) {
        maxCount = signatureCounts[sig];
        dominantSignature = sig;
      }
    }

    // 返回第一个匹配主要类型的元素
    for (var i = 0; i < children.length; i++) {
      if (getTypeSignature(children[i]) === dominantSignature) {
        return children[i];
      }
    }
    return children[0];
  }

  // 构建布局
  function buildLayout(el, depth) {
    if (excludeTags.has(el.tagName)) return null;
    // 不限制深度

    var tag = el.tagName.toLowerCase();
    var selector = getSelector(el);
    var keywords = extractKeywords(el);
    var region = getRegionType(el);
    var counts = countInteractive(el);
    var hidden = isHidden(el);
    var active = isActive(el);
    var htmlSize = el.outerHTML.length;

    var node = { type: tag };
    if (selector) node.selector = selector;
    if (keywords.length > 0) node.keywords = keywords.slice(0, 3);
    if (region) node.region = region;
    if (hidden) node.isHidden = true;
    if (active) node.isActive = true;

    // 添加 KB 数
    if (htmlSize >= 1024) {
      node.size = formatSize(htmlSize);
    }
    var a11yLen = calculateA11ySize(el);
    if (a11yLen > 0 && a11yLen < htmlSize) {
      node.a11ySize = formatSize(a11yLen);
    }

    // 添加交互元素计数
    if (counts.inputs > 0) node.inputCount = counts.inputs;
    if (counts.buttons > 0) node.buttonCount = counts.buttons;
    if (counts.links > 0 && counts.links <= 10) node.linkCount = counts.links;

    // 添加文本节点数量
    var textCount = countTextNodes(el);
    var textInfo = formatTextCount(textCount);
    if (textInfo) node.textCount = textInfo;

    // 处理子元素
    var directChildren = Array.from(el.children).filter(shouldInclude);

    if (directChildren.length > 0) {
      // 检查是否是数组类型
      if (isArrayType(directChildren)) {
        node.isArray = true;
        node.arrayLength = directChildren.length;

        // 只提取主要类型的第一个子元素作为示例
        var dominantChild = getDominantType(directChildren);
        var firstChild = buildLayout(dominantChild, depth + 1);
        if (firstChild) {
          node.children = [firstChild];
        }
      } else {
        // 普通子元素
        var childNodes = [];
        for (var i = 0; i < directChildren.length; i++) {
          var childNode = buildLayout(directChildren[i], depth + 1);
          if (childNode) {
            childNodes.push(childNode);
          }
        }

        if (childNodes.length > 0) {
          node.children = childNodes;
        }
      }
    }

    return node;
  }

  var root = document.querySelector(opts.selector);
  if (!root) return { layout: null, yaml: "", error: "Element not found" };
  var layout = buildLayout(root, 0);

  // 生成 YAML（使用 xpage 格式）
  function toYaml(node, indent) {
    if (!node) return "";
    var spaces = "  ".repeat(indent);
    
    // 判断节点是否有有意义的选择器（不只是 type）
    var hasRealSelector = node.selector && node.selector.length > 0;
    
    // 如果没有有意义的选择器，直接输出子元素（跳过此节点）
    if (!hasRealSelector) {
      var childResult = "";
      if (node.children) {
        for (var i = 0; i < node.children.length; i++) {
          childResult += toYaml(node.children[i], indent);
        }
      }
      return childResult;
    }
    
    var selector = node.selector;
    var parts = [];
    var seen = new Set();

    function addPart(p) {
      if (!seen.has(p)) {
        seen.add(p);
        parts.push(p);
      }
    }

    // 检查选择器是否已包含region名称，避免重复
    var selectorLower = selector.toLowerCase();
    var hasRegionInSelector = node.region && selectorLower.indexOf(node.region) !== -1;
    
    if (node.region && !hasRegionInSelector) addPart(node.region);
    if (node.keywords) {
      for (var i = 0; i < node.keywords.length; i++) {
        var kw = node.keywords[i];
        // 避免关键词和选择器重复
        if (selectorLower.indexOf(kw) === -1) {
          addPart(kw);
        }
      }
    }
    if (node.isHidden) addPart("h");
    if (node.isActive) addPart("active");
    if (node.inputCount) addPart("i:" + node.inputCount);
    if (node.buttonCount) addPart("b:" + node.buttonCount);
    if (node.linkCount) addPart("l:" + node.linkCount);
    if (node.textCount) addPart(node.textCount);
    if (node.isArray) addPart("×" + node.arrayLength);
    if (node.size) {
      if (node.a11ySize) {
        addPart(node.size + "→" + node.a11ySize);
      } else {
        addPart(node.size);
      }
    }

    var line = spaces;
    if (parts.length > 0) {
      line += selector + ": [" + parts.join(" ") + "]";
    } else {
      line += selector + ": [" + node.type + "]";
    }

    var result = line + "\\n";
    if (node.children) {
      // 合并连续的相同子元素
      var mergedChildren = [];
      for (var i = 0; i < node.children.length; i++) {
        var child = node.children[i];
        var prev = mergedChildren[mergedChildren.length - 1];
        if (prev && prev.selector === child.selector && prev.type === child.type) {
          // 合并
          prev._count = (prev._count || 1) + 1;
        } else {
          child._count = 1;
          mergedChildren.push(child);
        }
      }
      // 输出，标记有合并的
      for (var i = 0; i < mergedChildren.length; i++) {
        var child = mergedChildren[i];
        if (child._count > 1) {
          child.isArray = true;
          child.arrayLength = child._count;
          delete child._count;
          delete child.children; // 合并时不显示子元素
        }
        result += toYaml(child, indent + 1);
      }
    }

    return result;
  }

  var yaml = toYaml(layout, 0);
  var tip = "💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y";
  return { layout: layout, yaml: yaml + "\\n" + tip };
})`;

// 用于本地测试的包装函数
export function getStructureExtractorForTest(): string {
  return STRUCTURE_EXTRACTOR_CODE;
}
