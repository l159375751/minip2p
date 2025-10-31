/**
 * POC11 - Library Builder Utilities
 * Handles TAR extraction, GUTINDEX parsing, and IndexedDB storage
 */

// ========== IndexedDB Storage ==========

class LibraryDB {
    constructor() {
        this.db = null;
        this.dbName = 'GutenbergLibrary';
        this.version = 1;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Books store
                if (!db.objectStoreNames.contains('books')) {
                    const booksStore = db.createObjectStore('books', { keyPath: 'id' });
                    booksStore.createIndex('title', 'title', { unique: false });
                    booksStore.createIndex('author', 'author', { unique: false });
                }

                // Index metadata store
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };
        });
    }

    async addBook(book) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['books'], 'readwrite');
            const store = transaction.objectStore('books');
            const request = store.add(book);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getBookCount() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['books'], 'readonly');
            const store = transaction.objectStore('books');
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async searchBooks(query, limit = 50) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['books'], 'readonly');
            const store = transaction.objectStore('books');
            const results = [];

            const request = store.openCursor();
            const lowerQuery = query.toLowerCase();

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && results.length < limit) {
                    const book = cursor.value;
                    if (book.title.toLowerCase().includes(lowerQuery) ||
                        book.author.toLowerCase().includes(lowerQuery)) {
                        results.push(book);
                    }
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    async clearAll() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['books'], 'readwrite');
            const store = transaction.objectStore('books');
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// ========== GUTINDEX Parser ==========

class GutIndexParser {
    /**
     * Parse GUTINDEX.ALL format
     * Format example:
     * TITLE and AUTHOR                                           ETEXT NO.
     *
     * Dracula, by Bram Stoker                                          345
     */
    static parseIndex(content) {
        const books = [];
        const lines = content.split('\n');
        let inIndex = false;

        for (const line of lines) {
            // Skip until we find the actual index
            if (line.includes('TITLE and AUTHOR')) {
                inIndex = true;
                continue;
            }

            if (!inIndex) continue;
            if (line.trim() === '') continue;
            if (line.startsWith('~')) continue; // Skip continuation lines for now

            // Try to parse book entry
            const match = line.match(/^(.+?)\s+(\d+)\s*$/);
            if (match) {
                const titleAuthor = match[1].trim();
                const etextNo = match[2].trim();

                // Parse "Title, by Author" format
                const parts = titleAuthor.split(', by ');
                const title = parts[0] || titleAuthor;
                const author = parts[1] || 'Unknown';

                books.push({
                    id: `gutenberg-${etextNo}`,
                    etextNo: parseInt(etextNo),
                    title: title,
                    author: author,
                    source: 'gutenberg'
                });
            }
        }

        return books;
    }
}

// ========== TAR.GZ Extraction ==========

class TarExtractor {
    /**
     * Extract files from TAR archive
     * Note: For browser, we'll use js-untar library
     */
    static async extractTar(arrayBuffer, onFileExtracted) {
        // This is a placeholder - in real implementation we'd use:
        // - pako for gzip decompression
        // - js-untar or tar-js for TAR extraction

        console.log('TAR extraction starting...');
        console.log(`Archive size: ${arrayBuffer.byteLength} bytes`);

        // For now, return a promise that resolves
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('TAR extraction complete (placeholder)');
                resolve({ filesExtracted: 0 });
            }, 1000);
        });
    }

    /**
     * Stream-based extraction for progressive processing
     */
    static async extractTarStream(blob, onFileExtracted, onProgress) {
        // This would use ReadableStream API for true progressive extraction
        // As pieces download, we can start extracting

        const totalSize = blob.size;
        let processedSize = 0;

        // Placeholder for streaming extraction
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                processedSize += Math.min(1024 * 1024, totalSize - processedSize); // 1MB chunks
                const progress = processedSize / totalSize;

                onProgress(progress);

                if (processedSize >= totalSize) {
                    clearInterval(interval);
                    resolve({ filesExtracted: 70000 });
                }
            }, 100);
        });
    }
}

// ========== Progress Tracker ==========

class ProgressTracker {
    constructor() {
        this.stages = {
            download: { current: 0, total: 100, status: 'pending' },
            extract: { current: 0, total: 100, status: 'pending' },
            ingest: { current: 0, total: 100, status: 'pending' }
        };
        this.callbacks = [];
    }

    updateStage(stage, current, total, status = 'in_progress') {
        this.stages[stage] = { current, total, status };
        this.notify();
    }

    onUpdate(callback) {
        this.callbacks.push(callback);
    }

    notify() {
        this.callbacks.forEach(cb => cb(this.stages));
    }

    getOverallProgress() {
        const stages = Object.values(this.stages);
        const totalWeight = stages.length;
        const completedWeight = stages.reduce((sum, stage) => {
            if (stage.status === 'completed') return sum + 1;
            if (stage.status === 'in_progress') return sum + (stage.current / stage.total);
            return sum;
        }, 0);
        return (completedWeight / totalWeight) * 100;
    }
}

// Export for use in POC11
if (typeof window !== 'undefined') {
    window.LibraryDB = LibraryDB;
    window.GutIndexParser = GutIndexParser;
    window.TarExtractor = TarExtractor;
    window.ProgressTracker = ProgressTracker;
}
