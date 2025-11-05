// Redmine API integration module

class RedmineAPI {
  constructor(serverUrl, apiKey) {
    this.serverUrl = serverUrl?.trim().replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey?.trim();
  }

  async request(endpoint, options = {}) {
    if (!this.serverUrl || !this.apiKey) {
      throw new Error('Redmine server URL and API key are required');
    }

    const url = `${this.serverUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-Redmine-API-Key': this.apiKey,
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Redmine API Error (${response.status}): ${errorText}`);
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  }

  // Test connection to Redmine server
  async testConnection() {
    try {
      await this.request('/users/current.json');
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Get all projects (with pagination to fetch complete list)
  async getProjects() {
    const allProjects = [];
    let offset = 0;
    const limit = 100; // Fetch 100 projects per request
    let totalCount = 0;

    do {
      const data = await this.request(`/projects.json?limit=${limit}&offset=${offset}`);
      const projects = data.projects || [];
      allProjects.push(...projects);

      totalCount = data.total_count || projects.length;
      offset += limit;

      // Break if we've fetched all projects
      if (allProjects.length >= totalCount || projects.length === 0) {
        break;
      }
    } while (true);

    return allProjects;
  }

  // Get project details including trackers, priorities, etc.
  async getProject(projectId) {
    const data = await this.request(`/projects/${projectId}.json?include=trackers,issue_categories,enabled_modules`);
    return data.project;
  }

  // Get trackers
  async getTrackers() {
    const data = await this.request('/trackers.json');
    return data.trackers || [];
  }

  // Get issue priorities
  async getPriorities() {
    const data = await this.request('/enumerations/issue_priorities.json');
    return data.issue_priorities || [];
  }

  // Get issue statuses
  async getStatuses() {
    const data = await this.request('/issue_statuses.json');
    return data.issue_statuses || [];
  }

  // Get project versions/milestones
  async getVersions(projectId) {
    const data = await this.request(`/projects/${projectId}/versions.json`);
    return data.versions || [];
  }

  // Get project members (for assignee selection) with pagination
  async getProjectMembers(projectId) {
    const allMembers = [];
    let offset = 0;
    const limit = 100;
    let totalCount = 0;

    do {
      const data = await this.request(`/projects/${projectId}/memberships.json?limit=${limit}&offset=${offset}`);
      const members = data.memberships || [];
      allMembers.push(...members);

      totalCount = data.total_count || members.length;
      offset += limit;

      if (allMembers.length >= totalCount || members.length === 0) {
        break;
      }
    } while (true);

    return allMembers;
  }

  // Get project issue categories
  async getIssueCategories(projectId) {
    const data = await this.request(`/projects/${projectId}/issue_categories.json`);
    return data.issue_categories || [];
  }

  // Create a new issue
  async createIssue(issueData) {
    const data = await this.request('/issues.json', {
      method: 'POST',
      body: JSON.stringify({ issue: issueData })
    });
    return data.issue;
  }

  // Upload a file and return the token
  async uploadFile(file) {
    // Validate file
    if (!file || file.size === 0) {
      throw new Error(`Cannot upload empty file: ${file?.name || 'unknown'}`);
    }

    console.log(`[Redmine API] Uploading file: ${file.name} (${file.size} bytes, type: ${file.type})`);

    const headers = {
      'Content-Type': 'application/octet-stream', // Redmine requires this for ALL uploads
      'X-Redmine-API-Key': this.apiKey
    };

    const response = await fetch(`${this.serverUrl}/uploads.json?filename=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers,
      body: file
    });

    if (!response.ok) {
      // Get detailed error message from Redmine
      let errorDetails = '';
      try {
        const errorText = await response.text();
        errorDetails = errorText ? ` - ${errorText}` : '';
      } catch (e) {
        // Ignore if we can't read the response
      }
      throw new Error(`File upload failed for "${file.name}": ${response.status}${errorDetails}`);
    }

    const data = await response.json();
    console.log(`[Redmine API] File uploaded successfully: ${file.name}, token: ${data.upload?.token}`);
    return data.upload;
  }

  // Convert base64 to blob for file upload
  base64ToBlob(base64Data, contentType = '') {
    const byteCharacters = atob(base64Data.split(',')[1]);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);

      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  }

  // Create issue with attachments
  async createIssueWithAttachments(issueData, attachments = []) {
    try {
      console.log(`[Redmine API] Creating issue with ${attachments.length} attachment(s)`);

      // Upload all attachments first
      const uploadTokens = [];

      for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i];
        console.log(`[Redmine API] Processing attachment ${i + 1}/${attachments.length}: ${attachment.filename}`);

        let fileBlob;

        if (attachment.data && attachment.data.startsWith('data:')) {
          // Convert base64 to blob
          fileBlob = this.base64ToBlob(attachment.data, attachment.type || 'image/png');
        } else if (attachment.blob) {
          fileBlob = attachment.blob;
        } else {
          console.warn(`[Redmine API] Skipping attachment ${attachment.filename}: no data or blob`);
          continue;
        }

        // Create File object from Blob
        const file = new File([fileBlob], attachment.filename, { type: attachment.type || 'image/png' });

        try {
          const upload = await this.uploadFile(file);

          uploadTokens.push({
            token: upload.token,
            filename: attachment.filename,
            content_type: attachment.type || 'image/png'
          });
        } catch (uploadError) {
          console.error(`[Redmine API] Failed to upload ${attachment.filename}:`, uploadError);
          throw uploadError; // Re-throw to stop the process
        }
      }

      // Add upload tokens to issue data
      if (uploadTokens.length > 0) {
        console.log(`[Redmine API] Attaching ${uploadTokens.length} file(s) to issue`);
        issueData.uploads = uploadTokens;
      }

      // Create the issue
      console.log(`[Redmine API] Creating issue in project ${issueData.project_id}`);
      const issue = await this.createIssue(issueData);
      console.log(`[Redmine API] Issue created successfully: #${issue.id}`);
      return issue;
    } catch (error) {
      console.error('[Redmine API] Error creating issue with attachments:', error);
      throw error;
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RedmineAPI;
}
