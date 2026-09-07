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
        <div class="limit-label">${escapeHtml(limit.label)}</div>
        <div class="${valueClass}">${escapeHtml(limit.value)}</div>
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
      <div>${escapeHtml(message)}</div>
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

// Load cached data or request a fresh fetch from the background worker
async function initialize() {
  const refreshBtn = document.getElementById('refresh');

  // Try to load cached data first
  const result = await chrome.storage.local.get(['limitsData', 'lastUpdated', 'lastError']);

  if (result.lastError) {
    // Stale error from a previous run: show it, but let the user retry below
    showError(result.lastError);
  } else if (result.limitsData) {
    displayLimits(result.limitsData, result.lastUpdated);
  } else {
    showLoading();
    try {
      const { data, lastUpdated } = await requestLimits();
      displayLimits(data, lastUpdated);
    } catch (error) {
      showError(error.message);
    }
  }

  // Setup refresh button (kept enabled after errors so retries are possible)
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Refreshing...';

    try {
      showLoading();
      const { data, lastUpdated } = await requestLimits();
      displayLimits(data, lastUpdated);
    } catch (error) {
      showError(error.message);
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Refresh Now';
    }
  });
}

// Initialize when popup opens
document.addEventListener('DOMContentLoaded', initialize);