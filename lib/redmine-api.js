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
    const headers = {
      'Content-Type': 'application/octet-stream',
      'X-Redmine-API-Key': this.apiKey
    };

    const response = await fetch(`${this.serverUrl}/uploads.json?filename=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers,
      body: file
    });

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.status}`);
    }

    const data = await response.json();
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
      // Upload all attachments first
      const uploadTokens = [];

      for (const attachment of attachments) {
        let fileBlob;

        if (attachment.data && attachment.data.startsWith('data:')) {
          // Convert base64 to blob
          fileBlob = this.base64ToBlob(attachment.data, attachment.type || 'image/png');
        } else if (attachment.blob) {
          fileBlob = attachment.blob;
        } else {
          continue;
        }

        // Create File object from Blob
        const file = new File([fileBlob], attachment.filename, { type: attachment.type || 'image/png' });
        const upload = await this.uploadFile(file);

        uploadTokens.push({
          token: upload.token,
          filename: attachment.filename,
          content_type: attachment.type || 'image/png'
        });
      }

      // Add upload tokens to issue data
      if (uploadTokens.length > 0) {
        issueData.uploads = uploadTokens;
      }

      // Create the issue
      const issue = await this.createIssue(issueData);
      return issue;
    } catch (error) {
      console.error('Error creating issue with attachments:', error);
      throw error;
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RedmineAPI;
}
