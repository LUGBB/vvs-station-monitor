'use strict';

class VVSDefaultSettings {
    /**
     * Max schedule table entries (line count)
     * @type {number}
     */
    maxEntries: number = 20;

    /**
     * Minimum departure time (in minutes)
     * @type {number}
     */
    minDeparture: number = 3;

    /**
     * Maximum departure time (in minutes)
     * @type {number}
     */
    maxDeparture: number = 120;

    /**
     * Regexp for blacklistng entries by direction
     * @type {boolean|string}
     */
    blacklistDirection: boolean|string = false;

    /**
     * Regexp for whitelisting entries by direction
     * @type {boolean|string}
     */
    whitelistDirection: boolean|string = false;

    /**
     * Regexp for blacklistng entries by line
     * @type {boolean|string}
     */
    blacklistLine: boolean|string = false;

    /**
     * Regexp for whitelisting entries by line
     * @type {boolean|string}
     */
    whitelistLine: boolean|string = false;

    /**
     * Array with different delay classes
     * @type {Array}
     */
    delayClasses: Array<any> = [];

    /**
     * Timeout in ms
     * @type {number}
     */
    timeout: number = 10000;
}
