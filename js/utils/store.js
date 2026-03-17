// Storage Wrapper
class Store {
    constructor(prefix = 'netpoint_') {
        this.prefix = prefix;
    }

    get(key, defaultValue = null, persistent = true) {
        const storage = persistent ? localStorage : sessionStorage;
        try {
            const item = storage.getItem(this.prefix + key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from storage:', error);
            return defaultValue;
        }
    }

    set(key, value, persistent = true) {
        const storage = persistent ? localStorage : sessionStorage;
        try {
            storage.setItem(this.prefix + key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error writing to storage:', error);
            return false;
        }
    }

    remove(key, persistent = true) {
        const storage = persistent ? localStorage : sessionStorage;
        storage.removeItem(this.prefix + key);
    }
}

const store = new Store();
