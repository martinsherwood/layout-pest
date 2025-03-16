// Layout Pest Content Script
// Handles element information on hover and outline thickness

// Check if the script has already been injected
if (window.layoutPestInitialized) {
  // Script already running, do nothing
} else {
  // Mark as initialized
  window.layoutPestInitialized = true;

  // Main script wrapped in an IIFE to avoid global variable conflicts
  (() => {
    let tooltip = null;
    let styleElement = null;

    // Configuration with storage sync
    const config = {
      showElementInfo: true,
      outlineThickness: '1px',
      enabled: false
    };

    // Function to create tooltip
    function createTooltip() {
      if (tooltip) return;

      tooltip = document.createElement('div');
      tooltip.id = 'layout-pest-tooltip';
      tooltip.className = 'layout-pest-element';
      tooltip.style.cssText = `
        position: fixed;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
        z-index: 2147483647;
        pointer-events: none;
        max-width: 300px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        display: none;
        outline: none !important;
        border: none !important;
      `;

      // Create a style element for the tooltip's children
      const tooltipStyle = document.createElement('style');
      tooltipStyle.textContent = `
        #layout-pest-tooltip * {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }
      `;
      document.head.appendChild(tooltipStyle);

      document.body.appendChild(tooltip);
    }

    // Function to cleanup
    function cleanup() {
      if (tooltip) {
        tooltip.remove();
        tooltip = null;
      }
      removeOutlines();
      document.removeEventListener('mousemove', updateTooltip);
      document.removeEventListener('mouseout', hideTooltip);
      window.layoutPestInitialized = false;
    }

    // Function to remove injected stylesheet
    function removeInjectedStylesheet() {
      // Remove the dynamically injected CSS file
      const injectedStylesheets = document.querySelectorAll('link[href*="layout-pest.css"]');
      injectedStylesheets.forEach(sheet => sheet.remove());

      // Remove any style elements we created
      const styleElements = document.querySelectorAll('style[id^="layout-pest"]');
      styleElements.forEach(style => style.remove());

      // Reset styleElement reference
      styleElement = null;
    }

    // Function to hide tooltip
    function hideTooltip() {
      if (tooltip) {
        tooltip.style.display = 'none';
      }
    }

    // Load saved configuration
    chrome.storage.sync.get(['showElementInfo', 'outlineThickness', 'enabled'], (result) => {
      if (result.showElementInfo !== undefined) config.showElementInfo = result.showElementInfo;
      if (result.outlineThickness) config.outlineThickness = result.outlineThickness;
      if (result.enabled) {
        config.enabled = true;
        enableOutlines();
      }
      createTooltip();
    });

    // Function to save configuration
    function saveConfig() {
      chrome.storage.sync.set({
        showElementInfo: config.showElementInfo,
        outlineThickness: config.outlineThickness,
        enabled: config.enabled
      });
    }

    // Function to get CSS selector path
    function getCssPath(el) {
      if (!(el instanceof Element)) return '';

      const path = [];
      let currentElement = el;

      while (currentElement.nodeType === Node.ELEMENT_NODE) {
        let selector = currentElement.nodeName.toLowerCase();
        if (currentElement.id) {
          selector = `${selector}#${currentElement.id}`;
          path.unshift(selector);
          break;
        }

        let sibling = currentElement;
        let nth = 1;
        while (sibling.previousElementSibling) {
          sibling = sibling.previousElementSibling;
          if (sibling.nodeName.toLowerCase() === selector) nth++;
        }
        if (nth !== 1) selector = `${selector}:nth-of-type(${nth})`;

        path.unshift(selector);
        currentElement = currentElement.parentNode;
      }

      return path.join(' > ');
    }

    // Function to get computed style information
    function getElementInfo(element) {
      const computedStyle = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      return {
        tagName: element.tagName.toLowerCase(),
        id: element.id ? `#${element.id}` : '',
        classes: Array.from(element.classList).map(c => `.${c}`).join(''),
        dimensions: {
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        coordinates: {
          top: Math.round(rect.top),
          left: Math.round(rect.left)
        },
        boxModel: {
          margin: {
            top: computedStyle.marginTop,
            right: computedStyle.marginRight,
            bottom: computedStyle.marginBottom,
            left: computedStyle.marginLeft
          },
          border: {
            top: computedStyle.borderTopWidth,
            right: computedStyle.borderRightWidth,
            bottom: computedStyle.borderBottomWidth,
            left: computedStyle.borderLeftWidth
          },
          padding: {
            top: computedStyle.paddingTop,
            right: computedStyle.paddingRight,
            bottom: computedStyle.paddingBottom,
            left: computedStyle.paddingLeft
          }
        },
        zIndex: computedStyle.zIndex,
        display: computedStyle.display,
        position: computedStyle.position,
        cssPath: getCssPath(element)
      };
    }

    // Function to update tooltip content and position
    function updateTooltip(event) {
      if (!config.showElementInfo || !config.enabled) {
        tooltip.style.display = 'none';
        return;
      }

      const element = event.target;
      const info = getElementInfo(element);

      // Format tooltip content
      const content = `
        <div style="margin-bottom: 5px; font-weight: bold;">${info.tagName}${info.id}${info.classes}</div>
        <div>Size: ${info.dimensions.width}px × ${info.dimensions.height}px</div>
        <div>Position: ${info.coordinates.left}px, ${info.coordinates.top}px</div>
        <div>Z-index: ${info.zIndex}</div>
        <div style="margin-top: 5px;">
          <div>Margin: ${info.boxModel.margin.top} ${info.boxModel.margin.right} ${info.boxModel.margin.bottom} ${info.boxModel.margin.left}</div>
          <div>Border: ${info.boxModel.border.top} ${info.boxModel.border.right} ${info.boxModel.border.bottom} ${info.boxModel.border.left}</div>
          <div>Padding: ${info.boxModel.padding.top} ${info.boxModel.padding.right} ${info.boxModel.padding.bottom} ${info.boxModel.padding.left}</div>
        </div>
        <div style="margin-top: 5px; word-break: break-all; font-size: 10px;">${info.cssPath}</div>
      `;

      tooltip.innerHTML = content;

      // Position tooltip near the cursor
      const x = event.clientX + 15;
      const y = event.clientY + 15;

      // Adjust if tooltip would go off screen
      const tooltipRect = tooltip.getBoundingClientRect();
      const rightEdge = x + tooltipRect.width;
      const bottomEdge = y + tooltipRect.height;

      if (rightEdge > window.innerWidth) {
        tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
      } else {
        tooltip.style.left = `${x}px`;
      }

      if (bottomEdge > window.innerHeight) {
        tooltip.style.top = `${window.innerHeight - tooltipRect.height - 10}px`;
      } else {
        tooltip.style.top = `${y}px`;
      }

      tooltip.style.display = 'block';
    }

    // Apply outline thickness
    function applyOutlineThickness() {
      if (!config.enabled) {
        removeOutlines();
        return;
      }

      // Update CSS custom property
      document.documentElement.style.setProperty('--layout-pest-thickness', config.outlineThickness);
    }

    // Remove outlines
    function removeOutlines() {
      // Remove the CSS custom property
      document.documentElement.style.removeProperty('--layout-pest-thickness');
      document.documentElement.style.removeProperty('--layout-pest-color');
      removeInjectedStylesheet();
    }

    // Enable outlines
    function enableOutlines() {
      config.enabled = true;
      applyOutlineThickness();
      saveConfig();
    }

    // Disable outlines
    function disableOutlines() {
      config.enabled = false;
      removeOutlines();
      hideTooltip();
      if (tooltip) {
        tooltip.remove();
        tooltip = null;
      }
      saveConfig();
    }

    // Event listeners
    document.addEventListener('mousemove', updateTooltip);
    document.addEventListener('mouseout', hideTooltip);

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      try {
        if (message.action === 'ping') {
          sendResponse({ success: true, state: config });
          return true;
        } else if (message.action === 'cleanup') {
          cleanup();
          sendResponse({ success: true });
          return true;
        } else if (message.action === 'enableOutlines') {
          enableOutlines();
          createTooltip();
        } else if (message.action === 'disableOutlines') {
          disableOutlines();
        } else if (message.action === 'toggleElementInfo') {
          config.showElementInfo = message.value;
          saveConfig();
        } else if (message.action === 'updateOutlineThickness') {
          config.outlineThickness = message.thickness;
          applyOutlineThickness();
          saveConfig();
        }

        sendResponse({ success: true, state: config });
        return true;
      } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ success: false, error: error.message });
        return true;
      }
    });
  })();
}
