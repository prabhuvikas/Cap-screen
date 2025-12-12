// Redmine API integration module

class RedmineAPI {
  constructor(serverUrl, apiKey) {
    this.serverUrl = serverUrl?.trim().replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey?.trim();
  }

  // Sanitize filename to remove unicode and special characters that cause 500 errors
  sanitizeFilename(filename) {
    if (!filename) return 'file';

    // Replace unicode and special characters with safe ASCII equivalents
    return filename
      .normalize('NFD') // Decompose unicode characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, ''); // Trim leading/trailing underscores
  }

  // Sanitize text content to remove problematic unicode characters
  // Redmine with standard UTF-8 (not utf8mb4) cannot handle 4-byte UTF-8 characters
  sanitizeContent(content) {
    if (!content) return content;

    // Convert to string if not already
    const text = typeof content === 'string' ? content : String(content);

    // Remove 4-byte UTF-8 characters (emojis) that cause MySQL errors
    // Standard UTF-8 in MySQL only supports up to 3 bytes
    let sanitized = text.replace(/[\uD800-\uDFFF]/g, ''); // Remove surrogate pairs (4-byte UTF-8)

    // Replace problematic unicode characters with safe equivalents
    sanitized = sanitized
      .normalize('NFD') // Decompose unicode characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[\u2018\u2019]/g, "'") // Smart single quotes to regular quotes
      .replace(/[\u201C\u201D]/g, '"') // Smart double quotes to regular quotes
      .replace(/[\u2013\u2014]/g, '-') // Em/en dashes to hyphens
      .replace(/[\u2026]/g, '...') // Ellipsis to three dots
      .replace(/[\u2022]/g, '*') // Bullet point to asterisk
      .replace(/[\u00A0]/g, ' ') // Non-breaking space to regular space
      .replace(/[^\x00-\x7F]/g, ''); // Remove ALL remaining non-ASCII

    // Normalize line endings: convert CRLF (\r\n) to LF (\n) for consistency
    sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    return sanitized;
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

    // Log request for debugging
    if (options.method === 'POST' && options.body) {
      console.log(`[Redmine API] POST ${endpoint}`);
      console.log('[Redmine API] Request body:', options.body.substring(0, 500)); // First 500 chars
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    console.log(`[Redmine API] Response status: ${response.status} ${response.statusText}`);
    console.log('[Redmine API] Response ok:', response.ok);
    console.log('[Redmine API] Response headers:', JSON.stringify([...response.headers.entries()]));

    // Try to read response body regardless of status
    let responseBody;
    let responseText;
    try {
      responseText = await response.text();
      console.log('[Redmine API] Response body (first 1000 chars):', responseText.substring(0, 1000));

      if (responseText) {
        responseBody = JSON.parse(responseText);
      }
    } catch (e) {
      console.error('[Redmine API] Failed to parse response:', e);
    }

    if (!response.ok) {
      console.error(`[Redmine API] Error response from ${endpoint}:`, responseText);
      throw new Error(`Redmine API Error (${response.status}): ${responseText}`);
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return null;
    }

    return responseBody;
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

  // Get issues with filters (for searching/browsing existing issues)
  async getIssues(filters = {}) {
    const params = new URLSearchParams();

    // Add common filters
    if (filters.project_id) params.append('project_id', filters.project_id);
    if (filters.status_id) params.append('status_id', filters.status_id);
    if (filters.assigned_to_id) params.append('assigned_to_id', filters.assigned_to_id);
    if (filters.subject) params.append('subject', `~${filters.subject}`); // ~ for partial match

    // Add pagination
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    params.append('limit', limit);
    params.append('offset', offset);

    // Sort by updated date by default
    const sort = filters.sort || 'updated_on:desc';
    params.append('sort', sort);

    const queryString = params.toString();
    const data = await this.request(`/issues.json?${queryString}`);

    return {
      issues: data.issues || [],
      total_count: data.total_count || 0,
      offset: data.offset || 0,
      limit: data.limit || limit
    };
  }

  // Get a single issue with full details
  async getIssue(issueId, include = []) {
    const includeParam = include.length > 0 ? `?include=${include.join(',')}` : '';
    const data = await this.request(`/issues/${issueId}.json${includeParam}`);
    return data.issue;
  }

  // Update an existing issue (add notes/comments with attachments)
  async updateIssue(issueId, updates, attachments = []) {
    try {
      console.log(`[Redmine API] Updating issue #${issueId} with ${attachments.length} attachment(s)`);

      // Sanitize note text if present
      const sanitizedUpdates = { ...updates };
      if (updates.notes) {
        sanitizedUpdates.notes = this.sanitizeContent(updates.notes);
      }

      // Upload all attachments first (same process as creating issues)
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

        // Create File object from Blob with sanitized filename
        const sanitizedFilename = this.sanitizeFilename(attachment.filename);
        const file = new File([fileBlob], sanitizedFilename, { type: attachment.type || 'image/png' });

        try {
          const upload = await this.uploadFile(file);

          uploadTokens.push({
            token: upload.token,
            filename: sanitizedFilename,
            content_type: attachment.type || 'image/png'
          });
        } catch (uploadError) {
          console.error(`[Redmine API] Failed to upload ${attachment.filename}:`, uploadError);
          throw uploadError;
        }
      }

      // Add upload tokens to update data
      if (uploadTokens.length > 0) {
        console.log(`[Redmine API] Attaching ${uploadTokens.length} file(s) to issue update`);
        sanitizedUpdates.uploads = uploadTokens;
      }

      // Update the issue (PUT returns 204 No Content on success)
      console.log(`[Redmine API] Updating issue #${issueId}`);
      await this.request(`/issues/${issueId}.json`, {
        method: 'PUT',
        body: JSON.stringify({ issue: sanitizedUpdates })
      });

      console.log(`[Redmine API] Issue #${issueId} updated successfully`);

      // Fetch and return the updated issue
      return await this.getIssue(issueId);
    } catch (error) {
      console.error(`[Redmine API] Error updating issue #${issueId}:`, error);
      throw error;
    }
  }

  // Create a new issue
  async createIssue(issueData) {
    // Sanitize text fields to prevent 500 errors from unicode
    const sanitizedIssueData = {
      ...issueData,
      subject: this.sanitizeContent(issueData.subject),
      description: this.sanitizeContent(issueData.description)
    };

    // Normalize custom fields to use empty string instead of null for consistency with manual issue creation
    if (sanitizedIssueData.custom_fields && Array.isArray(sanitizedIssueData.custom_fields)) {
      sanitizedIssueData.custom_fields = sanitizedIssueData.custom_fields.map(field => ({
        ...field,
        value: field.value === null || field.value === undefined ? '' : field.value
      }));
    }

    // Debug: Check for any non-ASCII characters that might remain
    const checkForNonASCII = (str, fieldName) => {
      if (!str) return;
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code > 127) {
          console.warn(`[Redmine API] Non-ASCII character found in ${fieldName} at position ${i}: '${str[i]}' (code: ${code})`);
          console.warn(`[Redmine API] Context: ...${str.substring(Math.max(0, i-20), i+20)}...`);
        }
      }
    };

    checkForNonASCII(sanitizedIssueData.subject, 'subject');
    checkForNonASCII(sanitizedIssueData.description, 'description');

    console.log('[Redmine API] Creating issue with data:', JSON.stringify(sanitizedIssueData, null, 2));

    const data = await this.request('/issues.json', {
      method: 'POST',
      body: JSON.stringify({ issue: sanitizedIssueData })
    });
    return data.issue;
  }

  // Upload a file and return the token
  async uploadFile(file) {
    // Validate file
    if (!file || file.size === 0) {
      throw new Error(`Cannot upload empty file: ${file?.name || 'unknown'}`);
    }

    // Sanitize filename to prevent 500 errors from unicode characters
    const sanitizedFilename = this.sanitizeFilename(file.name);
    console.log(`[Redmine API] Uploading file: ${file.name} -> ${sanitizedFilename} (${file.size} bytes, type: ${file.type})`);

    const headers = {
      'Content-Type': 'application/octet-stream', // Redmine requires this for ALL uploads
      'X-Redmine-API-Key': this.apiKey
    };

    const response = await fetch(`${this.serverUrl}/uploads.json?filename=${encodeURIComponent(sanitizedFilename)}`, {
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
      throw new Error(`File upload failed for "${sanitizedFilename}": ${response.status}${errorDetails}`);
    }

    const data = await response.json();
    console.log(`[Redmine API] File uploaded successfully: ${sanitizedFilename}, token: ${data.upload?.token}`);
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

        // Create File object from Blob with sanitized filename
        const sanitizedFilename = this.sanitizeFilename(attachment.filename);
        const file = new File([fileBlob], sanitizedFilename, { type: attachment.type || 'image/png' });

        try {
          const upload = await this.uploadFile(file);

          uploadTokens.push({
            token: upload.token,
            filename: sanitizedFilename, // Use sanitized filename to match what was uploaded
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
