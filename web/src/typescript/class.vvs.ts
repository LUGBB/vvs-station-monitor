/// <reference path="class.utility.ts" />
/// <reference path="class.vvs.settings.ts" />
'use strict';

class VVS {
    requestUrl: string = 'vvs.php';

    // station queue (avoid duplicate requests)
    static stationRequestQueue: any = {};

    station: number|string;

    configuration: any;

    constructor(station: number, options: any) {
        this.station = station;
        this.configuration = $.extend(new VVSDefaultSettings(), options);

        if(!(window as any).Promise) {
            throw new Error('Promises not available, please update browsers');
        }
    }

    /**
     * Plain ajax request
     *
     * @param data
     * @returns {JQueryXHR}
     */
    request(data: any): any {
        return $.ajax( {
            url: this.requestUrl,
            dataType: "json",
            data: data
        });
    }

    /**
     * Request station departure times via ajax request
     *
     * Duplicate requests in same timeslot will be using the same request
     * @returns {any}
     */
    requestStationDepartures(): Promise<any> {
        var station = this.station;

        // use cached request if possible
        if (VVS.stationRequestQueue[station]) {
            return VVS.stationRequestQueue[station];
        }

        var request = this.request({
            type: "departures",
            station: station
        });

        let promise = new Promise((resolve: any, reject: any) => {
            request.done((data: any) => {
                resolve(data);
            });

            // ajax error
            request.error((jqXHR: any, textStatus: any, errorThrown: any) => {
                reject(`${textStatus}: ${errorThrown}`);
            });
        });

        // delete queque item on success
        promise.then(() => {
            delete VVS.stationRequestQueue[station];
        });

        // delete queque item on error
        promise.catch(() => {
            delete VVS.stationRequestQueue[station];
        });

        // return and set queue
        return VVS.stationRequestQueue[station] = promise;
    }

    /**
     * Set request url
     *
     * @param url
     */
    setRequestUrl(url: string): void {
        this.requestUrl = url;
    }

    /**
     * Get schedule table for VVS station
     *
     * @returns {Promise<T>}
     */
    stationSchedule(): any {
        var request = this.requestStationDepartures();

        return new Promise((resolve: any, reject: any) => {
            request.then((ajaxData: any) => {
                var currentTimestamp = Utility.dateToTimestamp(new Date());

                // clone needed here
                var data = (JSON.parse(JSON.stringify(ajaxData)));

                var stops: Array<any> = [];
                var ret = this.prepareStationData(data);

                if (data.length) {
                    $.each(data, (index: number, line: any) => {
                        // filter "trains stops here"
                        if (line.direction === 'Zug endet hier') {
                            return;
                        }

                        var departureTime = line.departureTime;

                        line.departureTime = this.calculateDepatureTime(departureTime);
                        line.departure = this.calculateDepatureTimeRel(departureTime, currentTimestamp);
                        line.numberType = this.transformLineNumberToType(line.number);
                        line.delay = parseInt(line.delay);
                        line.delayType = this.transformDelayToType(line.delay);
                        line.delaySign = Math.sign(line.delay);
                        line.delayAbs = Math.abs(line.delay);

                        line.delayClass = this.calculateDelayClass(line);

                        stops.push(line);
                    });

                    stops.sort((a, b) => {
                        return a.departure - b.departure;
                    });

                    // filter by departure time
                    if (!this.configuration.maxEntries || stops.length >= this.configuration.maxEntries) {
                        stops = stops.filter((value: any) => {
                            return (value.departure >= this.configuration.minDeparture && value.departure <= this.configuration.maxDeparture)
                        });
                    }

                    // whitelist by direction
                    if (this.configuration.whitelistDirection) {
                        stops = stops.filter((value: any) => {
                            return value.direction.match(this.configuration.whitelistDirection);
                        });
                    }

                    // blacklist by direction
                    if (this.configuration.blacklistDirection) {
                        stops = stops.filter((value: any) => {
                            return !(value.direction.match(this.configuration.blacklistDirection));
                        });
                    }

                    // whitelist by line
                    if (this.configuration.blacklistLine) {
                        stops = stops.filter((value: any) => {
                            return !(value.number.match(this.configuration.blacklistLine));
                        });
                    }

                    // blacklist by line
                    if (this.configuration.whitelistLine) {
                        stops = stops.filter((value: any) => {
                            return value.number.match(this.configuration.whitelistLine);
                        });
                    }

                    // filter by max entires
                    if (this.configuration.maxEntries) {
                        stops.splice(this.configuration.maxEntries);
                    }
                }

                ret.stops = stops;

                resolve(ret);
            }, function(reason: any) {
                // rejection
                reject(reason);
            });
        });
    }

    /**
     * Calculate departure time
     *
     * @param departure
     * @returns {string}
     */
    calculateDepatureTime(departure: any): string {
        var date = Utility.createDate(departure.year,departure.month,departure.day,departure.hour,departure.minute,0);
        return `${Utility.strPadLeft(date.getHours(),2,'0')}:${Utility.strPadLeft(date.getMinutes(),2,'0')}`;
    }

    /**
     * Calculate relative departure time in minutes
     *
     * @param departure
     * @param currentTimestamp
     * @returns {number}
     */
    calculateDepatureTimeRel(departure: any, currentTimestamp: number): number {
        var departureTimestamp = Utility.dateToTimestamp(Utility.createDate(departure.year,departure.month,departure.day,departure.hour,departure.minute,0));

        var ret = Math.floor((departureTimestamp - currentTimestamp) / 60);

        return ret;
    }

    /**
     * Transform line number to prefix
     *
     * eg.
     * 721...723 -> B (bus)
     * S1 -> S (S-Bahn)
     * U1 -> U (U-Bahn)
     *
     * @param lineNumber
     * @returns {string}
     */
    transformLineNumberToType(lineNumber: string): string {
        var ret: string = "";
        var match: any;

        // check if Bus
        if (!isNaN(Number(lineNumber))) {
            ret = "B";
        } else {
            // check if train or other named vehicle
           if (match = lineNumber.match(/^([a-z]+)/i)) {
               ret = match[0];
           } else {
               ret = lineNumber.charAt(0);
           }
        }

        return ret;
    }

    /**
     * Get type of delay for sign ('', '-', '+')
     *
     * @param delay
     * @returns {string}
     */
    transformDelayToType(delay: number): string {
        var ret: string = '';
        switch(Math.sign(delay)) {
            case -1:
                ret = "-";
                break;

            case 1:
                ret = "+";
                break;

            case 1:
                ret = "cancled";
                break;
        }

        return ret;
    }

    /**
     * Calculate delay class based on delay warning settings
     *
     * @param line
     * @returns {string}
     */
    calculateDelayClass(line: any): string {
        var ret: string = '';

        $.each(this.configuration.delayClasses, (index, delayConf) => {
            switch(Math.sign(delayConf.delay)) {
                case -1:
                    if (line.delay <= delayConf.delay) {
                        ret = delayConf.className;
                    }
                    break;

                case 1:
                    if (line.delay >= delayConf.delay) {
                        ret = delayConf.className;
                    }
                    break;
            }
        });

        return ret;
    }

    /**
     * Prepare and modify station data
     *
     * @param data
     * @returns {{station: {name: boolean, coordinates: boolean}, stops: Array<any>}}
     */
    prepareStationData(data: any): any {
        var ret = {
            station: {
                id: this.station,
                name: false,
                coordinates: false,
            },
            stops: ([] as Array<any>)
        };

        if (data.length) {
            var firstStop = data.pop();
            ret.station.name = firstStop.stopName;
            ret.station.coordinates = firstStop.stationCoordinates;
        }

        return ret;
    }
}
