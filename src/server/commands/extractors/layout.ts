import type { LayoutNode } from './types';

export const LAYOUT_EXTRACTOR_FN = `
(function(selector) {
  var excludeTags = new Set([
    "SCRIPT","STYLE","NOSCRIPT","META","LINK","HEAD","HTML","TITLE",
    "SVG","PATH","G","DEFS","USE","CIRCLE","RECT","POLYGON","LINE","POLYLINE"
  ]);
  var semanticTags = new Set([
    "HEADER","NAV","MAIN","ASIDE","FOOTER","SECTION","ARTICLE","FORM",
    "UL","OL","DL","MENU","TABLE","FIGURE","FIGCAPTION","DETAILS","SUMMARY","DIALOG"
  ]);
  var layoutTags = new Set([
    "DIV","HEADER","NAV","MAIN","ASIDE","FOOTER","SECTION","ARTICLE","FORM",
    "UL","OL","DL","MENU","TABLE"
  ]);
  var IMPORTANT_KEYWORDS = [
    "content","container","main","sidebar","header","footer","nav","search",
    "form","list","card","feed","item","post","article","comment","user",
    "profile","recommend","suggest","category","tag","tab","modal","dialog",
    "dropdown","menu","button","input","login","register","cart","checkout",
    "product","price","image","video","audio","player","map","calendar",
    "table","chart","graph","filter","sort","pagination","breadcrumb"
  ];

  function getSelector(el) {
    var semanticTags = new Set([
      "ARTICLE","SECTION","NAV","MAIN","ASIDE","HEADER","FOOTER","FORM",
      "FIGURE","FIGCAPTION","DIALOG","DETAILS","SUMMARY","ADDRESS",
      "H1","H2","H3","H4","H5","H6"
    ]);
    
    // 1. Prefer data-testid if available (most stable)
    if (el.getAttribute && el.getAttribute('data-testid')) {
      return '[data-testid="' + el.getAttribute('data-testid') + '"]';
    }
    
    // 2. Prefer data-id if available
    if (el.getAttribute && el.getAttribute('data-id')) {
      return '[data-id="' + el.getAttribute('data-id') + '"]';
    }
    
    // 3. Use semantic tags
    if (semanticTags.has(el.tagName)) {
      return el.tagName.toLowerCase();
    }
    
    // 4. Use id if available
    if (el.id) return "#" + el.id;
    
    // 5. Filter and select best class name
    // eslint-disable-next-line no-useless-escape
    var classes = (el.className || "").toString().trim().split(/[\s]+/)
      .filter(function(c) { 
        // Filter out framework-specific classes (React, Vue, Angular, CSS modules, etc.)
        return c && 
          c.indexOf("reds-") !== 0 && 
          c.indexOf("css-") !== 0 && 
          c.indexOf("prc-") !== 0 &&
          c.indexOf("__") === -1 &&  // CSS modules
          c.indexOf("_") !== 0 &&     // Many frameworks use prefix_
          !c.match(/^[a-z][a-z0-9]*-[a-z0-9]+-[a-z0-9]+$/) && // hash-like classes
          c.length > 2 && 
          c.length < 30; 
      });
    
    // Try to find a meaningful class (containing important keywords)
    var importantKeywords = ["btn", "button", "input", "card", "item", "menu", "nav", "header", "footer", "sidebar", "modal", "dialog", "form", "search", "chat", "message", "copy"];
    for (var i = 0; i < classes.length; i++) {
      var cls = classes[i].toLowerCase();
      for (var j = 0; j < importantKeywords.length; j++) {
        if (cls.indexOf(importantKeywords[j]) !== -1) {
          return "." + classes[i];
        }
      }
    }
    
    // Fall back to first class
    if (classes.length > 0) return "." + classes[0];
    
    // 6. Build path-based selector as last resort
    var path = [];
    var current = el;
    var maxDepth = 5;
    var depth = 0;
    while (current && depth < maxDepth) {
      var tag = current.tagName ? current.tagName.toLowerCase() : '';
      if (!tag || tag === 'html' || tag === 'body') break;
      
      var selector = tag;
      if (current.id) {
        selector += '#' + current.id;
        path.unshift(selector);
        break;
      }
      
      // eslint-disable-next-line no-useless-escape
      var cls = (current.className || "").toString().trim().split(/[\s]+/)[0];
      if (cls) selector += '.' + cls;
      
      // Add nth-child to make more specific
      var parent = current.parentElement;
      if (parent) {
        var children = Array.from(parent.children).filter(function(c) { return c.tagName === current.tagName; });
        if (children.length > 1) {
          var index = children.indexOf(current) + 1;
          selector += ':nth-of-type(' + index + ')';
        }
      }
      
      path.unshift(selector);
      current = parent;
      depth++;
    }
    
    return path.join(' > ');
  }

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

  function countInteractive(el) {
    var inputs = el.querySelectorAll("input:not([type=\\\\\\"hidden\\\\\\"]):not([type=\\\\\\"submit\\\\\\"]):not([type=\\\\\\"button\\\\\\"])");
    var buttons = el.querySelectorAll("button, input[type=\\\\\\"submit\\\\\\"], input[type=\\\\\\"button\\\\\\"]");
    var links = el.querySelectorAll("a[href]");
    return { inputs: inputs.length, buttons: buttons.length, links: links.length };
  }

  function isHidden(el) {
    var style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return true;
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return true;
    return false;
  }

  function isActive(el) {
    var className = (el.className || "").toString().toLowerCase();
    var id = (el.id || "").toLowerCase();
    return className.indexOf("active") !== -1 || className.indexOf("selected") !== -1 || 
           className.indexOf("current") !== -1 || id.indexOf("active") !== -1;
  }

  function isSameLayout(a, b) {
    if (a.tagName !== b.tagName) return false;
    if (a.tagName === "ARTICLE") return true;
    var aRegion = getRegionType(a);
    var bRegion = getRegionType(b);
    if (aRegion !== bRegion) return false;
    var aClass = (a.className || "").toString().split(" ")[0];
    var bClass = (b.className || "").toString().split(" ")[0];
    if (aClass !== bClass) return false;
    var aChildren = Array.from(a.children).filter(function(c) { return layoutTags.has(c.tagName); });
    var bChildren = Array.from(b.children).filter(function(c) { return layoutTags.has(c.tagName); });
    if (aChildren.length !== bChildren.length) return false;
    return true;
  }

  function groupChildren(children) {
    var groups = [];
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (groups.length > 0) {
        var last = groups[groups.length - 1];
        if (isSameLayout(last.element, child)) {
          last.count++;
          continue;
        }
      }
      groups.push({ element: child, count: 1 });
    }
    return groups;
  }

  function shouldInclude(el) {
    var tag = el.tagName;
    if (excludeTags.has(tag)) return false;
    if (semanticTags.has(tag)) return true;
    if (layoutTags.has(tag)) return true;
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

  function hasSignificantContent(el) {
    var tag = el.tagName;
    if (semanticTags.has(tag)) return true;
    var region = getRegionType(el);
    if (region) return true;
    var counts = countInteractive(el);
    if (counts.inputs > 0 || counts.buttons > 0 || counts.links > 5) return true;
    var directChildren = Array.from(el.children).filter(shouldInclude);
    if (directChildren.length > 1) return true;
    return false;
  }

  function buildLayout(el, depth) {
    if (excludeTags.has(el.tagName)) return null;
    if (depth > 12) return null;

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

    if (htmlSize >= 1024) {
      node.size = formatSize(htmlSize);
    }

    if (isSearchInput(el)) {
      node.hasSearch = true;
    }

    if (region === "form" || counts.inputs > 0) {
      node.hasForm = true;
      if (counts.inputs > 0) node.inputCount = counts.inputs;
      if (counts.buttons > 0) node.buttonCount = counts.buttons;
    }

    if (counts.links > 0 && counts.links <= 10) {
      node.linkCount = counts.links;
    }

    var directChildren = Array.from(el.children).filter(shouldInclude);
    var groups = groupChildren(directChildren);

    if (groups.length > 0) {
      var children = [];
      for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        var childNode = buildLayout(group.element, depth + 1);
        if (childNode) {
          if (group.count > 1) {
            childNode.repeatCount = group.count;
          }
          children.push(childNode);
        }
      }
      if (children.length > 0) {
        node.children = children;
      }
    }

    return node;
  }

  function toYaml(node, indent) {
    if (!node) return "";
    var spaces = "  ".repeat(indent);
    var line = spaces;

    var selector = node.selector || node.type;
    var parts = [];
    var seen = new Set();

    function addPart(p) {
      if (!seen.has(p)) {
        seen.add(p);
        parts.push(p);
      }
    }

    if (node.role) addPart(node.role);
    if (node.region) addPart(node.region);
    if (node.keywords) {
      for (var i = 0; i < node.keywords.length; i++) {
        addPart(node.keywords[i]);
      }
    }
    if (node.isHidden) addPart("hidden");
    if (node.isActive) addPart("active");
    if (node.hasSearch) addPart("search");
    if (node.hasForm) addPart("form");
    if (node.inputCount) addPart("i:" + node.inputCount);
    if (node.buttonCount) addPart("b:" + node.buttonCount);
    if (node.linkCount) addPart("l:" + node.linkCount);
    if (node.repeatCount) addPart("×" + node.repeatCount);
    if (node.size) addPart(node.size);
    if (node.a11ySize) addPart("a11y:" + node.a11ySize);

    if (parts.length > 0) {
      line += selector + ": [" + parts.join(" ") + "]";
    } else {
      line += selector + ": [" + node.type + "]";
    }

    var result = line + "\\\\n";

    if (node.children) {
      for (var i = 0; i < node.children.length; i++) {
        result += toYaml(node.children[i], indent + 1);
      }
    }

    return result;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + "B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + "KB";
    return (bytes / (1024 * 1024)).toFixed(1) + "MB";
  }

  var root = document.querySelector(selector) || document.body;
  var layout = buildLayout(root, 0);
  var yaml = toYaml(layout, 0);

  return {
    json: layout,
    yaml: yaml,
    size: {
      html: root.outerHTML.length,
      extracted: yaml.length
    }
  };
})
`;

export function layoutToYaml(node: LayoutNode | null, indent: number = 0): string {
  if (!node) return '';

  const spaces = '  '.repeat(indent);
  const selector = node.selector || node.type;
  const parts: string[] = [];
  const seen = new Set<string>();

  const addPart = (p: string) => {
    if (!seen.has(p)) {
      seen.add(p);
      parts.push(p);
    }
  };

  if (node.role) addPart(node.role);
  if (node.region) addPart(node.region);
  if (node.keywords) {
    for (const k of node.keywords) {
      addPart(k);
    }
  }
  if (node.isHidden) addPart('hidden');
  if (node.isActive) addPart('active');
  if (node.hasSearch) addPart('search');
  if (node.hasForm) addPart('form');
  if (node.inputCount) addPart(`i:${node.inputCount}`);
  if (node.buttonCount) addPart(`b:${node.buttonCount}`);
  if (node.linkCount) addPart(`l:${node.linkCount}`);
  if (node.repeatCount) addPart(`×${node.repeatCount}`);
  if (node.size) addPart(node.size);
  if (node.a11ySize) addPart(`a11y:${node.a11ySize}`);

  let line = '';
  if (parts.length > 0) {
    line = `${spaces}${selector}: [${parts.join(' ')}]`;
  } else {
    line = `${spaces}${selector}: [${node.type}]`;
  }

  let result = line + '\n';

  if (node.children) {
    for (const child of node.children) {
      result += layoutToYaml(child, indent + 1);
    }
  }

  return result;
}
