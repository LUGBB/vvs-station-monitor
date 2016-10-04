var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
(function () {
    'use strict';
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
                whitelistLine: false
            }, options);
            var request = this.requestStationDepartures(station);
            return new Promise(function (resolve, reject) {
                request.then(function (data) {
                    var currentdate = new Date();
                    var ret = [];
                    $.each(data, function (index, line) {
                        var departureTime = line.departureTime;
                        //delete line.departureTime;
                        line.departure = _this.calculateDepatureTime(departureTime, currentdate);
                        line.numberType = _this.transformLineNumberToType(line.number);
                        line.delayType = _this.transformDelayToType(line.delay);
                        line.delaySign = Math.sign(line.delay);
                        line.delayAbs = Math.abs(line.delay);
                        ret.push(line);
                    });
                    // filter by departure time
                    ret = ret.filter(function (value) {
                        return (value.departure >= settings.minDeparture && value.departure <= settings.maxDeparture);
                    });
                    // whitelist by direction
                    if (settings.whitelistDirection) {
                        ret = ret.filter(function (value) {
                            return value.direction.match(settings.whitelistDirection);
                        });
                    }
                    // blacklist by direction
                    if (settings.blacklistDirection) {
                        ret = ret.filter(function (value) {
                            return !(value.direction.match(settings.blacklistDirection));
                        });
                    }
                    // whitelist by line
                    if (settings.blacklistLine) {
                        ret = ret.filter(function (value) {
                            return !(value.number.match(settings.blacklistLine));
                        });
                    }
                    // blacklist by line
                    if (settings.whitelistLine) {
                        ret = ret.filter(function (value) {
                            return value.number.match(settings.whitelistLine);
                        });
                    }
                    // filter by max entires
                    if (settings.maxEntries) {
                        ret.splice(settings.maxEntries);
                    }
                    resolve(ret);
                }, function (reason) {
                    // rejection
                    reject(reason);
                });
            });
        };
        VVS.prototype.calculateDepatureTime = function (departure, currentdate) {
            var ret = 0;
            ret += (parseInt(departure.year) * 365 * 24 * 60) - (parseInt(currentdate.getFullYear()) * 365 * 24 * 60); //Get the year
            ret += (parseInt(departure.month) * 12 * 24 * 60) - ((parseInt(currentdate.getMonth()) + 1) * 12 * 24 * 60); //Get the month
            ret += (parseInt(departure.day) * 24 * 60) - (parseInt(currentdate.getDate()) * 24 * 60); //Get the day
            ret += ((parseInt(departure.hour)) * 60) - (parseInt(currentdate.getHours()) * 60); //Get the hour
            ret += parseInt(departure.minute) - parseInt(currentdate.getMinutes()); //Get the minute
            return ret;
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
        return VVS;
    }());
    var CachedVVS = (function (_super) {
        __extends(CachedVVS, _super);
        function CachedVVS() {
            _super.apply(this, arguments);
            this.cacheTime = 59;
        }
        CachedVVS.prototype.requestStationDepartures = function (station) {
            if (!localStorage) {
                return _super.prototype.requestStationDepartures.call(this, station);
            }
            var keyTimestamp = '' + station + '.timestamp';
            var keyData = '' + station + '.data';
            var currentTime = Math.floor(Date.now() / 1000);
            var lastUptimeTime = localStorage.getItem(keyTimestamp);
            var ret = localStorage.getItem(keyData);
            if (lastUptimeTime) {
                lastUptimeTime = JSON.parse(lastUptimeTime);
            }
            else {
                lastUptimeTime = false;
            }
            if (ret) {
                ret = JSON.parse(ret);
            }
            else {
                ret = false;
            }
            if (lastUptimeTime && ret && (currentTime - lastUptimeTime <= 60)) {
                return new Promise(function (resolve, reject) {
                    resolve(ret);
                });
            }
            else {
                ret = _super.prototype.requestStationDepartures.call(this, station);
                ret.then(function (data) {
                    localStorage.setItem(keyData, JSON.stringify(data));
                    localStorage.setItem(keyTimestamp, JSON.stringify(currentTime));
                });
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
                updateTime: 60 * 1000,
                updateTimeRandom: 5 * 1000,
                firstUpdateTimeRandom: 0,
                station: false,
                maxEntries: 20,
                minDeparture: 3,
                maxDeparture: 120,
                loadingIndicator: '',
                blacklistDirection: false,
                whitelistDirection: false,
                blacklistLine: false,
                whitelistLine: false,
                requestUrl: 'vvs.php',
                translation: {
                    noData: 'No station info available'
                }
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
            var addLoadingIndicator = function () {
                if (!$this.find('.spinner-content').length) {
                    $this.append('<div class="spinner-content">' + settings.loadingIndicator + '</div>');
                }
            };
            var updateSchedule = function () {
                addLoadingIndicator();
                var schedule = vvs.stationSchedule(settings.station, settings);
                schedule.then(function (data) {
                    $this.html('');
                    var tableEl = false;
                    if (data.length) {
                        $.each(data, function (index, line) {
                            if (index === 0) {
                                $this.append("<h3>" + line.stopName + "</h3>");
                                tableEl = $this.append('<table class="table table-condensed"><tbody></tbody></table>').find('table tbody');
                            }
                            var rowClasses = [];
                            switch (line.delaySign) {
                                case 1:
                                    rowClasses.push('danger');
                                    break;
                                case -1:
                                    rowClasses.push('warning');
                                    break;
                            }
                            var rowClass = rowClasses.join(' ');
                            var template = "\n                            <tr class=\"" + rowClass + "\">\n                                <td>\n                                    <div class=\"overall-box\">\n                                        <div class=\"departure-box\">\n                                            <div class=\"line-symbol\" data-line=\"" + line.numberType + "\" data-line=\"" + line.number + "\">" + line.number + "</div>\n                                            <div class=\"direction\">" + line.direction + "</div>\n                                        </div>\n                                        <div class=\"time-box\">\n                                            <div class=\"label label-danger delay\" data-delay=\"" + line.delayType + "\">" + line.delayAbs + "</div>\n                                            <div class=\"departure\">" + line.departure + "</div>\n                                        </div>\n                                    </div>\n                                </td>\n                            </tr>";
                            tableEl.append(template);
                        });
                    }
                    else {
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
})();
//# sourceMappingURL=vvs.js.map