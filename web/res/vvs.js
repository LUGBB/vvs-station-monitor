var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
(function () {
    'use strict';
    function padLeft(nr, n, str) {
        return Array(n - String(nr).length + 1).join(str || '0') + nr;
    }
    var VVS = (function () {
        function VVS() {
        }
        VVS.prototype.request = function (data) {
            return $.ajax({
                url: this.requestUrl,
                dataType: "json",
                data: data
            });
        };
        VVS.prototype.requestStationDepartures = function (station) {
            var request = this.request({
                type: "departures",
                station: station
            });
            return new Promise(function (resolve, reject) {
                request.done(function (data) {
                    resolve(data);
                });
                // ajax error
                request.error(function (jqXHR, textStatus, errorThrown) {
                    reject(textStatus + ": " + errorThrown);
                });
            });
        };
        VVS.prototype.setRequestUrl = function (url) {
            this.requestUrl = url;
        };
        VVS.prototype.stationSchedule = function (station, options) {
            var _this = this;
            // default settings
            var settings = $.extend({
                maxEntries: 20,
                minDeparture: 3,
                maxDeparture: 120,
                blacklistDirection: false,
                whitelistDirection: false,
                blacklistLine: false,
                whitelistLine: false,
                delayWarnings: []
            }, options);
            var request = this.requestStationDepartures(station);
            return new Promise(function (resolve, reject) {
                request.then(function (data) {
                    var currentdate = new Date();
                    var stops = [];
                    var ret = _this.prepareStationData(station, data);
                    if (data.length) {
                        $.each(data, function (index, line) {
                            // filter "trains stops here"
                            if (line.direction === 'Zug endet hier') {
                                return;
                            }
                            var departureTime = line.departureTime;
                            line.departureTime = _this.calculateDepatureTime(departureTime);
                            line.departure = _this.calculateDepatureTimeRel(departureTime, currentdate);
                            line.numberType = _this.transformLineNumberToType(line.number);
                            line.delayType = _this.transformDelayToType(line.delay);
                            line.delaySign = Math.sign(line.delay);
                            line.delayAbs = Math.abs(line.delay);
                            line.delayClass = _this.calculateDelayClass(line, settings);
                            stops.push(line);
                        });
                        stops.sort(function (a, b) {
                            return a.departure - b.departure;
                        });
                        // filter by departure time
                        if (!settings.maxEntries || stops.length >= settings.maxEntries) {
                            stops = stops.filter(function (value) {
                                return (value.departure >= settings.minDeparture && value.departure <= settings.maxDeparture);
                            });
                        }
                        // whitelist by direction
                        if (settings.whitelistDirection) {
                            stops = stops.filter(function (value) {
                                return value.direction.match(settings.whitelistDirection);
                            });
                        }
                        // blacklist by direction
                        if (settings.blacklistDirection) {
                            stops = stops.filter(function (value) {
                                return !(value.direction.match(settings.blacklistDirection));
                            });
                        }
                        // whitelist by line
                        if (settings.blacklistLine) {
                            stops = stops.filter(function (value) {
                                return !(value.number.match(settings.blacklistLine));
                            });
                        }
                        // blacklist by line
                        if (settings.whitelistLine) {
                            stops = stops.filter(function (value) {
                                return value.number.match(settings.whitelistLine);
                            });
                        }
                        // filter by max entires
                        if (settings.maxEntries) {
                            stops.splice(settings.maxEntries);
                        }
                    }
                    ret.stops = stops;
                    resolve(ret);
                }, function (reason) {
                    // rejection
                    reject(reason);
                });
            });
        };
        VVS.prototype.calculateDepatureTime = function (departure, currentdate) {
            var date = this.createDate(departure.year, departure.month, departure.day, departure.hour, departure.minute, 0);
            return date.getHours() + ":" + padLeft(date.getMinutes(), 2, 0);
        };
        VVS.prototype.calculateDepatureTimeRel = function (departure, currentdate) {
            var departureTimestamp = this.dateToTimestamp(this.createDate(departure.year, departure.month, departure.day, departure.hour, departure.minute, 0));
            var currentTimestamp = Math.floor(Date.now() / 1000);
            var ret = Math.floor((departureTimestamp - currentTimestamp) / 60);
            return ret;
        };
        VVS.prototype.createDate = function (year, month, day, hour, minute, second) {
            return new Date(year + "/" + month + "/" + day + " " + hour + ":" + minute + ":" + second);
        };
        VVS.prototype.dateToTimestamp = function (date) {
            return Math.floor(date.getTime() / 1000);
            '';
        };
        VVS.prototype.transformLineNumberToType = function (lineNumber) {
            var ret = "";
            var match = lineNumber.match(/^([a-z]+)/i);
            // check if Bus
            if (!isNaN(Number(lineNumber))) {
                ret = "B";
            }
            else if (match) {
                ret = lineNumber[0];
            }
            else {
                ret = lineNumber.charAt(0);
            }
            return ret;
        };
        VVS.prototype.transformDelayToType = function (delay) {
            var ret = '';
            switch (Math.sign(delay)) {
                case -1:
                    ret = "-";
                    break;
                case 1:
                    ret = "+";
                    break;
            }
            return ret;
        };
        VVS.prototype.calculateDelayClass = function (line, settings) {
            var ret = '';
            $.each(settings.delayWarnings, function (index, delayConf) {
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
        };
        VVS.prototype.prepareStationData = function (station, data) {
            var ret = {
                station: {
                    name: false,
                    coordinates: false
                },
                stops: []
            };
            if (data.length) {
                var firstStop = data.pop();
                ret.station.name = firstStop.stopName;
                ret.station.coordinates = firstStop.stationCoordinates;
            }
            return ret;
        };
        return VVS;
    }());
    var CachedVVS = (function (_super) {
        __extends(CachedVVS, _super);
        function CachedVVS() {
            _super.apply(this, arguments);
            this.cacheTime = 59;
        }
        CachedVVS.prototype.cacheGetData = function (key) {
            var data = localStorage.getItem(key);
            if (data) {
                return JSON.parse(data);
            }
            else {
                throw new Exception('Could not get cache data');
            }
        };
        CachedVVS.prototype.cacheSetData = function (key, value) {
            localStorage.setItem(key, JSON.stringify(value));
        };
        CachedVVS.prototype.requestStationDepartures = function (station) {
            var _this = this;
            var promise = false;
            try {
                if (!localStorage) {
                    throw new Exception();
                }
                var keyTimestamp = '' + station + '.timestamp';
                var keyData = '' + station + '.data';
                var currentTime = Math.floor(Date.now() / 1000);
                try {
                    var lastUptimeTime = this.cacheGetData(keyTimestamp);
                    var ret = this.cacheGetData(keyData);
                }
                catch (e) {
                    lastUptimeTime = false;
                    ret = false;
                }
                if (lastUptimeTime && ret && (currentTime - lastUptimeTime <= 60)) {
                    promise = new Promise(function (resolve, reject) {
                        resolve(ret);
                    });
                }
                else {
                    promise = _super.prototype.requestStationDepartures.call(this, station);
                    promise.then(function (data) {
                        try {
                            _this.cacheSetData(keyData, data);
                            _this.cacheSetData(keyTimestamp, currentTime);
                        }
                        catch (e) {
                        }
                    });
                }
            }
            catch (e) {
                // fallback
                promise = _super.prototype.requestStationDepartures.call(this, station);
            }
            return promise;
        };
        CachedVVS.prototype.prepareStationData = function (station, data) {
            var ret = _super.prototype.prepareStationData.call(this, station, data);
            var cacheKeyTitle = '' + station + '.title';
            var cacheKeyInfo = '' + station + '.info';
            if (ret.station.name) {
                try {
                    this.cacheSetData(cacheKeyInfo, ret.station);
                }
                catch (e) {
                }
            }
            else {
                try {
                    // deprecated
                    ret.station.name = this.cacheGetData(cacheKeyTitle);
                }
                catch (e) {
                }
                try {
                    var stationInfo = this.cacheGetData(cacheKeyInfo);
                    if (stationInfo) {
                        ret.station = stationInfo;
                    }
                }
                catch (e) {
                }
            }
            return ret;
        };
        return CachedVVS;
    }(VVS));
    $.fn.vvsStation = function (options) {
        this.each(function (index, el) {
            var $this = $(el);
            var vvs = new CachedVVS();
            // default settings
            var settings = $.extend({
                updateTime: 30 * 1000,
                updateTimeRandom: 5 * 1000,
                firstUpdateTimeRandom: 0,
                station: false,
                maxEntries: 20,
                minDeparture: 3,
                maxDeparture: 120,
                enableTimeToggle: 0,
                toggleTime: 10,
                intelligentTimeThreshold: 60,
                loadingIndicator: '',
                blacklistDirection: false,
                whitelistDirection: false,
                blacklistLine: false,
                whitelistLine: false,
                departureType: 'relative',
                requestUrl: 'vvs.php',
                translation: {
                    noData: 'No station info available'
                },
                delayWarnings: [{
                        delay: -1,
                        className: 'info'
                    }, {
                        delay: 1,
                        className: 'warning'
                    }, {
                        delay: 3,
                        className: 'danger'
                    }]
            }, $this.data(), options);
            if (settings.blacklistDirection)
                settings.blacklistDirection = new RegExp(settings.blacklistDirection);
            if (settings.whitelistDirection)
                settings.whitelistDirection = new RegExp(settings.whitelistDirection);
            if (settings.blacklistLine)
                settings.blacklistLine = new RegExp(settings.blacklistLine);
            if (settings.whitelistLine)
                settings.whitelistLine = new RegExp(settings.whitelistLine);
            if (!settings.station) {
                console.log('VVS station not set');
                return;
            }
            if (settings.requestUrl) {
                vvs.setRequestUrl(settings.requestUrl);
            }
            $this.on('click', function () {
                $this.toggleClass('hover');
            });
            if (settings.enableTimeToggle) {
                setInterval(function () {
                    $this.toggleClass('time-toggle');
                }, settings.toggleTime * 1000);
            }
            var addLoadingIndicator = function () {
                if (!$this.find('.spinner-content').length) {
                    $this.append('<div class="spinner-content">' + settings.loadingIndicator + '</div>');
                }
            };
            var humanRelativeTime = function (line) {
                var ret = '';
                var departure = line.departure;
                if (departure >= 60) {
                    var hours = Math.floor(departure / 60);
                    var minutes = padLeft(Math.floor(departure % 60), 2, "0");
                    ret += "<i class=\"time relative hours-minutes\"><i class=\"hour\">" + hours + "</i><i class=\"minute\">" + minutes + "</i></i>";
                }
                else {
                    ret += "<i class=\"time relative minutes\">" + departure + "</i>";
                }
                ret += "<i class=\"time absolute hover\">" + line.departureTime + "</i>";
                ret = "<i class=\"time-combined\">" + ret + "</i>";
                return ret;
            };
            var updateSchedule = function () {
                addLoadingIndicator();
                var schedule = vvs.stationSchedule(settings.station, settings);
                schedule.then(function (data) {
                    $this.html('');
                    var tableEl = false;
                    if (data && data.stops && data.stops.length) {
                        $.each(data.stops, function (index, line) {
                            if (index === 0) {
                                $this.append("<h3>" + data.station.name + "</h3>");
                                tableEl = $this.append('<table class="table table-condensed"><tbody></tbody></table>').find('table tbody');
                            }
                            var departureType = 'rel';
                            var departureValue = humanRelativeTime(line);
                            switch (settings.departureType) {
                                case 'absolute':
                                    departureType = 'abs';
                                    departureValue = line.departureTime;
                                    break;
                                case 'intelligent':
                                    if (line.departure >= settings.intelligentTimeThreshold) {
                                        departureType = 'abs';
                                        departureValue = line.departureTime;
                                    }
                                    break;
                            }
                            var template = "\n                            <tr class=\"" + line.delayClass + "\">\n                                <td>\n                                    <div class=\"overall-box\">\n                                        <div class=\"departure-box\">\n                                            <div class=\"line-symbol\" data-line=\"" + line.numberType + "\" data-line=\"" + line.number + "\">" + line.number + "</div>\n                                            <div class=\"direction\">" + line.direction + "</div>\n                                        </div>\n                                        <div class=\"time-box\">\n                                            <div class=\"label label-danger delay\" data-delay=\"" + line.delayType + "\">" + line.delayAbs + "</div>\n                                            <div class=\"departure\" data-departure-type=\"" + departureType + "\">" + departureValue + "</div>\n                                        </div>\n                                    </div>\n                                </td>\n                            </tr>";
                            tableEl.append(template);
                        });
                    }
                    else {
                        if (data.station.name) {
                            $this.append("<h3>" + data.station.name + "</h3>");
                        }
                        $this.append("<div class=\"alert alert-warning\" role=\"alert\">" + settings.translation.noData + " (" + settings.station + ")</div>");
                    }
                });
                schedule.catch(function (message) {
                    $this.html("<div class=\"alert alert-danger\" role=\"alert\">" + message + "</div>");
                });
            };
            var intervalTime = settings.updateTime + (Math.random() * settings.updateTimeRandom);
            var firstReqTime = 1 + (Math.random() * settings.firstUpdateTimeRandom);
            addLoadingIndicator();
            setInterval(updateSchedule, intervalTime);
            setTimeout(updateSchedule, firstReqTime);
        });
        return this;
    };
    $.fn.clock = function (options) {
        this.each(function (index, el) {
            var $this = $(el);
            $this.on('click', function () {
                $this.hide();
            });
            var callback = function () {
                var date = new Date();
                $this.text(padLeft(date.getHours(), 2, 0) + ":" + padLeft(date.getMinutes(), 2, 0) + ":" + padLeft(date.getSeconds(), 2, 0));
            };
            setInterval(callback, 900);
            callback();
        });
    };
    ;
})();
//# sourceMappingURL=vvs.js.map