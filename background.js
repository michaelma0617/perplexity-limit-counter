// Fetch limits from both APIs
async function fetchLimits() {
  try {
    // Fetch rate limits
    const rateLimitResponse = await fetch('https://www.perplexity.ai/rest/rate-limit/all', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });

    // Fetch user settings for upload limits
    const settingsResponse = await fetch('https://www.perplexity.ai/rest/user/settings', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!rateLimitResponse.ok) {
      const errorMessage = rateLimitResponse.status === 401 || rateLimitResponse.status === 403
        ? 'Not authenticated. Please log in to Perplexity.ai first.'
        : `API error: ${rateLimitResponse.status}`;
      console.error('Rate limit fetch failed:', rateLimitResponse.status);
      await chrome.storage.local.set({ lastError: errorMessage });
      updateBadge('?');
      return null;
    }

    const rateLimitData = await rateLimitResponse.json();

    // Validate data structure before storing it
    if (typeof rateLimitData.remaining_pro === 'undefined') {
      console.error('Unexpected API response format:', rateLimitData);
      await chrome.storage.local.set({ lastError: 'Unexpected API response format' });
      updateBadge('?');
      return null;
    }

    let settingsData = {};

    // Settings might fail if endpoint requires different auth
    if (settingsResponse.ok) {
      settingsData = await settingsResponse.json();
    } else {
      console.warn('Settings fetch failed:', settingsResponse.status);
    }

    // Combine the data
    const combinedData = {
      ...rateLimitData,
      upload_limit: settingsData.upload_limit ?? null,
      daily_attachment_limit: settingsData.connector_limits?.daily_attachment_limit ?? null,
      weekly_attachment_limit: settingsData.connector_limits?.weekly_attachment_limit ?? null
    };

    // Store the data
    await chrome.storage.local.set({
      limitsData: combinedData,
      lastUpdated: Date.now(),
      lastError: null
    });

    // Update badge
    updateBadge(combinedData.remaining_pro);
    console.log('Limits updated:', combinedData.remaining_pro, 'Pro searches remaining');
    return combinedData;

  } catch (error) {
    console.error('Fetch error:', error);
    await chrome.storage.local.set({ lastError: error.message });
    updateBadge('?');
    return null;
  }
}

// Update badge function
function updateBadge(count) {
  const text = count === null || count === undefined ? '?' : String(count);
  chrome.action.setBadgeText({ text: text });
  chrome.action.setBadgeBackgroundColor({ color: '#20808d' });
}

// Create alarm for auto-refresh (every 30 seconds)
function setupAutoRefresh() {
  chrome.alarms.create('autoRefresh', {
    periodInMinutes: 0.5
  });
  console.log('Auto-refresh alarm created (every 30 seconds)');
}

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'autoRefresh') {
    console.log('Auto-refreshing limits...');
    fetchLimits();
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateBadge' && typeof request.count !== 'undefined') {
    updateBadge(request.count);
  } else if (request.action === 'fetchNow') {
    fetchLimits().then(data => {
      sendResponse({ success: true, data: data });
    }).catch(() => {
      sendResponse({ success: false });
    });
    return true; // Keep channel open for async response
  }
});

// Listen for storage changes (from popup)
chrome.storage.local.onChanged.addListener((changes) => {
  if (changes.limitsData && changes.limitsData.newValue) {
    const remaining_pro = changes.limitsData.newValue.remaining_pro;
    updateBadge(remaining_pro);
  }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed, setting up auto-refresh...');
  setupAutoRefresh();
  // Fetch immediately
  fetchLimits();
  // Also check if we have cached data
  chrome.storage.local.get(['limitsData'], (result) => {
    if (result.limitsData?.remaining_pro !== undefined) {
      updateBadge(result.limitsData.remaining_pro);
    } else {
      updateBadge('?');
    }
  });
});

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started, resuming auto-refresh...');
  setupAutoRefresh();
  fetchLimits();
  chrome.storage.local.get(['limitsData'], (result) => {
    if (result.limitsData?.remaining_pro !== undefined) {
      updateBadge(result.limitsData.remaining_pro);
    }
  });
});