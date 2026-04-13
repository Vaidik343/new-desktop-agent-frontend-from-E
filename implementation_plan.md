# Feature Expansion for Wazuh-inspired FIM Agent

This document outlines the implementation plan to upgrade the existing Desktop Agent into a robust File Integrity Monitoring (FIM) and security agent, addressing your planned features.

## Project Context
- **USN (Ubuntu Security Notices) Vulnerability Scanning**: The backend uses an RSS feed to parse Ubuntu Security Notices and checks installed applications (`App.findAll`) on the agent against CVEs. This handles software vulnerability scanning on the backend.
- **Yara Integration**: Yara is an industry-standard, free, and open-source tool for malware detection using rule-based pattern matching. We will proceed by bundling native Yara binaries (for Windows/Linux/macOS) into the Electron app, which provides robust execution without the headaches of `node-gyp` C++ compilation.

## Proposed Changes and Phased Implementation

### Phase 1: Robust Baseline & Offline Buffering
**Objective**: Ensure no events are lost and baselines run efficiently.
*   **Local Buffering**: Modify `watcher.js` and `baseline.js` to write events/logs to `agent.db` First. A new `sync.js` service will periodically send these records to the API and mark them as "synced". If the backend is down, events queue safely locally.
*   **Offline Baseline Checking**: When the agent starts, `baseline.js` should scan folders, compare hashes/timestamps with the *local* `agent.db`, and only report/sync differences (files changed while the agent was off) instead of sending the entire folder bulk again.

#### [MODIFY] `src/agent/db.js`
- Create `EventsBuffer` table to store offline FIM logs and general monitoring events.
#### [NEW] `src/agent/syncService.js`
- Read unsynced events from the DB and push to backend periodically.

### Phase 2: Enhanced Metadata & Quarantine System
**Objective**: Collect more useful data and safely handle threats without total data loss.
*   **Extended Metadata**: Update `agent.js`'s `scanFolder` to capture `uid`, `gid`, `mode` (permissions), and potentially magic numbers (to detect mismatched extensions).
*   **Auto-Quarantine Architecture**: Instead of `deleteFileWithRetry()`, move blocked files to a secure hidden folder (`.quarantine`). Store a parallel metadata JSON file maintaining the original path, allowing administrators to restore false positives.

#### [MODIFY] `src/agent/watcher.js`
- Replace delete logic with a secure `moveToQuarantine` function.
#### [MODIFY] `src/agent/agent.js`
- Update `hashFile` and `insertFile` to retrieve and store extended OS metadata.

### Phase 3: Yara Scanning (Malware Detection)
**Objective**: Detect specific malware signatures using standard Yara rules.
*   **Yara Integration**: Download the official Yara CLI binaries for target platforms and place them in a `/bin` folder inside the app.
*   **Execution**: Spawns the Yara CLI via Node's `child_process`, scans target files against downloaded `.yar` rules, and returns matches.

#### [NEW] `src/agent/yaraScanner.js`
- Executes the Yara CLI on newly created or modified files.
#### [MODIFY] `src/agent/watcher.js`
- Intercept newly created files, run `yaraScanner`, and trigger quarantine if a rule matches.

### Phase 4: Extended Rule System and System Logging
**Objective**: Implement complex inclusion/exclusion rules and general system logging.
*   **Rules Based System (Regex/Globbing)**: Upgrade the simple `allowedExtensions` array to a robust glob matcher (like `minimatch`). Allow rules like `exclude: ["**/.git/**", "**/temp/*"]`.
*   **System Event Monitoring**: Add basic listeners for system events (e.g., login, critical errors). 
*   **API Cleaning**: Ensure the endpoint where users could manually "create agents" is entirely removed from your backend repository API, as registration is purely automated now via `registerAgent.js`.
