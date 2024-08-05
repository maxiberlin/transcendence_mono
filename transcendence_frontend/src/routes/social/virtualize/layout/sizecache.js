export class SizeCache {
    /** @type {Map < number | string, number >} */
    _map = new Map();
    _roundAverageSize = false;
    totalSize = 0;

    /** @param {import('./layout').SizeCacheT.SizeCacheConfig} [config]  */
    constructor(config) {
        if (config?.roundAverageSize === true) {
            this._roundAverageSize = true;
        }
    }

    /**
     * @param {number | string} index 
     * @param {number} value 
     */
    set(index, value) {
        const prev = this._map.get(index) || 0;
        this._map.set(index, value);
        this.totalSize += value - prev;
    }

    /**
     * @returns {number}
     */
    get averageSize() {
        if (this._map.size > 0) {
            const average = this.totalSize / this._map.size;
            return this._roundAverageSize ? Math.round(average) : average;
        }
        return 0;
    }

    /**
     * @param {number | string} index 
     * @returns 
     */
    getSize(index) {
        return this._map.get(index);
    }

    clear() {
        this._map.clear();
        this.totalSize = 0;
    }
}