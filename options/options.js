// Options page JavaScript

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  await loadSettings();

  // Setup event listeners
  document.getElementById('testConnection').addEventListener('click', testConnection);
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('resetSettings').addEventListener('click', resetSettings);
  document.getElementById('redmineUrl').addEventListener('input', clearConnectionStatus);
  document.getElementById('apiKey').addEventListener('input', clearConnectionStatus);
});

// Load settings from storage
async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get({
      redmineUrl: '',
      apiKey: '',
      defaultProject: '',
      defaultPriority: '',
      defaultAssignee: '',
      includeNetworkRequests: true,
      includeConsoleLogs: true,
      includeLocalStorage: false,
      includeCookies: false,
      sanitizeSensitiveData: true,
      screenshotQuality: 'medium',
      autoFullPageScreenshot: false
    });

    // Populate form fields
    document.getElementById('redmineUrl').value = settings.redmineUrl;
    document.getElementById('apiKey').value = settings.apiKey;
    document.getElementById('includeNetworkRequests').checked = settings.includeNetworkRequests;
    document.getElementById('includeConsoleLogs').checked = settings.includeConsoleLogs;
    document.getElementById('includeLocalStorage').checked = settings.includeLocalStorage;
    document.getElementById('includeCookies').checked = settings.includeCookies;
    document.getElementById('sanitizeSensitiveData').checked = settings.sanitizeSensitiveData;
    document.getElementById('screenshotQuality').value = settings.screenshotQuality;
    document.getElementById('autoFullPageScreenshot').checked = settings.autoFullPageScreenshot;

    // Load projects if credentials exist
    if (settings.redmineUrl && settings.apiKey) {
      await loadProjects(settings.redmineUrl, settings.apiKey, settings.defaultProject);
      await loadPriorities(settings.redmineUrl, settings.apiKey, settings.defaultPriority);

      // Load members if default project is selected
      if (settings.defaultProject) {
        await loadMembers(settings.redmineUrl, settings.apiKey, settings.defaultProject, settings.defaultAssignee);
      }
    }

    // Add event listener for project change to reload members
    document.getElementById('defaultProject').addEventListener('change', async (e) => {
      const projectId = e.target.value;
      const redmineUrl = document.getElementById('redmineUrl').value.trim();
      const apiKey = document.getElementById('apiKey').value.trim();

      if (projectId && redmineUrl && apiKey) {
        await loadMembers(redmineUrl, apiKey, projectId);
      } else {
        // Clear assignee dropdown if no project selected
        const assigneeSelect = document.getElementById('defaultAssignee');
        assigneeSelect.innerHTML = '<option value="">-- Select Assignee --</option>';
      }
    });
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('saveStatus', 'Error loading settings', 'error');
  }
}

// Test connection to Redmine
async function testConnection() {
  const button = document.getElementById('testConnection');
  const btnText = button.querySelector('.btn-text');
  const spinner = button.querySelector('.spinner');
  const statusEl = document.getElementById('connectionStatus');

  const redmineUrl = document.getElementById('redmineUrl').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();

  if (!redmineUrl || !apiKey) {
    showStatus('connectionStatus', 'Please enter both URL and API key', 'error');
    return;
  }

  try {
    // Show loading state
    button.disabled = true;
    btnText.textContent = 'Testing...';
    spinner.classList.remove('hidden');
    statusEl.textContent = '';
    statusEl.className = 'status-message';

    const api = new RedmineAPI(redmineUrl, apiKey);
    const result = await api.testConnection();

    if (result.success) {
      showStatus('connectionStatus', 'Connection successful!', 'success');

      // Load projects and priorities
      await loadProjects(redmineUrl, apiKey);
      await loadPriorities(redmineUrl, apiKey);
    } else {
      showStatus('connectionStatus', `Connection failed: ${result.message}`, 'error');
    }
  } catch (error) {
    showStatus('connectionStatus', `Connection failed: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
    btnText.textContent = 'Test Connection';
    spinner.classList.add('hidden');
  }
}

// Load projects from Redmine
async function loadProjects(redmineUrl, apiKey, selectedProject = '') {
  try {
    const api = new RedmineAPI(redmineUrl, apiKey);
    const projects = await api.getProjects();

    const select = document.getElementById('defaultProject');
    select.innerHTML = '<option value="">-- Select Project --</option>';

    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      if (project.id === selectedProject || project.identifier === selectedProject) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading projects:', error);
  }
}

// Load priorities from Redmine
async function loadPriorities(redmineUrl, apiKey, selectedPriority = '') {
  try {
    const api = new RedmineAPI(redmineUrl, apiKey);
    const priorities = await api.getPriorities();

    const select = document.getElementById('defaultPriority');
    select.innerHTML = '<option value="">-- Select Priority --</option>';

    priorities.forEach(priority => {
      const option = document.createElement('option');
      option.value = priority.id;
      option.textContent = priority.name;
      if (priority.id === parseInt(selectedPriority)) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading priorities:', error);
  }
}

// Load members from Redmine for a specific project
async function loadMembers(redmineUrl, apiKey, projectId, selectedAssignee = '') {
  try {
    const api = new RedmineAPI(redmineUrl, apiKey);
    const memberships = await api.getProjectMembers(projectId);

    const select = document.getElementById('defaultAssignee');
    select.innerHTML = '<option value="">-- Select Assignee --</option>';

    memberships.forEach(membership => {
      if (membership.user) {
        const option = document.createElement('option');
        option.value = membership.user.id;
        option.textContent = membership.user.name;
        if (membership.user.id === parseInt(selectedAssignee)) {
          option.selected = true;
        }
        select.appendChild(option);
      }
    });
  } catch (error) {
    console.error('Error loading members:', error);
  }
}

// Save settings
async function saveSettings() {
  const button = document.getElementById('saveSettings');
  const btnText = button.querySelector('.btn-text');
  const spinner = button.querySelector('.spinner');

  const settings = {
    redmineUrl: document.getElementById('redmineUrl').value.trim(),
    apiKey: document.getElementById('apiKey').value.trim(),
    defaultProject: document.getElementById('defaultProject').value,
    defaultPriority: document.getElementById('defaultPriority').value,
    defaultAssignee: document.getElementById('defaultAssignee').value,
    includeNetworkRequests: document.getElementById('includeNetworkRequests').checked,
    includeConsoleLogs: document.getElementById('includeConsoleLogs').checked,
    includeLocalStorage: document.getElementById('includeLocalStorage').checked,
    includeCookies: document.getElementById('includeCookies').checked,
    sanitizeSensitiveData: document.getElementById('sanitizeSensitiveData').checked,
    screenshotQuality: document.getElementById('screenshotQuality').value,
    autoFullPageScreenshot: document.getElementById('autoFullPageScreenshot').checked
  };

  try {
    // Show loading state
    button.disabled = true;
    btnText.textContent = 'Saving...';
    spinner.classList.remove('hidden');

    await chrome.storage.sync.set(settings);

    showStatus('saveStatus', 'Settings saved successfully!', 'success');

    // Clear success message after 3 seconds
    setTimeout(() => {
      document.getElementById('saveStatus').textContent = '';
      document.getElementById('saveStatus').className = 'status-message';
    }, 3000);
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('saveStatus', 'Error saving settings', 'error');
  } finally {
    button.disabled = false;
    btnText.textContent = 'Save Settings';
    spinner.classList.add('hidden');
  }
}

// Reset settings to defaults
async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults?')) {
    return;
  }

  const defaultSettings = {
    redmineUrl: '',
    apiKey: '',
    defaultProject: '',
    defaultPriority: '',
    defaultAssignee: '',
    includeNetworkRequests: true,
    includeConsoleLogs: true,
    includeLocalStorage: false,
    includeCookies: false,
    sanitizeSensitiveData: true,
    screenshotQuality: 'medium',
    autoFullPageScreenshot: false
  };

  try {
    await chrome.storage.sync.set(defaultSettings);
    await loadSettings();
    showStatus('saveStatus', 'Settings reset to defaults', 'info');

    setTimeout(() => {
      document.getElementById('saveStatus').textContent = '';
      document.getElementById('saveStatus').className = 'status-message';
    }, 3000);
  } catch (error) {
    console.error('Error resetting settings:', error);
    showStatus('saveStatus', 'Error resetting settings', 'error');
  }
}

// Clear connection status when inputs change
function clearConnectionStatus() {
  const statusEl = document.getElementById('connectionStatus');
  statusEl.textContent = '';
  statusEl.className = 'status-message';
}

// Show status message
function showStatus(elementId, message, type) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `status-message ${type}`;
}
