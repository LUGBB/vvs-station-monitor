/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */
(function defineMustache(global, factory) {
    if (typeof exports === 'object' && exports && typeof exports.nodeName !== 'string') {
        factory(exports);
    }
    else if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    }
    else {
        global.Mustache = {};
        factory(global.Mustache);
    }
}(this, function mustacheFactory(mustache) {
    var objectToString = Object.prototype.toString;
    var isArray = Array.isArray || function isArrayPolyfill(object) {
        return objectToString.call(object) === '[object Array]';
    };
    function isFunction(object) {
        return typeof object === 'function';
    }
    function typeStr(obj) {
        return isArray(obj) ? 'array' : typeof obj;
    }
    function escapeRegExp(string) {
        return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
    }
    function hasProperty(obj, propName) {
        return obj != null && typeof obj === 'object' && (propName in obj);
    }
    var regExpTest = RegExp.prototype.test;
    function testRegExp(re, string) {
        return regExpTest.call(re, string);
    }
    var nonSpaceRe = /\S/;
    function isWhitespace(string) {
        return !testRegExp(nonSpaceRe, string);
    }
    var entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    function escapeHtml(string) {
        return String(string).replace(/[&<>"'`=\/]/g, function fromEntityMap(s) {
            return entityMap[s];
        });
    }
    var whiteRe = /\s*/;
    var spaceRe = /\s+/;
    var equalsRe = /\s*=/;
    var curlyRe = /\s*\}/;
    var tagRe = /#|\^|\/|>|\{|&|=|!/;
    function parseTemplate(template, tags) {
        if (!template)
            return [];
        var sections = [];
        var tokens = [];
        var spaces = [];
        var hasTag = false;
        var nonSpace = false;
        function stripSpace() {
            if (hasTag && !nonSpace) {
                while (spaces.length)
                    delete tokens[spaces.pop()];
            }
            else {
                spaces = [];
            }
            hasTag = false;
            nonSpace = false;
        }
        var openingTagRe, closingTagRe, closingCurlyRe;
        function compileTags(tagsToCompile) {
            if (typeof tagsToCompile === 'string')
                tagsToCompile = tagsToCompile.split(spaceRe, 2);
            if (!isArray(tagsToCompile) || tagsToCompile.length !== 2)
                throw new Error('Invalid tags: ' + tagsToCompile);
            openingTagRe = new RegExp(escapeRegExp(tagsToCompile[0]) + '\\s*');
            closingTagRe = new RegExp('\\s*' + escapeRegExp(tagsToCompile[1]));
            closingCurlyRe = new RegExp('\\s*' + escapeRegExp('}' + tagsToCompile[1]));
        }
        compileTags(tags || mustache.tags);
        var scanner = new Scanner(template);
        var start, type, value, chr, token, openSection;
        while (!scanner.eos()) {
            start = scanner.pos;
            value = scanner.scanUntil(openingTagRe);
            if (value) {
                for (var i = 0, valueLength = value.length; i < valueLength; ++i) {
                    chr = value.charAt(i);
                    if (isWhitespace(chr)) {
                        spaces.push(tokens.length);
                    }
                    else {
                        nonSpace = true;
                    }
                    tokens.push(['text', chr, start, start + 1]);
                    start += 1;
                    if (chr === '\n')
                        stripSpace();
                }
            }
            if (!scanner.scan(openingTagRe))
                break;
            hasTag = true;
            type = scanner.scan(tagRe) || 'name';
            scanner.scan(whiteRe);
            if (type === '=') {
                value = scanner.scanUntil(equalsRe);
                scanner.scan(equalsRe);
                scanner.scanUntil(closingTagRe);
            }
            else if (type === '{') {
                value = scanner.scanUntil(closingCurlyRe);
                scanner.scan(curlyRe);
                scanner.scanUntil(closingTagRe);
                type = '&';
            }
            else {
                value = scanner.scanUntil(closingTagRe);
            }
            if (!scanner.scan(closingTagRe))
                throw new Error('Unclosed tag at ' + scanner.pos);
            token = [type, value, start, scanner.pos];
            tokens.push(token);
            if (type === '#' || type === '^') {
                sections.push(token);
            }
            else if (type === '/') {
                openSection = sections.pop();
                if (!openSection)
                    throw new Error('Unopened section "' + value + '" at ' + start);
                if (openSection[1] !== value)
                    throw new Error('Unclosed section "' + openSection[1] + '" at ' + start);
            }
            else if (type === 'name' || type === '{' || type === '&') {
                nonSpace = true;
            }
            else if (type === '=') {
                compileTags(value);
            }
        }
        openSection = sections.pop();
        if (openSection)
            throw new Error('Unclosed section "' + openSection[1] + '" at ' + scanner.pos);
        return nestTokens(squashTokens(tokens));
    }
    function squashTokens(tokens) {
        var squashedTokens = [];
        var token, lastToken;
        for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
            token = tokens[i];
            if (token) {
                if (token[0] === 'text' && lastToken && lastToken[0] === 'text') {
                    lastToken[1] += token[1];
                    lastToken[3] = token[3];
                }
                else {
                    squashedTokens.push(token);
                    lastToken = token;
                }
            }
        }
        return squashedTokens;
    }
    function nestTokens(tokens) {
        var nestedTokens = [];
        var collector = nestedTokens;
        var sections = [];
        var token, section;
        for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
            token = tokens[i];
            switch (token[0]) {
                case '#':
                case '^':
                    collector.push(token);
                    sections.push(token);
                    collector = token[4] = [];
                    break;
                case '/':
                    section = sections.pop();
                    section[5] = token[2];
                    collector = sections.length > 0 ? sections[sections.length - 1][4] : nestedTokens;
                    break;
                default:
                    collector.push(token);
            }
        }
        return nestedTokens;
    }
    function Scanner(string) {
        this.string = string;
        this.tail = string;
        this.pos = 0;
    }
    Scanner.prototype.eos = function eos() {
        return this.tail === '';
    };
    Scanner.prototype.scan = function scan(re) {
        var match = this.tail.match(re);
        if (!match || match.index !== 0)
            return '';
        var string = match[0];
        this.tail = this.tail.substring(string.length);
        this.pos += string.length;
        return string;
    };
    Scanner.prototype.scanUntil = function scanUntil(re) {
        var index = this.tail.search(re), match;
        switch (index) {
            case -1:
                match = this.tail;
                this.tail = '';
                break;
            case 0:
                match = '';
                break;
            default:
                match = this.tail.substring(0, index);
                this.tail = this.tail.substring(index);
        }
        this.pos += match.length;
        return match;
    };
    function Context(view, parentContext) {
        this.view = view;
        this.cache = { '.': this.view };
        this.parent = parentContext;
    }
    Context.prototype.push = function push(view) {
        return new Context(view, this);
    };
    Context.prototype.lookup = function lookup(name) {
        var cache = this.cache;
        var value;
        if (cache.hasOwnProperty(name)) {
            value = cache[name];
        }
        else {
            var context = this, names, index, lookupHit = false;
            while (context) {
                if (name.indexOf('.') > 0) {
                    value = context.view;
                    names = name.split('.');
                    index = 0;
                    while (value != null && index < names.length) {
                        if (index === names.length - 1)
                            lookupHit = hasProperty(value, names[index]);
                        value = value[names[index++]];
                    }
                }
                else {
                    value = context.view[name];
                    lookupHit = hasProperty(context.view, name);
                }
                if (lookupHit)
                    break;
                context = context.parent;
            }
            cache[name] = value;
        }
        if (isFunction(value))
            value = value.call(this.view);
        return value;
    };
    function Writer() {
        this.cache = {};
    }
    Writer.prototype.clearCache = function clearCache() {
        this.cache = {};
    };
    Writer.prototype.parse = function parse(template, tags) {
        var cache = this.cache;
        var tokens = cache[template];
        if (tokens == null)
            tokens = cache[template] = parseTemplate(template, tags);
        return tokens;
    };
    Writer.prototype.render = function render(template, view, partials) {
        var tokens = this.parse(template);
        var context = (view instanceof Context) ? view : new Context(view);
        return this.renderTokens(tokens, context, partials, template);
    };
    Writer.prototype.renderTokens = function renderTokens(tokens, context, partials, originalTemplate) {
        var buffer = '';
        var token, symbol, value;
        for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
            value = undefined;
            token = tokens[i];
            symbol = token[0];
            if (symbol === '#')
                value = this.renderSection(token, context, partials, originalTemplate);
            else if (symbol === '^')
                value = this.renderInverted(token, context, partials, originalTemplate);
            else if (symbol === '>')
                value = this.renderPartial(token, context, partials, originalTemplate);
            else if (symbol === '&')
                value = this.unescapedValue(token, context);
            else if (symbol === 'name')
                value = this.escapedValue(token, context);
            else if (symbol === 'text')
                value = this.rawValue(token);
            if (value !== undefined)
                buffer += value;
        }
        return buffer;
    };
    Writer.prototype.renderSection = function renderSection(token, context, partials, originalTemplate) {
        var self = this;
        var buffer = '';
        var value = context.lookup(token[1]);
        function subRender(template) {
            return self.render(template, context, partials);
        }
        if (!value)
            return;
        if (isArray(value)) {
            for (var j = 0, valueLength = value.length; j < valueLength; ++j) {
                buffer += this.renderTokens(token[4], context.push(value[j]), partials, originalTemplate);
            }
        }
        else if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number') {
            buffer += this.renderTokens(token[4], context.push(value), partials, originalTemplate);
        }
        else if (isFunction(value)) {
            if (typeof originalTemplate !== 'string')
                throw new Error('Cannot use higher-order sections without the original template');
            value = value.call(context.view, originalTemplate.slice(token[3], token[5]), subRender);
            if (value != null)
                buffer += value;
        }
        else {
            buffer += this.renderTokens(token[4], context, partials, originalTemplate);
        }
        return buffer;
    };
    Writer.prototype.renderInverted = function renderInverted(token, context, partials, originalTemplate) {
        var value = context.lookup(token[1]);
        if (!value || (isArray(value) && value.length === 0))
            return this.renderTokens(token[4], context, partials, originalTemplate);
    };
    Writer.prototype.renderPartial = function renderPartial(token, context, partials) {
        if (!partials)
            return;
        var value = isFunction(partials) ? partials(token[1]) : partials[token[1]];
        if (value != null)
            return this.renderTokens(this.parse(value), context, partials, value);
    };
    Writer.prototype.unescapedValue = function unescapedValue(token, context) {
        var value = context.lookup(token[1]);
        if (value != null)
            return value;
    };
    Writer.prototype.escapedValue = function escapedValue(token, context) {
        var value = context.lookup(token[1]);
        if (value != null)
            return mustache.escape(value);
    };
    Writer.prototype.rawValue = function rawValue(token) {
        return token[1];
    };
    mustache.name = 'mustache.js';
    mustache.version = '2.2.1';
    mustache.tags = ['{{', '}}'];
    var defaultWriter = new Writer();
    mustache.clearCache = function clearCache() {
        return defaultWriter.clearCache();
    };
    mustache.parse = function parse(template, tags) {
        return defaultWriter.parse(template, tags);
    };
    mustache.render = function render(template, view, partials) {
        if (typeof template !== 'string') {
            throw new TypeError('Invalid template! Template should be a "string" ' +
                'but "' + typeStr(template) + '" was given as the first ' +
                'argument for mustache#render(template, view, partials)');
        }
        return defaultWriter.render(template, view, partials);
    };
    mustache.to_html = function to_html(template, view, partials, send) {
        var result = mustache.render(template, view, partials);
        if (isFunction(send)) {
            send(result);
        }
        else {
            return result;
        }
    };
    mustache.escape = escapeHtml;
    mustache.Scanner = Scanner;
    mustache.Context = Context;
    mustache.Writer = Writer;
}));
0;
class Utility {
    static strPadLeft(nr, n, str) {
        return Array(n - String(nr).length + 1).join(str || '0') + nr;
    }
    static dateToTimestamp(date) {
        return Math.floor(date.getTime() / 1000);
    }
    static createDate(year, month, day, hour, minute, second) {
        return new Date(`${year}/${month}/${day} ${hour}:${minute}:${second}`);
    }
    static isTouchDevice() {
        return !!('ontouchstart' in window
            || navigator.maxTouchPoints);
    }
    static logMessage(message, color = '#000000') {
        if (console && console.log) {
            console.log(`%c ${message}`, `color: ${color}`);
        }
    }
    static logError(message) {
        if (console && console.error) {
            console.error(`[ERROR] ${message}`);
        }
    }
    static logException(message) {
        if (console && console.warn) {
            if (message instanceof Error) {
                console.warn(`[EXCEPTION:${message.name}] ${message.message}`);
            }
            else {
                console.warn(`[EXCEPTION] ${message}`);
            }
        }
    }
}
'use strict';
class VVSDefaultSettings {
    constructor() {
        this.maxEntries = 20;
        this.minDeparture = 3;
        this.maxDeparture = 120;
        this.blacklistDirection = false;
        this.whitelistDirection = false;
        this.blacklistLine = false;
        this.whitelistLine = false;
        this.delayClasses = [];
    }
}
'use strict';
class VVSTimetableEntry {
    constructor(data) {
        if (data) {
            for (var i in data) {
                this[i] = data[i];
            }
        }
    }
}
'use strict';
class VVS {
    constructor(station, options) {
        this.requestUrl = 'vvs.php';
        this.station = station;
        this.configuration = $.extend(new VVSDefaultSettings(), options);
        if (!window.Promise) {
            throw new Error('Promises not available, please update browsers');
        }
    }
    request(data) {
        return $.ajax({
            url: this.requestUrl,
            dataType: "json",
            data: data
        });
    }
    requestStationDepartures() {
        var station = this.station;
        if (VVS.stationRequestQueue[station]) {
            return VVS.stationRequestQueue[station];
        }
        var request = this.request({
            type: "departures",
            station: station
        });
        let promise = new Promise((resolve, reject) => {
            request.done((data) => {
                resolve(data);
            });
            request.error((jqXHR, textStatus, errorThrown) => {
                reject(`${textStatus}: ${errorThrown}`);
            });
        });
        promise.then(() => {
            delete VVS.stationRequestQueue[station];
        });
        promise.catch(() => {
            delete VVS.stationRequestQueue[station];
        });
        return VVS.stationRequestQueue[station] = promise;
    }
    setRequestUrl(url) {
        this.requestUrl = url;
    }
    stationSchedule() {
        var request = this.requestStationDepartures();
        return new Promise((resolve, reject) => {
            request.then((ajaxData) => {
                var currentTimestamp = Utility.dateToTimestamp(new Date());
                var data = (JSON.parse(JSON.stringify(ajaxData)));
                var stops = [];
                var ret = this.prepareStationData(data);
                if (data.length) {
                    $.each(data, (index, line) => {
                        if (line.direction === 'Zug endet hier') {
                            return;
                        }
                        var departureTime = line.departureTime;
                        delete line.departureTime;
                        line = new VVSTimetableEntry(line);
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
                    if (!this.configuration.maxEntries || stops.length >= this.configuration.maxEntries) {
                        stops = stops.filter((value) => {
                            return (value.departure >= this.configuration.minDeparture && value.departure <= this.configuration.maxDeparture);
                        });
                    }
                    if (this.configuration.whitelistDirection) {
                        stops = stops.filter((value) => {
                            return value.direction.match(this.configuration.whitelistDirection);
                        });
                    }
                    if (this.configuration.blacklistDirection) {
                        stops = stops.filter((value) => {
                            return !(value.direction.match(this.configuration.blacklistDirection));
                        });
                    }
                    if (this.configuration.blacklistLine) {
                        stops = stops.filter((value) => {
                            return !(value.number.match(this.configuration.blacklistLine));
                        });
                    }
                    if (this.configuration.whitelistLine) {
                        stops = stops.filter((value) => {
                            return value.number.match(this.configuration.whitelistLine);
                        });
                    }
                    if (this.configuration.maxEntries) {
                        stops.splice(this.configuration.maxEntries);
                    }
                }
                ret.stops = stops;
                resolve(ret);
            }, function (reason) {
                reject(reason);
            });
        });
    }
    calculateDepatureTime(departure) {
        var date = Utility.createDate(departure.year, departure.month, departure.day, departure.hour, departure.minute, 0);
        return `${Utility.strPadLeft(date.getHours(), 2, '0')}:${Utility.strPadLeft(date.getMinutes(), 2, '0')}`;
    }
    calculateDepatureTimeRel(departure, currentTimestamp) {
        var departureTimestamp = Utility.dateToTimestamp(Utility.createDate(departure.year, departure.month, departure.day, departure.hour, departure.minute, 0));
        var ret = Math.floor((departureTimestamp - currentTimestamp) / 60);
        return ret;
    }
    transformLineNumberToType(lineNumber) {
        var ret = "";
        var match;
        if (!isNaN(Number(lineNumber))) {
            ret = "B";
        }
        else {
            if (match = lineNumber.match(/^([a-z]+)/i)) {
                ret = match[0];
            }
            else {
                ret = lineNumber.charAt(0);
            }
        }
        return ret;
    }
    transformDelayToType(delay) {
        var ret = '';
        switch (Math.sign(delay)) {
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
    calculateDelayClass(line) {
        var ret = '';
        $.each(this.configuration.delayClasses, (index, delayConf) => {
            switch (Math.sign(delayConf.delay)) {
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
    prepareStationData(data) {
        var ret = {
            station: {
                id: this.station,
                name: false,
                coordinates: false,
            },
            stops: []
        };
        if (data.length) {
            var firstStop = data.pop();
            ret.station.name = firstStop.stopName;
            ret.station.coordinates = firstStop.stationCoordinates;
        }
        return ret;
    }
}
VVS.stationRequestQueue = {};
'use strict';
class VVSCached extends VVS {
    constructor() {
        super(...arguments);
        this.cacheTime = 59;
    }
    cacheGetData(key) {
        var data = localStorage.getItem(key);
        if (data) {
            return JSON.parse(data);
        }
        else {
            throw new Error(`${this.station}: Could not get cached data (key ${key})`);
        }
    }
    cacheSetData(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }
    requestStationDepartures() {
        var promise;
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
            }
            catch (e) {
                Utility.logException(e);
                lastUptimeTime = false;
                ret = false;
            }
            if (lastUptimeTime && ret && (currentTime - lastUptimeTime <= this.cacheTime)) {
                promise = new Promise((resolve) => {
                    resolve(ret);
                });
            }
            else {
                promise = super.requestStationDepartures();
                promise.then((ajaxData) => {
                    try {
                        var data = (JSON.parse(JSON.stringify(ajaxData)));
                        this.cacheSetData(keyData, data);
                        this.cacheSetData(keyTimestamp, currentTime);
                    }
                    catch (e) {
                        Utility.logException(e);
                    }
                });
            }
        }
        catch (e) {
            Utility.logException(e);
            promise = super.requestStationDepartures();
        }
        return promise;
    }
    prepareStationData(data) {
        var ret = super.prepareStationData(data);
        var cacheKeyTitle = `${this.station}.title`;
        var cacheKeyInfo = `${this.station}.info`;
        if (ret.station.name) {
            try {
                this.cacheSetData(cacheKeyInfo, ret.station);
            }
            catch (e) {
                Utility.logException(e);
            }
        }
        else {
            try {
                var stationInfo = this.cacheGetData(cacheKeyInfo);
                if (stationInfo) {
                    ret.station = stationInfo;
                }
            }
            catch (e) {
                Utility.logException(e);
            }
        }
        return ret;
    }
}
$.fn.clock = function (options) {
    this.each(function (index, el) {
        var $this = $(el);
        var settings = $.extend(true, {
            template: '{{hours}}:{{minutes}}:{{seconds}}'
        }, $this.data(), options);
        $this.on('click', () => {
            $this.hide();
        });
        var callback = () => {
            var date = new Date();
            var view = {
                hours: () => { return Utility.strPadLeft(date.getHours(), 2, '0'); },
                minutes: () => { return Utility.strPadLeft(date.getMinutes(), 2, '0'); },
                seconds: () => { return Utility.strPadLeft(date.getSeconds(), 2, '0'); },
                day: () => { return Utility.strPadLeft(date.getDay(), 2, '0'); },
                month: () => { return Utility.strPadLeft(date.getMonth(), 2, '0'); },
                year: () => { return date.getFullYear(); }
            };
            $this.html(Mustache.render(settings.template, view));
        };
        setInterval(callback, 900);
        callback();
    });
};
'use strict';
class VVSStationDefaultSettings extends VVSDefaultSettings {
    constructor() {
        super(...arguments);
        this.updateTime = 60 * 1000;
        this.localCache = true;
        this.timeToggle = 0;
        this.intelligentTimeThreshold = 60;
        this.loadingIndicator = '<div class="loader"><svg class="circular" viewBox="25 25 50 50"><circle class="path" cx="50" cy="50" r="20" fill="none" stroke-width="10" stroke-miterlimit="10"/></svg></div>';
        this.departureType = 'relative';
        this.requestUrl = 'vvs.php';
        this.translations = {
            noData: 'Keine Abfahrtszeiten vorhanden',
            minute: 'min',
            from: 'ab',
            departureCanceld: 'Zug fällt aus'
        };
        this.templateMain = `
            <h3>{{title}}<i class="departure-minimum-desc">{{departureTitle}}</i></h3>
            {{&content}}
    `;
        this.templateTitle = `{{stationName}}`;
        this.templateTimetable = `
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
        this.templateNoData = '<div class="alert alert-warning" role="alert">{{settings.translations.noData}}</div>';
        this.delayClasses = [{
                delay: -1,
                className: 'info'
            }, {
                delay: 1,
                className: 'warning'
            }, {
                delay: 3,
                className: 'danger'
            }, {
                delay: 9999,
                className: 'danger canceled'
            }, {
                delay: -9999,
                className: 'danger canceled'
            }];
    }
}
$.fn.vvsStation = function (options) {
    this.each(function (index, el) {
        var $this = $(el);
        var vvs;
        var settings = $.extend(true, new VVSStationDefaultSettings(), $this.data(), options);
        if (!settings.station) {
            Utility.logError('VVS station not set');
            $this.text('VVS Station not set!');
            return;
        }
        if (settings.blacklistDirection)
            settings.blacklistDirection = new RegExp(settings.blacklistDirection);
        if (settings.whitelistDirection)
            settings.whitelistDirection = new RegExp(settings.whitelistDirection);
        if (settings.blacklistLine)
            settings.blacklistLine = new RegExp(settings.blacklistLine);
        if (settings.whitelistLine)
            settings.whitelistLine = new RegExp(settings.whitelistLine);
        try {
            if (settings.localCache && localStorage) {
                vvs = new VVSCached(settings.station, settings);
                Utility.logMessage(`Init VVS Station Monitor for station ${settings.station} (localCache: yes)`, '#008000');
            }
            else {
                vvs = new VVS(settings.station, settings);
                Utility.logMessage(`Init VVS Station Monitor for station ${settings.station} (localCache: no)`, '#008000');
            }
        }
        catch (e) {
            $this.html(`<div class="alert alert-danger" role="alert">${e.message}</div>`);
            return;
        }
        if (settings.requestUrl) {
            vvs.setRequestUrl(settings.requestUrl);
        }
        $this.addClass(`time-${settings.departureType}`);
        if (!Utility.isTouchDevice()) {
            $this.on('click', () => {
                $this.toggleClass('hover');
            });
        }
        if (settings.timeToggle) {
            setInterval(() => {
                $this.toggleClass('time-toggle');
            }, settings.timeToggle * 1000);
        }
        var addLoadingIndicator = () => {
            if (!$this.find('.spinner-content').length) {
                $this.append('<div class="spinner-content">' + settings.loadingIndicator + '</div>');
            }
        };
        var humanRelativeTime = (line) => {
            var ret = '';
            var departure = line.departure;
            if (departure >= 60) {
                var hours = Math.floor(departure / 60);
                var minutes = String(Math.floor(departure % 60));
                ret = `<i class="hours">${hours}</i><i class="minutes">${minutes}</i>`;
            }
            else {
                ret = `<i class="minutes">${departure}</i>`;
            }
            return ret;
        };
        var processStationDataRow = (line) => {
            return {
                line: line,
                delay: {
                    type: line.delayType,
                    value: line.delayAbs
                },
                departure: {
                    relative: () => {
                        if (line.delay === 9999 || line.delay === -9999) {
                            return `<span class="marquee"><span>${line.departureTime} -- ${settings.translations.departureCanceld}</span></span>`;
                        }
                        if (settings.departureType === 'intelligent' && line.departure >= settings.intelligentTimeThreshold) {
                            return line.departureTime;
                        }
                        else {
                            return humanRelativeTime(line);
                        }
                    },
                    absolute: () => {
                        if (line.delay === 9999 || line.delay === -9999) {
                            return `<span class="marquee"><span>${settings.translations.departureCanceld}</span></span>`;
                        }
                        return line.departureTime;
                    }
                }
            };
        };
        var updateSchedule = () => {
            addLoadingIndicator();
            var schedule = vvs.stationSchedule();
            schedule.then((data) => {
                var stationName = () => {
                    if (data && data.station && data.station.name) {
                        return data.station.name;
                    }
                    else {
                        return `Haltestelle ${settings.station}`;
                    }
                };
                var viewMain = {
                    settings: settings,
                    stationName: stationName,
                    title: () => {
                        var viewTitle = {
                            stationName: stationName,
                        };
                        return Mustache.render(settings.templateTitle, viewTitle);
                    },
                    departureTitle: () => {
                        if (data && data.stops && data.stops.length) {
                            return `${settings.translations.from} ${settings.minDeparture} ${settings.translations.minute}`;
                        }
                    },
                    content: () => {
                        var template;
                        var viewContent = {
                            settings: settings,
                            station: stationName,
                            timetable: []
                        };
                        if (data && data.stops && data.stops.length) {
                            template = settings.templateTimetable;
                            $.each(data.stops, (index, line) => {
                                viewContent.timetable.push(processStationDataRow(line));
                            });
                        }
                        else {
                            template = settings.templateNoData;
                        }
                        return Mustache.render(template, viewContent);
                    },
                };
                $this.html(Mustache.render(settings.templateMain, viewMain));
            });
            schedule.catch((message) => {
                $this.html(`<div class="alert alert-danger" role="alert">${message}</div>`);
            });
        };
        addLoadingIndicator();
        setInterval(updateSchedule, settings.updateTime);
        setTimeout(updateSchedule, 100);
    });
    return this;
};

//# sourceMappingURL=main.js.map
