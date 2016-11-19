/// <reference path="class.utility.ts" />
/// <reference path="class.vvs.settings.ts" />
'use strict';

class VVSTimetableEntry {

    stopName: string;
    direction: string;
    number: string;
    numberType: string;

    delay: number;
    delayType: string;
    delaySign: string;
    delayAbs: number;
    stationCoordinates: string;
    departureTime: Date;
    departure: number;

    [key: string]: string|number|Date;

    constructor(data: any) {
        if (data) {
            for (var i in data) {
                this[i] = data[i];
            }
        }
    }
}
