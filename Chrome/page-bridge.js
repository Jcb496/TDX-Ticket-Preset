// Runs in the page's MAIN world so TDX's own jQuery can receive events.
// Only responds to events dispatched on existing DOM elements.
(() => {
  'use strict';
  for (const [eventName, jqueryEvent] of [
    ['tdx-presets-jquery-change', 'change'],
    ['tdx-presets-jquery-input', 'input']
  ]) {
    document.addEventListener(eventName, event => {
      const el = event.target;
      if (!(el instanceof Element) || !el.id || !el.id.startsWith('attribute') && el.id !== 'FormID') return;
      if (typeof window.jQuery === 'function') window.jQuery(el).trigger(jqueryEvent);
    });
  }
})();
