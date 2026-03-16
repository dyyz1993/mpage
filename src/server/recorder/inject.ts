export function getRecorderScript(): string {
  return `
(function() {
  if (window.__pageRecorder) {
    console.log('[PageRecorder] Already exists, skipping initialization');
    return;
  }

  console.log('[PageRecorder] Initializing...');

  class PageRecorder {
    constructor() {
      this.recordingId = '';
      this.startTime = 0;
      this.isRecording = false;
      this.eventId = 0;
      this.indicator = null;
      this.eventCountEl = null;

      this.MOUSE_THROTTLE = 50;
      this.SCROLL_THROTTLE = 100;

      this.lastMouseMove = 0;
      this.lastScroll = 0;
      this.networkRequests = 0;
      this.pendingWaits = [];

      this._listenersBound = false;

      console.log('[PageRecorder] Constructor called');
    }

    // Bind event listeners - must be called when document is ready
    bindEventListeners() {
      if (this._listenersBound) return;

      this._handleClick = this.handleClick.bind(this);
      this._handleDblClick = this.handleDblClick.bind(this);
      this._handleContextMenu = this.handleContextMenu.bind(this);
      this._handleMouseDown = this.handleMouseDown.bind(this);
      this._handleMouseUp = this.handleMouseUp.bind(this);
      this._handleMouseMove = this.handleMouseMove.bind(this);
      this._handleMouseEnter = this.handleMouseEnter.bind(this);
      this._handleMouseLeave = this.handleMouseLeave.bind(this);
      this._handleScroll = this.handleScroll.bind(this);
      this._handleKeyDown = this.handleKeyDown.bind(this);
      this._handleKeyUp = this.handleKeyUp.bind(this);
      this._handleInput = this.handleInput.bind(this);
      this._handleChange = this.handleChange.bind(this);
      this._handleFocus = this.handleFocus.bind(this);
      this._handleBlur = this.handleBlur.bind(this);

      document.addEventListener('click', this._handleClick, true);
      document.addEventListener('dblclick', this._handleDblClick, true);
      document.addEventListener('contextmenu', this._handleContextMenu, true);
      document.addEventListener('mousedown', this._handleMouseDown, true);
      document.addEventListener('mouseup', this._handleMouseUp, true);
      document.addEventListener('mousemove', this._handleMouseMove, true);
      document.addEventListener('mouseenter', this._handleMouseEnter, true);
      document.addEventListener('mouseleave', this._handleMouseLeave, true);
      document.addEventListener('scroll', this._handleScroll, true);
      document.addEventListener('keydown', this._handleKeyDown, true);
      document.addEventListener('keyup', this._handleKeyUp, true);
      document.addEventListener('input', this._handleInput, true);
      document.addEventListener('change', this._handleChange, true);
      document.addEventListener('focus', this._handleFocus, true);
      document.addEventListener('blur', this._handleBlur, true);

      this._listenersBound = true;
      this.monitorNetwork();
    }

    start(recordingId) {
      // If already recording with the same ID, just ensure indicator is shown
      if (this.isRecording && this.recordingId === recordingId) {
        this.showIndicator();
        return;
      }

      this.recordingId = recordingId;
      this.startTime = Date.now();
      this.isRecording = true;
      this.eventId = 0;

      // Bind listeners when starting (document should be ready now)
      this.bindEventListeners();
      this.showIndicator();
    }

    stop() {
      this.isRecording = false;
      this.hideIndicator();
    }

    hideIndicator() {
      if (this.indicator) {
        this.indicator.remove();
        this.indicator = null;
      }
    }

    showIndicator() {
      // Check if indicator already exists in DOM
      var existingIndicator = document.getElementById('__mpage_recorder_indicator__');
      if (existingIndicator) {
        this.indicator = existingIndicator;
        return;
      }

      // Wait for body if needed
      if (!document.body) {
        var self = this;
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() { self.showIndicator(); });
        } else {
          setTimeout(function() { self.showIndicator(); }, 50);
        }
        return;
      }

      // Create indicator
      this.indicator = document.createElement('div');
      this.indicator.id = '__mpage_recorder_indicator__';
      this.indicator.style.cssText = 'position:fixed;top:10px;right:10px;z-index:2147483647;background:#e74c3c;color:white;padding:8px 16px;border-radius:4px;font-family:Arial,sans-serif;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
      this.indicator.innerHTML = '🎬 录制中... <span id="__mpage_event_count__">' + this.eventId + '</span> 事件';
      document.body.appendChild(this.indicator);
    }

    updateIndicator() {
      // Always get fresh reference from DOM
      var countEl = document.getElementById('__mpage_event_count__');
      if (countEl) {
        countEl.textContent = this.eventId;
      } else if (this.isRecording) {
        // Indicator was removed, recreate it
        this.showIndicator();
      }
    }

    send(event) {
      // Use fetch to POST event to the route handler
      // This is more reliable than exposeFunction for cross-world communication
      fetch('/__mpage_record_event__', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      }).catch(function(err) {
        console.log('[PageRecorder] Error sending event:', err.message);
      });
    }

    record(event) {
      console.log('[PageRecorder] record() called, isRecording:', this.isRecording);
      if (!this.isRecording) {
        console.log('[PageRecorder] Not recording, skipping');
        return;
      }

      var fullEvent = {
        id: 'evt_' + String(++this.eventId).padStart(3, '0'),
        timestamp: Date.now() - this.startTime,
        type: event.type,
        selector: event.selector,
        tagName: event.tagName,
        data: event.data || {},
        waitBefore: event.waitBefore,
        recordingId: this.recordingId,
        pageState: {
          url: window.location.href,
          title: document.title,
          readyState: document.readyState
        }
      };

      console.log('[PageRecorder] Recording event:', fullEvent.type, fullEvent.id);
      this.send(fullEvent);
      this.updateIndicator();
    }

    getSelector(element) {
      if (!element || element === document.body || element === document.documentElement) {
        return 'body';
      }

      if (element.id) {
        return '#' + CSS.escape(element.id);
      }

      var testId = element.getAttribute('data-testid');
      if (testId) {
        return '[data-testid="' + testId + '"]';
      }

      var dataCy = element.getAttribute('data-cy');
      if (dataCy) {
        return '[data-cy="' + dataCy + '"]';
      }

      var ariaLabel = element.getAttribute('aria-label');
      if (ariaLabel) {
        return element.tagName.toLowerCase() + '[aria-label="' + ariaLabel + '"]';
      }

      var path = [];
      var current = element;

      while (current && current !== document.body) {
        var selector = current.tagName.toLowerCase();

        var classes = Array.from(current.classList).filter(function(c) {
          return !this.isGeneratedClass(c);
        }.bind(this)).slice(0, 2);

        if (classes.length > 0) {
          selector += '.' + classes.map(function(c) { return CSS.escape(c); }).join('.');
        }

        var parent = current.parentElement;
        if (parent) {
          var siblings = Array.from(parent.children);
          var index = siblings.indexOf(current) + 1;
          if (siblings.length > 1) {
            selector += ':nth-child(' + index + ')';
          }
        }

        path.unshift(selector);
        current = current.parentElement;
      }

      return path.join(' > ');
    }

    isGeneratedClass(className) {
      return /^[a-z]?[0-9a-f]{6,}$/i.test(className) ||
             /^css-[a-z0-9]+$/i.test(className) ||
             /^_[a-f0-9]+$/i.test(className) ||
             /^sc-[a-z]+$/i.test(className) ||
             /^css-[0-9]+$/i.test(className);
    }

    captureWaitConditions() {
      var conditions = [];

      var loadingElements = document.querySelectorAll(
        '[class*="loading"], [class*="spinner"], [data-loading="true"], [aria-busy="true"]'
      );

      for (var i = 0; i < loadingElements.length; i++) {
        conditions.push({
          type: 'element_hidden',
          selector: this.getSelector(loadingElements[i])
        });
      }

      if (this.networkRequests > 0) {
        conditions.push({ type: 'network_idle' });
      }

      return conditions.length > 0 ? conditions : undefined;
    }

    handleClick(e) {
      console.log('[PageRecorder] handleClick triggered!', e.target);
      this.record({
        type: 'click',
        selector: this.getSelector(e.target),
        tagName: e.target.tagName ? e.target.tagName.toLowerCase() : '',
        data: { x: e.clientX, y: e.clientY, button: e.button },
        waitBefore: this.captureWaitConditions()
      });
    }

    handleDblClick(e) {
      this.record({
        type: 'dblclick',
        selector: this.getSelector(e.target),
        tagName: e.target.tagName ? e.target.tagName.toLowerCase() : '',
        data: { x: e.clientX, y: e.clientY }
      });
    }

    handleContextMenu(e) {
      this.record({
        type: 'contextmenu',
        selector: this.getSelector(e.target),
        tagName: e.target.tagName ? e.target.tagName.toLowerCase() : '',
        data: { x: e.clientX, y: e.clientY }
      });
    }

    handleMouseDown(e) {
      this.record({
        type: 'mousedown',
        selector: this.getSelector(e.target),
        data: { x: e.clientX, y: e.clientY, button: e.button }
      });
    }

    handleMouseUp(e) {
      this.record({
        type: 'mouseup',
        selector: this.getSelector(e.target),
        data: { x: e.clientX, y: e.clientY, button: e.button }
      });
    }

    handleMouseMove(e) {
      var now = Date.now();
      if (now - this.lastMouseMove < this.MOUSE_THROTTLE) return;
      this.lastMouseMove = now;

      this.record({
        type: 'mousemove',
        data: { x: e.clientX, y: e.clientY }
      });
    }

    handleMouseEnter(e) {
      if (e.target === document.body || e.target === document.documentElement) return;
      
      this.record({
        type: 'hover_enter',
        selector: this.getSelector(e.target),
        tagName: e.target.tagName ? e.target.tagName.toLowerCase() : '',
        data: {}
      });
    }

    handleMouseLeave(e) {
      if (e.target === document.body || e.target === document.documentElement) return;
      
      this.record({
        type: 'hover_leave',
        selector: this.getSelector(e.target),
        data: {}
      });
    }

    handleScroll(e) {
      var now = Date.now();
      if (now - this.lastScroll < this.SCROLL_THROTTLE) return;
      this.lastScroll = now;

      this.record({
        type: 'scroll',
        data: { scrollX: window.scrollX, scrollY: window.scrollY }
      });
    }

    handleKeyDown(e) {
      this.record({
        type: 'keydown',
        selector: this.getSelector(e.target),
        data: {
          key: e.key,
          code: e.code,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          metaKey: e.metaKey
        }
      });
    }

    handleKeyUp(e) {
      this.record({
        type: 'keyup',
        selector: this.getSelector(e.target),
        data: {
          key: e.key,
          code: e.code
        }
      });
    }

    handleInput(e) {
      var target = e.target;
      var value = target.value !== undefined ? target.value : '';
      
      this.record({
        type: 'input',
        selector: this.getSelector(target),
        tagName: target.tagName ? target.tagName.toLowerCase() : '',
        data: { value: value }
      });
    }

    handleChange(e) {
      var target = e.target;
      var value = target.value !== undefined ? target.value : '';
      var checked = target.checked !== undefined ? target.checked : undefined;
      
      this.record({
        type: 'change',
        selector: this.getSelector(target),
        tagName: target.tagName ? target.tagName.toLowerCase() : '',
        data: { value: value, checked: checked }
      });
    }

    handleFocus(e) {
      this.record({
        type: 'focus',
        selector: this.getSelector(e.target),
        tagName: e.target.tagName ? e.target.tagName.toLowerCase() : '',
        data: {}
      });
    }

    handleBlur(e) {
      this.record({
        type: 'blur',
        selector: this.getSelector(e.target),
        data: {}
      });
    }

    monitorNetwork() {
      var self = this;

      if (window.fetch) {
        var originalFetch = window.fetch;
        window.fetch = function() {
          self.networkRequests++;
          return originalFetch.apply(this, arguments).finally(function() {
            self.networkRequests--;
          });
        };
      }

      var originalXHRSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.send = function() {
        var xhr = this;
        self.networkRequests++;
        xhr.addEventListener('loadend', function() {
          self.networkRequests--;
        });
        return originalXHRSend.apply(this, arguments);
      };
    }
  }

  window.__pageRecorder = new PageRecorder();
  console.log('[PageRecorder] Instance created and attached to window');

  // Bind event listeners immediately in addInitScript context
  // This is where exposeFunction is accessible
  // Use DOMContentLoaded or bind immediately if document is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.__pageRecorder.bindEventListeners();
    });
  } else {
    // Document is already ready
    window.__pageRecorder.bindEventListeners();
  }
})();
`;
}
