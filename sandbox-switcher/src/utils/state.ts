/**
 * Session state management for the extension.
 * Tracks ensured paths to avoid redundant ensure-path calls.
 */
export class SessionState {
    private ensuredPaths: Set<string> = new Set();
    private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
    private lastWorkingDirectory: string | null = null;

    /**
     * Checks if a relative path has been ensured in this session
     */
    isPathEnsured(relativePath: string): boolean {
        return this.ensuredPaths.has(relativePath);
    }

    /**
     * Gets the last working directory that was set via switchWdOpposite
     */
    getLastWorkingDirectory(): string | null {
        return this.lastWorkingDirectory;
    }

    /**
     * Sets the last working directory
     */
    setLastWorkingDirectory(dirPath: string): void {
        this.lastWorkingDirectory = dirPath;
    }

    /**
     * Marks a relative path as ensured
     */
    markPathEnsured(relativePath: string): void {
        this.ensuredPaths.add(relativePath);
    }

    /**
     * Clears the ensured paths cache
     */
    clearEnsuredPaths(): void {
        this.ensuredPaths.clear();
    }

    /**
     * Debounces a function call per key.
     * If called multiple times with the same key within the delay,
     * only the last call will execute.
     */
    debounce(key: string, fn: () => void, delayMs: number = 500): void {
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
    dispose(): void {
        this.debounceTimers.forEach((timer) => clearTimeout(timer));
        this.debounceTimers.clear();
    }
}
