<<<<<<< HEAD
// Fetch limits function
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

    if (!rateLimitResponse.ok) {
      if (rateLimitResponse.status === 401 || rateLimitResponse.status === 403) {
        throw new Error('Not authenticated. Please log in to Perplexity.ai first.');
      }
      throw new Error(`API error: ${rateLimitResponse.status}`);
    }

    // Fetch user settings for upload limits
    const settingsResponse = await fetch('https://www.perplexity.ai/rest/user/settings', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });

    const rateLimitData = await rateLimitResponse.json();
    let settingsData = {};

    if (settingsResponse.ok) {
      settingsData = await settingsResponse.json();
    } else {
      console.warn('Settings fetch failed:', settingsResponse.status);
    }

    // Validate data structure
    if (typeof rateLimitData.remaining_pro === 'undefined') {
      throw new Error('Unexpected API response format');
    }

    // Combine the data
    const combinedData = {
      ...rateLimitData,
      upload_limit: settingsData.upload_limit ?? null,
      daily_attachment_limit: settingsData.connector_limits?.daily_attachment_limit ?? null,
      weekly_attachment_limit: settingsData.connector_limits?.weekly_attachment_limit ?? null
    };

    // Store the data and timestamp
    await chrome.storage.local.set({
      limitsData: combinedData,
      lastUpdated: Date.now(),
      lastError: null
    });

    // Update badge immediately
    chrome.runtime.sendMessage({ action: 'updateBadge', count: combinedData.remaining_pro }).catch(() => {
      // Service worker might be inactive, that's ok
    });

    return combinedData;

  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
=======
// Escape API-supplied values before inserting them into HTML (XSS protection)
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Ask the background worker to refresh limits (single data-fetch path),
// then read back the freshly stored result.
async function requestLimits() {
  const response = await chrome.runtime.sendMessage({ action: 'fetchNow' });

  if (!response || !response.success) {
    throw new Error('Background refresh failed. Please try again.');
  }

  const result = await chrome.storage.local.get(['limitsData', 'lastUpdated', 'lastError']);

  if (result.lastError) {
    throw new Error(result.lastError);
  }
  if (!result.limitsData) {
    throw new Error('No data available. Please try again.');
  }

  return { data: result.limitsData, lastUpdated: result.lastUpdated };
>>>>>>> security-reinforcement
}

function displayLimits(data, lastUpdated) {
  const content = document.getElementById('content');

  const limits = [
    { label: 'Pro Searches', value: data.remaining_pro ?? 'N/A', highlight: true },
    { label: 'Research', value: data.remaining_research ?? 'N/A' },
    { label: 'Labs', value: data.remaining_labs ?? 'N/A' },
    { label: 'Agentic Research', value: data.remaining_agentic_research ?? 'N/A' },
    { label: 'Upload Limit', value: data.upload_limit ?? 'N/A', highlight: true },
    { label: 'Daily Attachments', value: data.daily_attachment_limit ?? 'N/A' },
    { label: 'Weekly Attachments', value: data.weekly_attachment_limit ?? 'Unlimited' }
  ];

  let html = '';
  limits.forEach(limit => {
    const valueClass = limit.highlight ? 'limit-value highlight' : 'limit-value';
    html += `
      <div class="limit-item">
<<<<<<< HEAD
        <div class="limit-label">${limit.label}</div>
        <div class="${valueClass}">${limit.value}</div>
=======
        <div class="limit-label">${escapeHtml(limit.label)}</div>
        <div class="${valueClass}">${escapeHtml(limit.value)}</div>
>>>>>>> security-reinforcement
      </div>
    `;
  });

  const lastUpdateText = lastUpdated 
    ? new Date(lastUpdated).toLocaleTimeString()
    : 'Never';

  content.innerHTML = html;
  document.getElementById('last-update').textContent = lastUpdateText;
}

function showError(message) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="error-message">
      <div style="font-size: 24px; margin-bottom: 8px;">⚠️</div>
<<<<<<< HEAD
      <div>${message}</div>
=======
      <div>${escapeHtml(message)}</div>
>>>>>>> security-reinforcement
    </div>
  `;
}

function showLoading() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <div>Loading limits...</div>
    </div>
  `;
}

<<<<<<< HEAD
// Load cached data or fetch fresh data
=======
// Load cached data or request a fresh fetch from the background worker
>>>>>>> security-reinforcement
async function initialize() {
  const refreshBtn = document.getElementById('refresh');

  // Try to load cached data first
  const result = await chrome.storage.local.get(['limitsData', 'lastUpdated', 'lastError']);

  if (result.lastError) {
<<<<<<< HEAD
    showError(result.lastError);
    return;
  }

  if (result.limitsData) {
=======
    // Stale error from a previous run: show it, but let the user retry below
    showError(result.lastError);
  } else if (result.limitsData) {
>>>>>>> security-reinforcement
    displayLimits(result.limitsData, result.lastUpdated);
  } else {
    showLoading();
    try {
<<<<<<< HEAD
      const data = await fetchLimits();
      displayLimits(data, Date.now());
    } catch (error) {
      showError(error.message);
      await chrome.storage.local.set({ lastError: error.message });
    }
  }

  // Setup refresh button
=======
      const { data, lastUpdated } = await requestLimits();
      displayLimits(data, lastUpdated);
    } catch (error) {
      showError(error.message);
    }
  }

  // Setup refresh button (kept enabled after errors so retries are possible)
>>>>>>> security-reinforcement
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Refreshing...';

    try {
      showLoading();
<<<<<<< HEAD
      const data = await fetchLimits();
      displayLimits(data, Date.now());
      await chrome.storage.local.set({ lastError: null });
    } catch (error) {
      showError(error.message);
      await chrome.storage.local.set({ lastError: error.message });
=======
      const { data, lastUpdated } = await requestLimits();
      displayLimits(data, lastUpdated);
    } catch (error) {
      showError(error.message);
>>>>>>> security-reinforcement
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Refresh Now';
    }
  });
}

// Initialize when popup opens
document.addEventListener('DOMContentLoaded', initialize);