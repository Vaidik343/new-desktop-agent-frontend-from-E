# Desktop Agent Code Improvement Plan

This document outlines structural and codebase refactoring needed to make the `desktop-agent` an enterprise-grade, maintainable application. The current implementation functions well as a proof of concept, but tightly couples networking, file system logic, and UI code.

---

## 1. Modularizing the Background Agent Logic
Currently, files like `src/agent/watcher.js` and `startAgent.js` handle file system monitoring, error generation, API network requests (`fetch`), and desktop notifications simultaneously.

### A. Establish an API Service Layer
*   **Current State:** `fetch()` is scattered across `watcher.js`, `agent.js`, and `baseline.js`. If the backend URL or authentication header changes, you have to update it in 10 different places.
*   **Improvement:** Create an API Client (e.g., using `axios` or a structured `fetch` wrapper) located under `src/api/apiClient.js`. 
*   **Outcome:** All FIM modules will call `apiClient.postBaseline()` ensuring network retry logic, bulk formatting, and errors are handled in one centralized place.

### B. Separation of Concerns in the Watcher
*   **Current State:** `watcher.js` manages internal state, triggers notifications, deletes files, and sends violations.
*   **Improvement:** Break this into modular services:
  *   `FsWatcherService`: Solely interacts with `chokidar` to detect raw file system events. 
  *   `ThreatResponseService`: Receives events from the Watcher and decides whether to Quarantine files (using the new Yara integrations).
  *   `NotificationService`: Centralized OS notification logic. 

---

## 2. Electron Main Process Structure (main.cjs)
The `main.cjs` file contains everything from window instantiation and OpenAI initialization to deeply nested switch statements (`actions`) for opening calculators and settings.

### A. Abstract IPC Handlers
*   **Improvement:** Move IPC listener registrations (`ipcMain.handle`, `ipcMain.on`) out of `main.cjs` and into dedicated controllers, such as `src/main/ipcHandlers.js`. 
*   **Outcome:** `main.cjs` will simply initialize the browser window and import the handlers. This massively improves readability.

### B. Dynamic Tool Execution
*   **Improvement:** The OpenAI switch/case execution currently holds logic for Mac vs Windows inside the file. Instead, abstract this OS verification to a `/src/utils/osTools.js` helper.

---

## 3. React Frontend Upgrades (src/components & App.jsx)

### A. Implement Context API 
*   **Improvement:** For agent status monitoring (e.g., "Scanning", "Protected", "Offline"), establish a React Context Provider (`AgentStatusContext`). This allows deeply nested dashboard components to securely access real-time states without prop-drilling.

### B. UI Feedback & Error Boundaries
*   **Improvement:** Integrate a toast notification system (`react-toastify` or `sonner`) into the UI so the local user has an event feed of what the background agent is doing (e.g., "Threat Quarantined").
*   **Improvement:** Add React Error Boundaries around main views so that if IPC communication fails, the app degrades gracefully instead of showing a white screen.

---

## Conclusion
By shifting to this layered architectural pattern (API Clients -> Services -> UI/Main Logic), integrating the new Bulk Buffering and Yara malware detection tools will be a seamless plugin experience rather than trying to fit more complex logic into `watcher.js`.
