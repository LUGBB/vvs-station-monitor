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
                filterDirection: false
            }, options);
            var request = this.request({
                type: "departures",
                station: station
            });
            var promise = new Promise(function (resolve, reject) {
                request.done(function (data) {
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
                    // filter by direction
                    if (settings.filterDirection) {
                        ret = ret.filter(function (value) {
                            return value.direction.match(settings.filterDirection);
                        });
                    }
                    // filter by line
                    if (settings.filterLine) {
                        ret = ret.filter(function (value) {
                            return value.number.match(settings.filterLine);
                        });
                    }
                    // filter by max entires
                    if (settings.maxEntries) {
                        ret.splice(settings.maxEntries);
                    }
                    resolve(ret);
                });
                // ajax error
                request.error(function (jqXHR, textStatus, errorThrown) {
                    reject(textStatus + ": " + errorThrown);
                });
            });
            return promise;
        };
        VVS.prototype.calculateDepatureTime = function (departure, currentdate) {
            var ret = 0;
            ret = (parseInt(departure.year) * 365 * 24 * 60) - (parseInt(currentdate.getFullYear()) * 365 * 24 * 60); //Get the year
            ret = ret + (parseInt(departure.month) * 12 * 24 * 60) - ((parseInt(currentdate.getMonth()) + 1) * 12 * 24 * 60); //Get the month
            ret = ret + (parseInt(departure.day) * 24 * 60) - (parseInt(currentdate.getDate()) * 24 * 60); //Get the day
            ret = ret + ((parseInt(departure.hour)) * 60) - (parseInt(currentdate.getHours()) * 60); //Get the hour
            ret = ret + parseInt(departure.minute) - parseInt(currentdate.getMinutes()); //Get the minute
            return ret;
        };
        VVS.prototype.transformLineNumberToType = function (lineNumber) {
            var ret = "";
            // check if Bus
            if (!isNaN(Number(lineNumber))) {
                ret = "B";
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
    $.fn.vvsStation = function (options) {
        this.each(function (index, el) {
            var $this = $(el);
            var vvs = new VVS();
            // default settings
            var settings = $.extend({
                // These are the defaults.
                color: "#556b2f",
                backgroundColor: "white",
                updateTime: 90 * 1000,
                updateTimeRandom: 5 * 1000,
                firstUpdateTimeRandom: 2.5 * 1000,
                station: false,
                maxEntries: 20,
                minDeparture: 3,
                maxDeparture: 120,
                loadingIndicator: '',
                filterDirection: false,
                filterLine: false,
                requestUrl: 'vvs.php',
                translation: {
                    noData: 'No station info available'
                }
            }, $this.data(), options);
            if (settings.filterDirection)
                settings.filterDirection = new RegExp(settings.filterDirection);
            if (settings.filterLine)
                settings.filterLine = new RegExp(settings.filterLine);
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
            var firstReqTime = 250 + (Math.random() * settings.firstUpdateTimeRandom);
            addLoadingIndicator();
            setInterval(updateSchedule, intervalTime);
            setTimeout(updateSchedule, firstReqTime);
        });
        return this;
    };
})();
//# sourceMappingURL=vvs.js.map