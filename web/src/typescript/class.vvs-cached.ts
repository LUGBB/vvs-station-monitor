/// <reference path="class.vvs.ts" />
/// <reference path="class.utility.ts" />
'use strict';

class VVSCached extends VVS {

    /**
     * Cache lifetime (in seconds)
     * @type {number}
     */
    cacheTime: number = 59;

    /**
     * Get cached data
     *
     * @param key
     * @returns {any}
     */
    cacheGetData(key: string): any {
        var data = localStorage.getItem(key);

        if (data) {
            return JSON.parse(data);
        } else {
            throw new Error(`${this.station}: Could not get cached data (key ${key})`);
        }
    }

    /**
     * Store data into cache
     *
     * @param key
     * @param value
     */
    cacheSetData(key: string, value: any): void {
        localStorage.setItem(key, JSON.stringify(value));
    }

    /**
     * Request station departures and cache locally
     *
     * @returns {Promise<any>}
     */
    requestStationDepartures(): Promise<any> {
        var promise: Promise<any>;

        try {
            var keyTimestamp = `${this.station}.timestamp`;
            var keyData = `${this.station}.data`;

            var currentTime = Utility.dateToTimestamp(new Date());

            try {
                var lastUptimeTime = this.cacheGetData(keyTimestamp);
                var ret = this.cacheGetData(keyData);

                if (!lastUptimeTime || !ret || ret.length == 0) {
                    throw new Error(`${this.station}: Empty station data in cache`);
                }
            } catch (e) {
                Utility.logException(e);
                lastUptimeTime = false;
                ret = false;
            }

            if (lastUptimeTime && ret && (currentTime - lastUptimeTime <= this.cacheTime)) {
                promise = new Promise((resolve: any) => {
                    resolve(ret);
                });
            } else {
                promise = super.requestStationDepartures();
                promise.then((ajaxData: any) => {
                    try {
                        var data = (JSON.parse(JSON.stringify(ajaxData)));

                        this.cacheSetData(keyData, data);
                        this.cacheSetData(keyTimestamp, currentTime);
                    } catch (e) {
                        // catch set error
                        Utility.logException(e);
                    }
                });
            }
        } catch (e) {
            // fallback
            Utility.logException(e);
            promise = super.requestStationDepartures();
        }

        return promise;
    }

    /**
     * Inject cached data into station data
     *
     * @param station
     * @param data
     * @returns {any}
     */
    prepareStationData(data: any): any {
        var ret = super.prepareStationData(data);

        var cacheKeyTitle = `${this.station}.title`;
        var cacheKeyInfo = `${this.station}.info`;

        if (ret.station.name) {
            try {
                this.cacheSetData(cacheKeyInfo, ret.station);
            } catch (e) {
                // catch fetch error
                Utility.logException(e);
            }
        } else {
            try {
                var stationInfo = this.cacheGetData(cacheKeyInfo);
                if (stationInfo) {
                    ret.station = stationInfo;
                }
            } catch (e) {
                // catch fetch error
                Utility.logException(e);
            }
        }

        return ret;
    }
}
