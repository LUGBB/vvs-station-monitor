/// <reference path="class.vvs.settings.ts" />

'use strict';

class VVSStationDefaultSettings extends VVSDefaultSettings {
    /**
     * Station id number
     * @type {number}
     */
    station: number;

    /**
     * Uptime time (in minutes)
     * @type {number}
     */
    updateTime: number = 60 * 1000;

    /**
     * Use of local cache (if possible)
     * @type {boolean}
     */
    localCache: boolean = true;

    /**
     * Enable time toggle (in seconds)
     *
     * Toggles time between realtive and absolute time
     *
     * @type {number}
     */
    timeToggle: number = 0;

    /**
     * Intelligent time threshold to switch from minutes to absolute time (in minutes)
     * @type {number}
     */
    intelligentTimeThreshold: number = 60;

    /**
     * Loading indicator (in html)
     * @type {string}
     */
    loadingIndicator: string = '<div class="loader"><svg class="circular" viewBox="25 25 50 50"><circle class="path" cx="50" cy="50" r="20" fill="none" stroke-width="10" stroke-miterlimit="10"/></svg></div>';

    /**
     * Type for showing departure times
     *
     * relative: in minutes
     * absolute: show time
     * intelligent: based on intelligentTimeThreshold show relative and absolute times
     * @type {string}
     */
    departureType: string = 'relative';

    /**
     * Ajax handling url
     * @type {string}
     */
    requestUrl: string = 'vvs.php';

    /**
     * Translation array
     *
     * @type {{noData: string; minute: string; from: string}}
     */
    translations: any = {
        noData: 'Keine Abfahrtszeiten vorhanden',
        minute: 'min',
        from:   'ab'
    };

    /**
     * Main template (in html)
     *
     * @type {string}
     */
    templateMain: string = `
            <h3>{{title}}<i class="departure-minimum-desc">{{departureTitle}}</i></h3>
            {{&content}}
    `;

    /**
     * Title template (in html)
     *
     * @type {string}
     */
    templateTitle: string = `{{stationName}}`;

    /**
     * Template for the timetable (in html)
     *
     * @type {string}
     */
    templateTimetable: string = `
        <ul class="">
            {{#timetable}}
            <li class="{{line.delayClass}}">
                <div class="overall-box">
                    <div class="departure-box">
                        <div class="line-symbol" data-line="{{line.numberType}}" data-line="{{line.number}}">{{line.number}}</div>
                        <div class="direction">{{line.direction}}</div>
                    </div>
                    <div class="time-box">
                        <div class="label label-danger delay" data-delay="{{delay.type}}">{{delay.value}}</div>
                        <div class="departure" data-departure-type="{{departure.type}}">
                            <span class="time absolute">{{&departure.absolute}}</span>
                            <span class="time relative">{{&departure.relative}}</span>
                        </div>
                    </div>
                </div>
            </li>
            {{/timetable}}
        </ul>
    `;

    /**
     * Template if there is no schedule data (in html)
     * @type {string}
     */
    templateNoData: string = '<div class="alert alert-warning" role="alert">{{settings.translations.noData}}</div>';

    /**
     * Array with different delay classes
     * @type {Array}
     */
    delayClasses: Array<any> = [{
        delay: -1,
        className: 'info'
    },{
        delay: 1,
        className: 'warning'
    },{
        delay: 3,
        className: 'danger'
    }];
}
