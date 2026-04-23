// 结构提取器 - 统一的结构提取逻辑

export const STRUCTURE_EXTRACTOR_CODE = `(function(opts) {
  var excludeTags = new Set([
    "SCRIPT","STYLE","NOSCRIPT","META","LINK","HEAD","HTML","TITLE",
    "SVG","PATH","G","DEFS","USE","CIRCLE","RECT","POLYGON","LINE","POLYLINE"
  ]);

  var SIZE_THRESHOLD = 1 * 1024; // 1KB
  var MIN_SIZE = 50; // 最小 50B

  // 通用 class 名，不应该作为唯一选择器
  var genericClasses = new Set([
    "list-none", "flex", "grid", "block", "inline", "hidden", "container",
    "wrapper", "content", "item", "card", "row", "col", "section", "main",
    "header", "footer", "nav", "sidebar", "menu", "list", "grid-cols-1",
    "grid-cols-2", "grid-cols-3", "grid-cols-4", "flex-row", "flex-col",
    "items-center", "justify-center", "justify-between", "gap-1", "gap-2",
    "gap-3", "gap-4", "p-1", "p-2", "p-3", "p-4", "m-1", "m-2", "m-3", "m-4",
    "text-sm", "text-base", "text-lg", "text-xl", "font-bold", "font-medium",
    "rounded", "rounded-lg", "shadow", "shadow-lg", "border", "border-gray",
    "bg-white", "bg-gray", "text-gray", "text-black", "text-white"
  ]);

  function getSelector(el, includeParent) {
    var id = el.id;
    if (id && id.indexOf(":") !== 0 && id.length >= 3 && id.length < 25) {
      var isHashId = /^(t3_|uid_)/.test(id) ||
                     /[-_](t3_|uid_)/.test(id) ||  // 包含 -t3_ 或 _t3_ 或 -uid_ 或 _uid_ 的也是动态 ID
                     /^[a-z]?[0-9a-f]{4,}$/i.test(id) ||
                     /^_[a-zA-Z0-9_]{5,}$/.test(id) ||
                     /^_[A-Z]/.test(id) ||
                     /^[A-Z][a-z]{1,5}[A-Z][a-z]*/.test(id) ||
                     /^[a-z]{2,6}[0-9]{2,}$/i.test(id) ||
                     /^[a-zA-Z0-9]{6,}$/.test(id) && !/[aeiou]{2,}/i.test(id) ||
                     /^[A-Z][a-zA-Z0-9]{4,}$/.test(id) && !/[aeiou]{2,}/i.test(id) ||
                     /^[a-z]{3,5}$/.test(id) && !/(nav|btn|app|main|form|list|item|card|grid|feed|menu|user|logo|home|search|login|signup|header|footer|sidebar|content|container)/i.test(id) ||
                     /[A-Z]/.test(id) && /[a-z]/.test(id) && id.length <= 5 ||
                     /^[A-Z][a-z]{1,3}[A-Z]/.test(id) && id.length <= 5 ||
                     /^rc-tabs-/.test(id) ||
                     /^ytp-id-/.test(id) ||
                     /^feed-item-/.test(id) ||
                     /^batBeacon/.test(id) ||
                     /^disinterest-event-id-/.test(id) ||
                     /^portal\//.test(id) ||
                     /^_r_[a-z0-9_]+_$/.test(id) ||
                     /_svg_/.test(id) ||
                     /^desktop(-[a-z]+)?-(grid|btf|item|col|row)?-[0-9]+$/i.test(id);
      if (!isHashId) {
        return "#" + id;
      }
    }
    var testId = el.getAttribute("data-testid");
    if (testId && testId.length < 30) {
      return '[data-testid="' + testId + '"]';
    }
    var e2e = el.getAttribute("data-e2e");
    if (e2e && e2e.length > 0 && e2e.length < 30) {
      return '[data-e2e="' + e2e + '"]';
    }
    
    var ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel && ariaLabel.length > 2 && ariaLabel.length < 30) {
      // 只保留已知的语义性 aria-label
      // - 导航相关：导航、菜单、搜索、登录、注册、关闭、打开
      // - 操作相关：展开、收起、播放、暂停、上一张、下一张
      // - 区域相关：主要内容、侧边栏、页眉、页脚
      // - 其他：分享、评论、点赞、收藏
      var semanticPatterns = /导航|菜单|搜索|登录|注册|关闭|打开|展开|收起|播放|暂停|上一张|下一张|主要内容|侧边栏|页眉|页脚|分享|评论|点赞|收藏|navigation|menu|search|login|register|close|open|expand|collapse|play|pause|prev|next|main|sidebar|header|footer|share|comment|like|bookmark/i;
      if (semanticPatterns.test(ariaLabel)) {
        return "[aria-label=\\\"" + ariaLabel + "\\\"]";
      }
    }
    
    var role = el.getAttribute("role");
    if (role && role.length > 2 && role !== "presentation" && role !== "none") {
      return "[role=" + role + "]";
    }
    
    var classAttr = el.getAttribute("class") || "";
    var classes = classAttr.trim().split(/\\s+/)
      .map(function(c) {
        // CSS Modules: ComponentName__hash → [class^="ComponentName_"]
        // 生成通配选择器，如 .btb_layout_wrapper_kkUG6 → [class^="btb_layout_wrapper_"]
        // 匹配任意前缀_哈希的格式
        var cssModuleMatchHash = c.match(/^(.+)_([^_]{4,})$/);
        if (cssModuleMatchHash && cssModuleMatchHash[1].length >= 3) {
          return '[class^="' + cssModuleMatchHash[1] + '_"]';
        }
        return c;
      })
      .filter(function(c) {
        return c &&
          c.indexOf("_") !== 0 &&
          c.indexOf("css-") !== 0 &&
          c.indexOf("prc-") !== 0 &&
          c.indexOf("sc-") !== 0 &&
          c.indexOf("r-") !== 0 &&
          c.indexOf("__cdp") === -1 &&
          c.indexOf("[") === -1 &&
          c.indexOf(":") === -1 &&
          !/^[a-z]?[0-9a-f]{4,}$/i.test(c) &&
          !/^[a-z]+[0-9]+[a-z]*[0-9]*$/i.test(c) &&
          !/^css(-[a-z0-9]+)?$/i.test(c) &&
          !/^jsx-[0-9]+$/.test(c) &&
          !/^a-/.test(c.toLowerCase()) &&
          !/^version[0-9]*/i.test(c) &&
          !/^style-scope/.test(c) &&
          !/^woo-box-/.test(c) &&
          !/--[a-zA-Z0-9]{5,}$/.test(c) &&
          !/^_[a-zA-Z0-9]{5,}$/.test(c) &&  // 过滤以 _ 开头的哈希类名
          !/^(hidden|block|flex|grid|absolute|relative|fixed|sticky|inline|visible|invisible|sr-only|not-sr-only|d-flex|d-block|d-none|d-inline|d-inline-flex|d-md-flex|d-lg-flex|flex-1|flex-auto|flex-column|flex-row|flex-wrap|flex-col|flex-col-reverse|antialiased|subpixel-|normal-case|uppercase|lowercase|capitalize|truncate)$/i.test(c) &&
          !/^(w-|h-|p-|m-|lg|xl|md|sm|xs|pt|pb|pl|pr|px|py|mt|mb|ml|mr|mx|my|font|cursor|white|black|bg|border|rounded|shadow|overflow|z-|opacity|transition|transform|duration|ease|animate|align|justify|items|self|gap|space|order|float|clear|display|min-h-|max-h-|min-w-|max-w-|position-|width-|height-|color-|tmp-|hide-|inset-|shrink-|grow-|object-|pointer-events-|mix-blend-|translate-|scale-|rotate-|skew-|origin-|@container|from-|to-|via-|blur-|brightness-|contrast-|saturate-|grayscale-|sepia-|backdrop-|select-|resize-|outline-|ring-|decoration-|underline-|break-|whitespace-|indent-|leading-|tracking-|divide-|place-|contents-|aspect-|columns-|container-|isolate-|snap-|scroll-|overscroll-|touch-|will-change-|fill-|stroke|left-|right-|top-|bottom-|text-|-translate-|-scale-|-rotate-|-skew-)/i.test(c) &&
          c.length > 3 &&
          c.length < 25 &&
          /[a-z]{3,}/i.test(c) &&
          !/^[a-z]{2,6}[0-9]{2,}$/i.test(c) &&
          !/^[A-Z][a-z]{1,5}[A-Z][a-z]*$/.test(c) &&
          (!/^[a-zA-Z0-9]{5,}$/.test(c) || /[aeiou]{2,}/i.test(c)) &&
          !(/[A-Z]/.test(c.charAt(0)) && /[a-z]/.test(c.slice(1)) && c.length <= 5) &&
          !genericClasses.has(c);
      });
    
    if (classes.length > 0) return "." + classes[0];
    
    var tag = el.tagName.toLowerCase();
    var semanticTags = ["header", "nav", "main", "section", "article", "aside", "footer", "form", "dialog"];
    if (semanticTags.indexOf(tag) !== -1) {
      return tag;
    }
    
    return "";
  }

  // 获取唯一选择器（递归向上查找父元素）
  function getUniqueSelector(el, maxDepth) {
    if (!maxDepth) maxDepth = 5;
    
    var baseSelector = getSelector(el);
    if (!baseSelector) return "";
    
    // 检查是否唯一
    try {
      var matches = document.querySelectorAll(baseSelector);
      if (matches.length === 1) {
        return baseSelector;
      }
      // 如果有多个匹配，尝试添加父元素选择器
      if (matches.length > 1 && maxDepth > 0 && el.parentElement && el.parentElement !== document.body) {
        var parentSelector = getUniqueSelector(el.parentElement, maxDepth - 1);
        if (parentSelector) {
          var combinedSelector = parentSelector + " > " + baseSelector;
          try {
            var combinedMatches = document.querySelectorAll(combinedSelector);
            if (combinedMatches.length === 1) {
              return combinedSelector;
            }
          } catch (e) {}
        }
      }
      // 如果仍然不唯一，返回空字符串
      return "";
    } catch (e) {
      return "";
    }
  }

  function getRegionType(el) {
    var tag = el.tagName;
    var role = el.getAttribute("role");
    if (role === "navigation" || tag === "NAV") return "nav";
    if (role === "banner" || tag === "HEADER") return "header";
    if (role === "contentinfo" || tag === "FOOTER") return "footer";
    if (role === "main" || tag === "MAIN") return "main";
    if (role === "complementary" || tag === "ASIDE") return "sidebar";
    return null;
  }

  function getListType(el) {
    var tag = el.tagName;
    var role = el.getAttribute("role");
    var className = (el.className || "").toString().toLowerCase();
    
    if (["UL", "OL", "DL", "MENU"].indexOf(tag) !== -1) return "list";
    if (role === "list") return "list";
    if (role === "grid") return "grid";
    if (className.indexOf("carousel") !== -1 || className.indexOf("feed") !== -1) return "feed";
    return null;
  }

  function isHidden(el) {
    if (el === document.body || el === document.documentElement) return false;
    var style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return true;
    if (el.hasAttribute("hidden")) return true;
    if (el.getAttribute("aria-hidden") === "true") return true;
    return false;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + "B";
    var kb = bytes / 1024;
    if (kb < 1024) {
      var str = kb.toFixed(1);
      if (str.endsWith(".0")) str = str.slice(0, -2);
      return str + "KB";
    }
    return (bytes / (1024 * 1024)).toFixed(1) + "MB";
  }

  function calculateA11ySize(el) {
    function walk(node) {
      var tag = node.tagName;
      if (["SCRIPT", "STYLE", "NOSCRIPT", "META", "LINK", "HEAD", "HTML", "SVG", "PATH", "G"].indexOf(tag) !== -1) return 0;
      
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
          if (txt) directText += (directText ? " " : "") + txt;
        }
      }

      var finalName = name || (directText ? directText.slice(0, 100) : "");
      var size = (role || finalName) ? ("- " + (role || "item") + (finalName ? ' "' + finalName.slice(0, 50) + '"' : "") + "\\n").length : 0;

      for (var i = 0; i < node.children.length; i++) {
        size += walk(node.children[i]);
      }

      return size;
    }

    return walk(el);
  }

  function countChildren(el) {
    var count = 0;
    for (var i = 0; i < el.children.length; i++) {
      var child = el.children[i];
      if (!excludeTags.has(child.tagName) && !isHidden(child)) {
        count++;
      }
    }
    return count;
  }

  function collectContainers(el, depth) {
    if (excludeTags.has(el.tagName) || isHidden(el)) return { containers: [], lists: [] };

    var a11ySize = calculateA11ySize(el);
    var selector = getUniqueSelector(el, 5);
    var region = getRegionType(el);
    var listType = getListType(el);
    var childCount = countChildren(el);

    // 如果没有选择器，跳过当前元素，直接处理子元素
    if (!selector) {
      var result = { containers: [], lists: [] };
      for (var i = 0; i < el.children.length; i++) {
        var childResult = collectContainers(el.children[i], depth);
        result.containers = result.containers.concat(childResult.containers);
        result.lists = result.lists.concat(childResult.lists);
      }
      return result;
    }

    // 如果是列表类型，单独标记
    if (listType && childCount >= 3) {
      if (a11ySize < MIN_SIZE) {
        return { containers: [], lists: [] };
      }
      
      // 列表选择器：优先使用唯一选择器，否则使用基础选择器
      var listSelector = getUniqueSelector(el, 5) || getSelector(el);
      if (!listSelector) {
        // 如果还是没有选择器，使用 tag 名
        listSelector = el.tagName.toLowerCase();
      }
      
      // 找到第一个有效的子元素作为示例 item
      var sampleItem = null;
      for (var i = 0; i < el.children.length; i++) {
        var child = el.children[i];
        if (!excludeTags.has(child.tagName) && !isHidden(child)) {
          var childSelector = getUniqueSelector(child, 3) || getSelector(child);
          var childSize = calculateA11ySize(child);
          if (childSelector && childSize >= MIN_SIZE) {
            sampleItem = { selector: childSelector, size: childSize };
            break;
          }
        }
      }
      
      // 容器选择器：只有唯一时才输出
      var containerSelector = getUniqueSelector(el, 5);
      
      return {
        containers: containerSelector ? [{ selector: containerSelector, size: a11ySize, depth: depth, region: region }] : [],
        lists: [{ 
          selector: listSelector, 
          type: listType, 
          count: childCount, 
          size: a11ySize,
          item: sampleItem
        }]
      };
    }

    // 如果 A11Y 体积 < 阈值，不展开
    if (a11ySize < SIZE_THRESHOLD) {
      // 过滤掉太小的容器
      if (a11ySize < MIN_SIZE) {
        return { containers: [], lists: [] };
      }
      return {
        containers: [{ selector: selector, size: a11ySize, depth: depth, region: region }],
        lists: []
      };
    }

    // 如果 A11Y 体积 > 阈值，递归处理子元素
    var childContainers = [];
    var childLists = [];
    for (var i = 0; i < el.children.length; i++) {
      var childResult = collectContainers(el.children[i], depth + 1);
      childContainers = childContainers.concat(childResult.containers);
      childLists = childLists.concat(childResult.lists);
    }

    // 如果没有子容器符合条件，返回当前容器
    if (childContainers.length === 0) {
      return {
        containers: [{ selector: selector, size: a11ySize, depth: depth, region: region }],
        lists: childLists
      };
    }

    // 返回子容器
    return {
      containers: childContainers,
      lists: childLists
    };
  }

  var root = document.querySelector(opts.selector);
  if (!root) return { layout: null, yaml: "", error: "Element not found" };

  var result = collectContainers(root, 0);
  var containers = result.containers;
  var lists = result.lists;

  // 合并相同选择器的列表
  function mergeLists(lists) {
    var merged = {};
    for (var i = 0; i < lists.length; i++) {
      var list = lists[i];
      var key = list.selector;
      if (merged[key]) {
        merged[key].count += list.count;
        merged[key].size += list.size;
        merged[key].totalCount = (merged[key].totalCount || 1) + 1;
      } else {
        merged[key] = {
          selector: list.selector,
          type: list.type,
          count: list.count,
          size: list.size,
          item: list.item,
          totalCount: 1
        };
      }
    }
    
    var result = [];
    for (var key in merged) {
      var list = merged[key];
      if (list.totalCount > 1) {
        list.count = list.totalCount + "个列表";
      }
      result.push(list);
    }
    return result;
  }

  lists = mergeLists(lists);

  // 按 depth 分组容器
  function buildTree(containers) {
    var root = { children: [], selector: "", depth: -1 };
    var stack = [root];

    for (var i = 0; i < containers.length; i++) {
      var c = containers[i];
      var node = { selector: c.selector, size: c.size, region: c.region, depth: c.depth, children: [] };

      // 找到父节点
      while (stack.length > 1 && stack[stack.length - 1].depth >= c.depth) {
        stack.pop();
      }

      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }

    return root.children;
  }

  var tree = buildTree(containers);

  function toYaml(nodes, indent) {
    if (!nodes || nodes.length === 0) return "";
    var spaces = "  ".repeat(indent);
    var result = "";

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var selector = node.selector || (node.region || "div");
      var parts = [];
      if (node.region) parts.push(node.region);
      parts.push(formatSize(node.size));

      result += spaces + selector + ": [" + parts.join(" ") + "]\\n";
      result += toYaml(node.children, indent + 1);
    }

    return result;
  }

  var yaml = toYaml(tree, 0);

  // 添加列表信息
  if (lists.length > 0) {
    yaml += "\\n# 列表/数组\\n";
    for (var i = 0; i < lists.length; i++) {
      var list = lists[i];
      var countStr = typeof list.count === "number" ? "×" + list.count : list.count;
      yaml += list.selector + ": [" + list.type + " " + countStr + " " + formatSize(list.size) + "]\\n";
      if (list.item) {
        yaml += "  " + list.item.selector + ": [item " + formatSize(list.item.size) + "]\\n";
      }
    }
  }

  return { layout: { containers: containers, lists: lists }, yaml: yaml };
})`;

export function getStructureExtractorForTest(): string {
  return STRUCTURE_EXTRACTOR_CODE;
}
