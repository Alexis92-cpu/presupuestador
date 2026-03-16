// LocalStorage Wrapper
class Store {
    constructor(prefix = 'netpoint_') {
        this.prefix = prefix;
    }

    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(this.prefix + key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from storage:', error);
            return defaultValue;
        }
    }

    set(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error writing to storage:', error);
            return false;
        }
    }

    remove(key) {
        localStorage.removeItem(this.prefix + key);
    }
}

const store = new Store();
