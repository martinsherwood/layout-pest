// Layout Pest Background Script
// Handles extension state and content script injection

// Track extension state per tab
const tabStates = new Map();

// Function to safely send a message to a tab
async function sendMessageToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    console.log('Error sending message to tab:', error);
    return null;
  }
}

// Function to check if content script is injected and get its state
async function isContentScriptInjected(tabId) {
  try {
    const response = await sendMessageToTab(tabId, { action: 'ping' });
    return { injected: !!response, state: response?.state };
  } catch (error) {
    console.error('Error checking content script:', error);
    return { injected: false };
  }
}

// Function to cleanup tab
async function cleanupTab(tabId) {
  try {
    await sendMessageToTab(tabId, { action: 'cleanup' });
    await chrome.scripting.removeCSS({
      target: { tabId },
      files: ['styles/layout-pest.css']
    });
  } catch (e) {
    // Ignore errors as the content script or CSS might not exist
  }
}

// Function to inject content script and CSS
async function injectContentScript(tabId) {
  try {
    // Check if we can inject into this tab
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || !tab.url.startsWith('http')) {
      return false;
    }

    // Clean up any existing content script and CSS
    await cleanupTab(tabId);

    // Wait a bit for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Inject CSS first
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['styles/layout-pest.css']
    });

    // Then inject the content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });

    // Wait a bit for the content script to initialize
    await new Promise(resolve => setTimeout(resolve, 100));

    return true;
  } catch (error) {
    console.error('Error injecting content script:', error);
    return false;
  }
}

// Function to update all context menus
async function updateAllContextMenus(tabId) {
  try {
    const { injected, state } = await isContentScriptInjected(tabId);
    if (!injected) return;

    // Update extension icon context menu
    chrome.contextMenus.update('toggleElementInfo', {
      checked: state.showElementInfo
    });

    // Update page context menu
    chrome.contextMenus.update('toggleOutlines', {
      checked: state.enabled
    });

    chrome.contextMenus.update('toggleElementInfoPage', {
      checked: state.showElementInfo
    });

    const thicknessItems = ['1px', '2px', '3px', '4px', '5px'];
    thicknessItems.forEach(thickness => {
      // Update extension icon menu items
      chrome.contextMenus.update(`thickness_${thickness}`, {
        checked: state.outlineThickness === thickness
      });
      // Update page menu items
      chrome.contextMenus.update(`thickness_page_${thickness}`, {
        checked: state.outlineThickness === thickness
      });
    });
  } catch (error) {
    console.error('Error updating context menus:', error);
  }
}

// Function to toggle extension state
async function toggleExtension(tab) {
  if (!tab || !tab.id) return;

  const tabId = tab.id;
  const isActive = !tabStates.get(tabId);

  try {
    if (isActive) {
      // Always try to inject the content script when enabling
      const success = await injectContentScript(tabId);
      if (!success) {
        console.error('Failed to inject content script');
        return;
      }

      await sendMessageToTab(tabId, { action: 'enableOutlines' });
      chrome.action.setIcon({
        tabId,
        path: {
          '16': 'images/icon_16_active.png',
          '48': 'images/icon_48_active.png',
          '128': 'images/icon_128_active.png'
        }
      });
    } else {
      await cleanupTab(tabId);
      chrome.action.setIcon({
        tabId,
        path: {
          '16': 'images/icon_16_bright.png',
          '48': 'images/icon_48_bright.png',
          '128': 'images/icon_128_bright.png'
        }
      });
    }

    tabStates.set(tabId, isActive);
    await updateAllContextMenus(tabId);
  } catch (error) {
    console.error('Error toggling extension:', error);
    // Reset tab state on error
    tabStates.delete(tabId);
  }
}

// Function to toggle element info
async function toggleElementInfo(tab, value) {
  if (!tab || !tab.id) return;

  try {
    const { injected } = await isContentScriptInjected(tab.id);
    if (!injected) return;

    await chrome.tabs.sendMessage(tab.id, {
      action: 'toggleElementInfo',
      value
    });
    await updateAllContextMenus(tab.id);
  } catch (error) {
    console.error('Error toggling element info:', error);
  }
}

// Function to update outline thickness
async function updateOutlineThickness(tab, thickness) {
  if (!tab || !tab.id) return;

  try {
    const { injected } = await isContentScriptInjected(tab.id);
    if (!injected) return;

    await chrome.tabs.sendMessage(tab.id, {
      action: 'updateOutlineThickness',
      thickness
    });
    await updateAllContextMenus(tab.id);
  } catch (error) {
    console.error('Error updating outline thickness:', error);
  }
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu items for extension icon
  chrome.contextMenus.create({
    id: 'toggleElementInfo',
    title: 'Show Element Info',
    type: 'checkbox',
    checked: true,
    contexts: ['action']
  });

  chrome.contextMenus.create({
    id: 'outlineThickness',
    title: 'Outline Thickness',
    contexts: ['action']
  });

  ['1px', '2px', '3px', '4px', '5px'].forEach(thickness => {
    chrome.contextMenus.create({
      id: `thickness_${thickness}`,
      parentId: 'outlineThickness',
      title: thickness,
      type: 'radio',
      checked: thickness === '1px',
      contexts: ['action']
    });
  });

  // Create context menu items for webpage
  chrome.contextMenus.create({
    id: 'layoutPestPage',
    title: 'Layout Pest',
    contexts: ['page', 'selection', 'link', 'image', 'video', 'audio']
  });

  chrome.contextMenus.create({
    id: 'toggleOutlines',
    parentId: 'layoutPestPage',
    title: 'Toggle Outlines',
    type: 'checkbox',
    contexts: ['page', 'selection', 'link', 'image', 'video', 'audio']
  });

  chrome.contextMenus.create({
    id: 'toggleElementInfoPage',
    parentId: 'layoutPestPage',
    title: 'Show Element Info',
    type: 'checkbox',
    checked: true,
    contexts: ['page', 'selection', 'link', 'image', 'video', 'audio']
  });

  chrome.contextMenus.create({
    id: 'outlineThicknessPage',
    parentId: 'layoutPestPage',
    title: 'Outline Thickness',
    contexts: ['page', 'selection', 'link', 'image', 'video', 'audio']
  });

  ['1px', '2px', '3px', '4px', '5px'].forEach(thickness => {
    chrome.contextMenus.create({
      id: `thickness_page_${thickness}`,
      parentId: 'outlineThicknessPage',
      title: thickness,
      type: 'radio',
      checked: thickness === '1px',
      contexts: ['page', 'selection', 'link', 'image', 'video', 'audio']
    });
  });
});

// Handle extension button click
chrome.action.onClicked.addListener(async (tab) => {
  await toggleExtension(tab);
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab) return;

  // Handle extension icon menu items
  if (info.menuItemId === 'toggleElementInfo') {
    await toggleElementInfo(tab, info.checked);
  } else if (info.menuItemId.startsWith('thickness_') && !info.menuItemId.includes('page')) {
    const thickness = info.menuItemId.replace('thickness_', '');
    await updateOutlineThickness(tab, thickness);
  }
  // Handle page context menu items
  else if (info.menuItemId === 'toggleOutlines') {
    await toggleExtension(tab);
  } else if (info.menuItemId === 'toggleElementInfoPage') {
    await toggleElementInfo(tab, info.checked);
  } else if (info.menuItemId.startsWith('thickness_page_')) {
    const thickness = info.menuItemId.replace('thickness_page_', '');
    await updateOutlineThickness(tab, thickness);
  }
});

// Clean up tab state when tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await cleanupTab(tabId);
  tabStates.delete(tabId);
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    const isActive = tabStates.get(tabId);
    if (isActive) {
      chrome.tabs.get(tabId, async (tab) => {
        if (chrome.runtime.lastError || !tab) return;
        await toggleExtension(tab);
      });
    }
  }
});

// Update context menu state when tab is activated
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateAllContextMenus(activeInfo.tabId);
});
