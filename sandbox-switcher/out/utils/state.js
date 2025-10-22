"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionState = void 0;
/**
 * Session state management for the extension.
 * Tracks ensured paths to avoid redundant ensure-path calls.
 */
class SessionState {
    constructor() {
        this.ensuredPaths = new Set();
        this.debounceTimers = new Map();
        this.lastWorkingDirectory = null;
    }
    /**
     * Checks if a relative path has been ensured in this session
     */
    isPathEnsured(relativePath) {
        return this.ensuredPaths.has(relativePath);
    }
    /**
     * Gets the last working directory that was set via switchWdOpposite
     */
    getLastWorkingDirectory() {
        return this.lastWorkingDirectory;
    }
    /**
     * Sets the last working directory
     */
    setLastWorkingDirectory(dirPath) {
        this.lastWorkingDirectory = dirPath;
    }
    /**
     * Marks a relative path as ensured
     */
    markPathEnsured(relativePath) {
        this.ensuredPaths.add(relativePath);
    }
    /**
     * Clears the ensured paths cache
     */
    clearEnsuredPaths() {
        this.ensuredPaths.clear();
    }
    /**
     * Debounces a function call per key.
     * If called multiple times with the same key within the delay,
     * only the last call will execute.
     */
    debounce(key, fn, delayMs = 500) {
        // Clear existing timer for this key
        const existing = this.debounceTimers.get(key);
        if (existing) {
            clearTimeout(existing);
        }
        // Set new timer
        const timer = setTimeout(() => {
            this.debounceTimers.delete(key);
            fn();
        }, delayMs);
        this.debounceTimers.set(key, timer);
    }
    /**
     * Cleans up all timers
     */
    dispose() {
        this.debounceTimers.forEach((timer) => clearTimeout(timer));
        this.debounceTimers.clear();
    }
}
exports.SessionState = SessionState;
//# sourceMappingURL=state.js.map