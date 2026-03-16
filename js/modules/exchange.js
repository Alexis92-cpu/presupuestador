
const Exchange = {
    // Current rate placeholder: 1 USD = X ARS
    rate: 1000, 
    lastUpdate: null,

    async init() {
        await this.fetchRealTimeRate();
        this.loadRate();
        
        // Manual editing removed as per user request (read-only from BNA)
    },

    async fetchRealTimeRate() {
        try {
            // Using DolarAPI for Argentina Official Rate (BNA)
            const response = await fetch('https://dolarapi.com/v1/dolares/oficial');
            const data = await response.json();
            
            if (data && data.venta) {
                this.rate = data.venta;
                this.lastUpdate = new Date();
                store.set('exchangeRate', this.rate);
                this.render();
                document.dispatchEvent(new CustomEvent('tasaCambioActualizada', { detail: { rate: this.rate } }));
                console.log('Tasa BNA actualizada:', this.rate);
            }
        } catch (error) {
            console.warn('No se pudo obtener la tasa en tiempo real, usando respaldo:', error);
        }
    },

    loadRate() {
        const savedRate = store.get('exchangeRate');
        if (savedRate) {
            this.rate = parseFloat(savedRate);
        }
        this.render();
    },

    updateRate(newRate) {
        this.rate = newRate;
        store.set('exchangeRate', this.rate);
        this.render();

        // Dispatch an event to tell products/UI that the rate changed
        document.dispatchEvent(new CustomEvent('tasaCambioActualizada', { detail: { rate: this.rate } }));
    },

    getRate() {
        return this.rate;
    },

    convertUsdToArs(usdAmount) {
        return Number((parseFloat(usdAmount) * this.rate).toFixed(2));
    },

    convertArsToUsd(arsAmount) {
        return Number((parseFloat(arsAmount) / this.rate).toFixed(2));
    },

    render() {
        const display = document.getElementById('current-exchange-rate');
        if (display) {
            display.textContent = UI.formatCurrency(this.rate, 'ARS');
        }
    }
};
