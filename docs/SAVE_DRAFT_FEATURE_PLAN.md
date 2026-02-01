# Save Draft Feature - Implementation Plan

## Overview

This document outlines the plan for implementing a "Save Draft" feature in the Cred Issue Reporter Chrome extension. This feature allows users to save incomplete issue reports and resume them later, preventing data loss from accidental page closures or browser restarts.

---

## Problem Statement

Currently, if a user:
- Closes the annotate page accidentally
- Restarts their browser
- Navigates away from the page
- Experiences a browser crash

**All their work is lost**, including:
- Annotated screenshots
- Filled form fields
- Video recordings
- Additional uploaded documents

---

## Feature Goals

1. **Prevent data loss** - Auto-save user progress periodically
2. **Enable resume workflow** - Users can continue from where they left off
3. **Manage multiple drafts** - View, delete, and select from saved drafts
4. **Minimal friction** - Feature should work automatically without requiring user action
5. **Storage efficiency** - Handle large media files without exceeding storage limits

---

## Data to Save

### Draft Structure

```javascript
{
  id: string,                    // Unique draft identifier (UUID)
  name: string,                  // User-friendly name (auto-generated or custom)
  createdAt: number,             // Timestamp of draft creation
  updatedAt: number,             // Timestamp of last update
  version: number,               // Schema version for future migrations

  // Form Data
  formData: {
    project_id: string,
    tracker_id: string,
    subject: string,
    description: string,
    priority_id: string,
    assigned_to_id: string,
    due_date: string,
    category_id: string,
    fixed_version_id: string,
    stepsToReproduce: string,
    expectedBehavior: string,
    actualBehavior: string,
    attachTechnicalData: boolean
  },

  // Mode Information
  mode: 'create' | 'update',
  existingIssueId: string | null,  // For update mode

  // Media
  screenshots: [{
    id: string,
    data: string,                  // Base64 data URL (stored separately for large files)
    annotations: object,           // Canvas annotation state
    timestamp: number,
    tabId: number,
    name: string,
    type: 'screenshot'
  }],

  videos: [{
    id: string,
    storageKey: string,           // Reference to IndexedDB storage
    timestamp: number,
    name: string,
    type: 'video',
    recordingTimeframe: object
  }],

  // Additional Documents
  additionalDocuments: [{
    id: string,
    name: string,
    type: string,
    size: number,
    data: string                   // Base64 for small files, IndexedDB key for large
  }],

  // Technical Data
  technicalData: {
    pageInfo: object,
    networkRequests: array,
    consoleLogs: array
  },

  // Multi-tab State
  selectedTabIds: number[],

  // Source Context
  sourceUrl: string,
  sourceTitle: string
}
```

---

## Storage Strategy

### Storage Location Hierarchy

| Data Type | Size Threshold | Storage |
|-----------|---------------|---------|
| Draft metadata | - | `chrome.storage.local` |
| Form fields | - | `chrome.storage.local` |
| Small screenshots (<1MB) | < 1MB | `chrome.storage.local` (inline) |
| Large screenshots (>=1MB) | >= 1MB | IndexedDB |
| Videos | Any | IndexedDB (existing VideoStorage) |
| Large documents (>=1MB) | >= 1MB | IndexedDB |
| Technical data | - | `chrome.storage.local` |

### Storage Keys

```javascript
// chrome.storage.local
{
  'drafts_index': [{id, name, createdAt, updatedAt, sourceUrl, hasVideo}],
  'draft_{id}': { /* full draft object without large media */ },
  'draft_{id}_media_small': { /* small inline media */ }
}

// IndexedDB - CapScreenDraftsDB
{
  store: 'draft_media',
  key: 'draft_{id}_screenshot_{screenshotId}',
  key: 'draft_{id}_document_{docId}'
}
// Videos continue to use existing VideoStorage (CapScreenVideoDB)
```

### Storage Limits

- `chrome.storage.local`: 10MB total (5MB per item)
- IndexedDB: Unlimited (browser-managed)

**Strategy**: Keep draft metadata and form data in chrome.storage.local, offload large media to IndexedDB.

---

## User Interface

### 1. Draft Recovery Prompt (Auto-trigger)

**Location**: Annotate page load (`annotate/annotate.js`)

**Trigger**: When annotate page loads and a draft exists

```
+--------------------------------------------------+
|  Unsaved Draft Found                        [X]  |
|--------------------------------------------------|
|  You have an unsaved draft from:                 |
|  "Login Page Bug Report"                         |
|  Last edited: 2 hours ago                        |
|                                                  |
|  [Continue Editing]  [Start Fresh]  [View All]   |
+--------------------------------------------------+
```

### 2. Save Draft Button

**Location**: Annotate page header/toolbar

```
+------------------+
|  [Save Draft ▼]  |  ← Dropdown with options
+------------------+
    |
    +-- Save Draft
    +-- Save Draft As...
    +-- Load Draft...
    +-- Delete Current Draft
```

### 3. Draft Manager Modal

**Location**: Accessible from popup and annotate page

```
+----------------------------------------------------------+
|  Saved Drafts                                       [X]  |
|----------------------------------------------------------|
|  +---------------------------------------------------+   |
|  | Login Bug - example.com              2 hours ago  |   |
|  | Has: 2 screenshots, 1 video                       |   |
|  | [Continue] [Delete]                               |   |
|  +---------------------------------------------------+   |
|  | Payment Form Issue - checkout.com    Yesterday    |   |
|  | Has: 1 screenshot                                 |   |
|  | [Continue] [Delete]                               |   |
|  +---------------------------------------------------+   |
|                                                          |
|  [Clear All Drafts]                                      |
+----------------------------------------------------------+
```

### 4. Popup Integration

**Location**: Popup capture section

```
+--------------------------------+
|  Recent Activity               |
|--------------------------------|
|  [Drafts (2)]  [Submissions]   |  ← Tab toggle
|--------------------------------|
|  • Login Bug (2h ago)          |
|    [Continue →]                |
|  • Payment Issue (1d ago)      |
|    [Continue →]                |
+--------------------------------+
```

### 5. Unsaved Changes Warning

**Trigger**: Attempting to close annotate page with unsaved changes

```
+--------------------------------------------------+
|  Unsaved Changes                            [X]  |
|--------------------------------------------------|
|  You have unsaved changes. Would you like to     |
|  save them as a draft before leaving?            |
|                                                  |
|  [Save & Close]  [Discard]  [Cancel]             |
+--------------------------------------------------+
```

---

## Auto-Save Behavior

### Auto-Save Triggers

1. **Debounced form field changes** - 3 seconds after last keystroke
2. **Screenshot annotation completion** - When user finishes drawing (canvas blur)
3. **Video recording completion** - Immediately after recording stops
4. **Document upload** - After file selection completes
5. **Periodic backup** - Every 2 minutes if any changes detected
6. **Before page unload** - Attempt to save on `beforeunload` event

### Auto-Save Indicators

```
+------------------------------------------+
|  Issue Details                  [●]      |  ← Green dot = saved
|                                 [○]      |  ← Orange dot = saving
|                                 [◌]      |  ← Gray dot = unsaved changes
+------------------------------------------+
```

---

## Implementation Phases

### Phase 1: Core Storage Layer (Foundation)

**Files to create/modify:**
- `lib/draft-storage.js` (new)
- `lib/video-storage.js` (extend)

**Tasks:**
1. Create `DraftStorage` class with CRUD operations
2. Implement IndexedDB store for large media
3. Add storage size management and cleanup
4. Create draft schema with versioning
5. Add migration support for future schema changes

**Estimated scope:** ~300 lines

### Phase 2: Auto-Save Implementation

**Files to modify:**
- `annotate/annotate.js`

**Tasks:**
1. Implement change detection for form fields
2. Add debounced auto-save for text inputs
3. Hook into annotation completion events
4. Add periodic backup timer
5. Implement `beforeunload` save attempt
6. Add auto-save status indicator

**Estimated scope:** ~200 lines

### Phase 3: Draft Recovery Flow

**Files to modify:**
- `annotate/annotate.js`
- `annotate/annotate.html`
- `annotate/annotate.css`

**Tasks:**
1. Check for existing drafts on page load
2. Create recovery prompt modal
3. Implement draft restoration logic
4. Handle conflicts between session data and draft data
5. Add "Start Fresh" functionality that clears draft

**Estimated scope:** ~250 lines

### Phase 4: Draft Manager UI

**Files to modify:**
- `annotate/annotate.js`
- `annotate/annotate.html`
- `annotate/annotate.css`

**Tasks:**
1. Create "Save Draft" dropdown menu
2. Create "Save Draft As..." dialog
3. Implement draft manager modal
4. Add draft list with preview information
5. Implement delete draft functionality
6. Add "Load Draft" workflow

**Estimated scope:** ~300 lines

### Phase 5: Popup Integration

**Files to modify:**
- `popup/popup.js`
- `popup/popup.html`
- `popup/popup.css`

**Tasks:**
1. Add drafts tab to recent activity section
2. Display draft summaries
3. Implement "Continue" action that opens annotate with draft
4. Add draft count badge

**Estimated scope:** ~150 lines

### Phase 6: Polish & Edge Cases

**Tasks:**
1. Add unsaved changes warning on page close
2. Handle storage quota errors gracefully
3. Add draft expiration (30 days default)
4. Implement draft cleanup for old/orphaned drafts
5. Add error recovery for corrupted drafts
6. Testing across different scenarios

**Estimated scope:** ~200 lines

---

## Technical Specifications

### DraftStorage Class API

```javascript
class DraftStorage {
  // CRUD Operations
  async saveDraft(draft): Promise<string>           // Returns draft ID
  async getDraft(draftId): Promise<Draft>
  async updateDraft(draftId, updates): Promise<void>
  async deleteDraft(draftId): Promise<void>
  async listDrafts(): Promise<DraftSummary[]>

  // Media Operations
  async saveMediaToIndexedDB(draftId, mediaId, data): Promise<string>
  async loadMediaFromIndexedDB(storageKey): Promise<Blob>
  async deleteMediaFromIndexedDB(storageKey): Promise<void>

  // Utilities
  async getStorageUsage(): Promise<{used, available}>
  async cleanupOldDrafts(maxAgeMs): Promise<number>  // Returns deleted count
  async exportDraft(draftId): Promise<Blob>          // For backup
  async importDraft(blob): Promise<string>           // Returns new draft ID
}
```

### Change Detection

```javascript
class DraftChangeTracker {
  constructor(draftStorage, debounceMs = 3000)

  trackFormField(element, fieldName)
  trackAnnotation(screenshotId)
  markDirty()

  async flush(): Promise<void>  // Force immediate save
  destroy()                     // Cleanup listeners
}
```

### Draft Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Created   │────>│   Active    │────>│  Submitted  │
│  (new tab)  │     │ (auto-save) │     │  (cleanup)  │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          v
                    ┌─────────────┐
                    │   Expired   │
                    │ (30 days)   │
                    └─────────────┘
```

---

## Storage Migration

For future schema changes, drafts include a `version` field:

```javascript
const CURRENT_DRAFT_VERSION = 1;

async function migrateDraft(draft) {
  if (draft.version === 1 && CURRENT_DRAFT_VERSION === 2) {
    // Apply v1 -> v2 migrations
    draft = migrateV1ToV2(draft);
  }
  // Add more migrations as needed
  return draft;
}
```

---

## Error Handling

### Storage Quota Exceeded

```javascript
try {
  await draftStorage.saveDraft(draft);
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    // 1. Try to clean up old drafts
    const cleaned = await draftStorage.cleanupOldDrafts(7 * 24 * 60 * 60 * 1000);
    if (cleaned > 0) {
      // Retry save
      await draftStorage.saveDraft(draft);
    } else {
      // Notify user to delete drafts manually
      showStorageFullWarning();
    }
  }
}
```

### Corrupted Draft Recovery

```javascript
async function loadDraftSafely(draftId) {
  try {
    return await draftStorage.getDraft(draftId);
  } catch (error) {
    console.error('Draft corrupted:', error);
    // Attempt partial recovery
    const partialDraft = await draftStorage.getPartialDraft(draftId);
    if (partialDraft) {
      showPartialRecoveryNotice();
      return partialDraft;
    }
    // Complete failure
    await draftStorage.deleteDraft(draftId);
    throw new Error('Draft could not be recovered');
  }
}
```

---

## Testing Checklist

### Unit Tests
- [ ] DraftStorage CRUD operations
- [ ] Media storage to/from IndexedDB
- [ ] Change detection and debouncing
- [ ] Storage quota handling
- [ ] Draft migration

### Integration Tests
- [ ] Auto-save triggers correctly on form changes
- [ ] Draft recovery prompt appears on page load
- [ ] Loading draft restores all form fields
- [ ] Loading draft restores all annotations
- [ ] Videos load correctly from draft
- [ ] Draft deleted after successful submission
- [ ] Popup shows correct draft count

### Manual Testing Scenarios
- [ ] Close browser with unsaved changes, reopen, recover draft
- [ ] Create multiple drafts from different pages
- [ ] Load draft with expired/deleted video
- [ ] Exceed storage quota, verify cleanup works
- [ ] Upgrade extension with existing drafts (migration)

---

## Future Enhancements (Out of Scope)

1. **Cloud sync** - Sync drafts across devices via Redmine custom API
2. **Draft sharing** - Export draft as file, import on another machine
3. **Draft templates** - Save common issue patterns as templates
4. **Collaborative drafts** - Multiple users editing same draft

---

## Summary

| Phase | Deliverable | Scope |
|-------|-------------|-------|
| 1 | Core storage layer | ~300 lines |
| 2 | Auto-save implementation | ~200 lines |
| 3 | Draft recovery flow | ~250 lines |
| 4 | Draft manager UI | ~300 lines |
| 5 | Popup integration | ~150 lines |
| 6 | Polish & edge cases | ~200 lines |
| **Total** | **Complete feature** | **~1400 lines** |

**New files:**
- `lib/draft-storage.js` - Draft storage management

**Modified files:**
- `lib/video-storage.js` - Extend for draft media
- `annotate/annotate.js` - Auto-save, recovery, UI
- `annotate/annotate.html` - Modal markup
- `annotate/annotate.css` - Modal styles
- `popup/popup.js` - Draft list integration
- `popup/popup.html` - Draft tab markup
- `popup/popup.css` - Draft tab styles

---

*Document created: 2026-01-31*
*Feature branch: claude/plan-save-draft-feature-oX9xg*
