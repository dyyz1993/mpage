import type { Page } from 'playwright-core';
import type { CommandModule } from './types.js';

export const queryCommands: CommandModule = {
  query: async (page: Page, args: Record<string, unknown>) => {
    const selector = args.selector as string;
    const result = await page.evaluate((s) => {
      const elements = Array.from(document.querySelectorAll(s));
      return elements.slice(0, 20).map((el, i) => ({
        index: i,
        tagName: el.tagName,
        id: el.id || '',
        className: (el.className || '').toString().slice(0, 100),
        text: (el.textContent || '').trim().slice(0, 200),
        href: (el as HTMLAnchorElement).href || '',
      }));
    }, selector);
    return { elements: result, count: result.length };
  },

  find: async (page: Page, args: Record<string, unknown>) => {
    const text = args.text as string;
    const tag = (args.tag as string) || '*';
    const result = await page.evaluate(
      (opts) => {
        const allElements = Array.from(document.querySelectorAll(opts.tag));
        const matches: Element[] = [];

        const excludeTags = new Set([
          'SCRIPT',
          'STYLE',
          'NOSCRIPT',
          'META',
          'LINK',
          'HEAD',
          'HTML',
          'TITLE',
        ]);

        const containing = allElements.filter((el) => {
          if (excludeTags.has(el.tagName)) return false;
          const content = el.textContent || '';
          if (opts.exact) return content.trim() === opts.text;
          return content.includes(opts.text);
        });

        for (const el of containing) {
          const hasMoreSpecificChild = containing.some(
            (other) => other !== el && el.contains(other)
          );
          if (!hasMoreSpecificChild) {
            matches.push(el);
          }
        }

        return matches.slice(0, 20).map((el, i) => ({
          index: i,
          tagName: el.tagName,
          id: el.id || '',
          className: (el.className || '').toString().slice(0, 100),
          text: (el.textContent || '').trim().slice(0, 200),
          href: (el as HTMLAnchorElement).href || '',
          selector: el.id
            ? `#${el.id}`
            : el.className
              ? `.${el.className.split(' ')[0]}`
              : el.tagName.toLowerCase(),
        }));
      },
      { text, tag, exact: args.exact }
    );
    return { elements: result, count: result.length };
  },

  html: async (page: Page, args: Record<string, unknown>) => {
    let html: string;
    if (args.selector) {
      html = await page.innerHTML(args.selector as string);
    } else {
      html = await page.content();
    }

    if (args.clean) {
      html = html
        .replace(/\s*data-v-[a-f0-9]+="[^"]*"/gi, '')
        .replace(/\s*data-v-[a-f0-9]+/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/>\s+</g, '><')
        .replace(/\s*class=""/g, '')
        .replace(/\s*style=""/g, '')
        .replace(/\s*id=""/g, '')
        .replace(/<div\s*><\/div>/g, '')
        .replace(/<span\s*><\/span>/g, '')
        .replace(/<div\s*>\s*<\/div>/g, '')
        .replace(/<span\s*>\s*<\/span>/g, '')
        .trim();
    }

    return { html };
  },

  text: async (page: Page, args: Record<string, unknown>) => {
    const text = await page.textContent((args.selector as string) || 'body');
    return { text };
  },

  structure: async (page: Page, args: Record<string, unknown>) => {
    const selector = (args.selector as string) || 'body';

    const fn = eval('(' + LAYOUT_FN_STR + ')');
    const result = await page.evaluate(fn, { selector });

    return result;
  },
};

const LAYOUT_FN_STR = `
function(opts) {
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
    var classes = classAttr.trim().split(/\\s+/)
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
    var inputs = el.querySelectorAll("input:not([type=\\"hidden\\"]):not([type=\\"submit\\"]):not([type=\\"button\\"])");
    var buttons = el.querySelectorAll("button, input[type=\\"submit\\"], input[type=\\"button\\"]");
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
    var aRegion = getRegionType(a);
    var bRegion = getRegionType(b);
    if (aRegion !== bRegion) return false;
    var aClass = (a.className || "").toString().split(/\\s+/)[0] || "";
    var bClass = (b.className || "").toString().split(/\\s+/)[0] || "";
    if (aClass !== bClass) return false;
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
    var keywords = extractKeywords(el);
    if (keywords.length > 0) return true;
    var counts = countInteractive(el);
    if (counts.inputs > 0 || counts.buttons > 0 || counts.links > 15) return true;

    const className = (el.className || '').toString().toLowerCase();
    if (
      className.includes('container') ||
      className.includes('wrapper') ||
      className.includes('content') ||
      className.includes('layout') ||
      className.includes('main') ||
      className.includes('sidebar') ||
      className.includes('header') ||
      className.includes('footer')
    ) {
      return true;
    }

    return false;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + "B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + "KB";
    return (bytes / (1024 * 1024)).toFixed(1) + "MB";
  }

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

  function isPassThrough(el, childNode) {
    if (semanticTags.has(el.tagName)) return false;
    if (getRegionType(el)) return false;
    if (extractKeywords(el).length > 0) return false;
    if (!getSelector(el)) {
      if (childNode) {
        var counts = countInteractive(el);
        var childInputs = childNode.inputCount || 0;
        var childButtons = childNode.buttonCount || 0;
        var childLinks = childNode.linkCount || 0;
        if (counts.inputs === childInputs && counts.buttons === childButtons && counts.links === childLinks) {
          return true;
        }
      }
    }
    var counts = countInteractive(el);
    if (counts.inputs > 0 || counts.buttons > 0) return false;
    return true;
  }

  function buildLayout(el, depth) {
    if (excludeTags.has(el.tagName)) return null;
    if (depth > 6) return null;

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

    var a11yLen = calculateA11ySize(el);
    if (a11yLen > 0 && a11yLen < htmlSize) {
      node.a11ySize = formatSize(a11yLen);
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

    if (directChildren.length > 0) {
      var groups = groupChildren(directChildren);
      var childNodes = [];

      for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        var childNode = buildLayout(group.element, depth + 1);
        if (childNode && hasSignificantContent(group.element)) {
          if (group.count > 1) {
            childNode.repeatCount = group.count;
          }
          childNodes.push(childNode);
        }
      }

      if (childNodes.length === 1 && isPassThrough(el, childNodes[0])) {
        var singleChild = childNodes[0];
        if (!region && keywords.length === 0) {
          singleChild.selector = selector || singleChild.selector;
          return singleChild;
        }
      }

      if (childNodes.length > 0) {
        node.children = childNodes;
      }
    }

    return node;
  }

  var root = document.querySelector(opts.selector);
  if (!root) return { layout: null, yaml: "", error: "Element not found" };
  var layout = buildLayout(root, 0);

  function toYaml(node, indent) {
    if (!node) return "";
    var spaces = "  ".repeat(indent);
    var selector = node.selector || node.type;
    var parts = [];
    var seen = new Set();

    function addPart(p) {
      if (!seen.has(p)) {
        seen.add(p);
        parts.push(p);
      }
    }

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
      for (var i = 0; i < node.children.length; i++) {
        result += toYaml(node.children[i], indent + 1);
      }
    }

    return result;
  }

  return { layout: layout, yaml: toYaml(layout, 0) };
}
`;
