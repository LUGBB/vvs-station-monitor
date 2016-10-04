(function() {
    'use strict';

    class VVS {
        requestUrl: 'vvs.php'

        request(data) {
            return $.ajax( {
                url: this.requestUrl,
                dataType: "json",
                data: data
            });
        }

        requestStationDepartures(station) {
            var request = this.request({
                type: "departures",
                station: station
            });

            return new Promise((resolve, reject) => {
                request.done(data => {
                    resolve(data);
                });

                // ajax error
                request.error((jqXHR, textStatus, errorThrown) => {
                    reject(`${textStatus}: ${errorThrown}`);
                });
            });
        }

        setRequestUrl(url) {
            this.requestUrl = url;
        }

        stationSchedule(station, options) {

            // default settings
            var settings = $.extend({
                maxEntries: 20,
                minDeparture: 3,
                maxDeparture: 120,
                blacklistDirection: false,
                whitelistDirection: false,
                blacklistLine: false,
                whitelistLine: false,
            }, options);

            var request = this.requestStationDepartures(station);


            return new Promise((resolve, reject) => {
                request.then(data => {
                    var currentdate = new Date();

                    var ret = [];
                    $.each(data, (index,line) => {
                        var departureTime = line.departureTime;
                        //delete line.departureTime;

                        line.departure = this.calculateDepatureTime(departureTime, currentdate);
                        line.numberType = this.transformLineNumberToType(line.number);
                        line.delayType = this.transformDelayToType(line.delay);
                        line.delaySign = Math.sign(line.delay);
                        line.delayAbs  = Math.abs(line.delay);

                        ret.push(line);
                    });

                    // filter by departure time
                    ret = ret.filter((value) => {
                        return (value.departure >= settings.minDeparture && value.departure <= settings.maxDeparture)
                    });

                    // whitelist by direction
                    if (settings.whitelistDirection) {
                        ret = ret.filter((value) => {
                            return value.direction.match(settings.whitelistDirection);
                        });
                    }

                    // blacklist by direction
                    if (settings.blacklistDirection) {
                        ret = ret.filter((value) => {
                            return !(value.direction.match(settings.blacklistDirection));
                        });
                    }

                    // whitelist by line
                    if (settings.blacklistLine) {
                        ret = ret.filter((value) => {
                            return !(value.number.match(settings.blacklistLine));
                        });
                    }

                    // blacklist by line
                    if (settings.whitelistLine) {
                        ret = ret.filter((value) => {
                            return value.number.match(settings.whitelistLine);
                        });
                    }

                    // filter by max entires
                    if (settings.maxEntries) {
                        ret.splice(settings.maxEntries);
                    }

                    resolve(ret);
                }, function(reason) {
                    // rejection
                    reject(reason);
                });
            });
        }

        calculateDepatureTime(departure, currentdate) {
            var ret = 0;

            ret = (parseInt(departure.year)*365*24*60)-(parseInt(currentdate.getFullYear())*365*24*60);  //Get the year
            ret = ret + (parseInt(departure.month)*12*24*60)-((parseInt(currentdate.getMonth())+1)*12*24*60);  //Get the month
            ret = ret + (parseInt(departure.day)*24*60)-(parseInt(currentdate.getDate())*24*60);  //Get the day
            ret = ret + ((parseInt(departure.hour))*60)-(parseInt(currentdate.getHours())*60);  //Get the hour
            ret = ret + parseInt(departure.minute)-parseInt(currentdate.getMinutes());  //Get the minute

            return ret;
        }

        transformLineNumberToType(lineNumber) {
            var ret = "";

            // check if Bus
            if (!isNaN(Number(lineNumber))) {
                ret = "B";
            } else {
                ret = lineNumber.charAt(0);
            }

            return ret;
        }

        transformDelayToType(delay) {
            var ret = '';
            switch(Math.sign(delay)) {
                case -1:
                    ret = "-";
                    break;

                case 1:
                    ret = "+";
                    break;
            }

            return ret;
        }
    }

    class CachedVVS extends VVS {
        cacheTime = 59;

        requestStationDepartures(station) {
            if (!localStorage) {
                return super.requestStationDepartures(station);
            }

            var keyTimestamp = '' + station + '.timestamp';
            var keyData      = '' + station + '.data';

            var currentTime  = Math.floor(Date.now() / 1000);


            var lastUptimeTime = localStorage.getItem(keyTimestamp);
            var ret            = localStorage.getItem(keyData);

            if (lastUptimeTime) {
                lastUptimeTime = JSON.parse(lastUptimeTime);
            } else {
                lastUptimeTime = false;
            }

            if (ret) {
                ret = JSON.parse(ret);
            } else {
                ret = false;
            }

            if (lastUptimeTime && ret && (currentTime - lastUptimeTime <= 60) ) {
                return new Promise((resolve, reject) => {
                    resolve(ret);
                });
            } else {
                ret = super.requestStationDepartures(station);
                ret.then((data) => {
                    localStorage.setItem(keyData, JSON.stringify(data));
                    localStorage.setItem(keyTimestamp, JSON.stringify(currentTime));
                });
            }

            return ret;
        }
    }


    $.fn.vvsStation = function(options) {
        this.each(function(index, el) {
            var $this = $(el);
            var vvs = new CachedVVS();

            // default settings
            var settings = $.extend({
                updateTime:  60 * 1000,
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

            if (settings.blacklistDirection) settings.blacklistDirection = new RegExp(settings.blacklistDirection);
            if (settings.whitelistDirection) settings.whitelistDirection = new RegExp(settings.whitelistDirection);
            if (settings.blacklistLine)      settings.blacklistLine = new RegExp(settings.blacklistLine);
            if (settings.whitelistLine)      settings.whitelistLine = new RegExp(settings.whitelistLine);

            if (!settings.station) {
                console.log('VVS station not set');
                return;
            }

            if (settings.requestUrl) {
                vvs.setRequestUrl(settings.requestUrl);
            }

            var addLoadingIndicator = () => {
                if (!$this.find('.spinner-content').length) {
                    $this.append('<div class="spinner-content">' + settings.loadingIndicator + '</div>');
                }
            }

            var updateSchedule = () => {
                addLoadingIndicator();

                var schedule = vvs.stationSchedule(settings.station, settings);
                schedule.then(data => {
                    $this.html('');

                    var tableEl = false;

                    if(data.length) {
                        $.each(data, (index, line) => {
                            if (index === 0) {
                                $this.append(`<h3>${line.stopName}</h3>`);
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

                            var template = `
                            <tr class="${rowClass}">
                                <td>
                                    <div class="overall-box">
                                        <div class="departure-box">
                                            <div class="line-symbol" data-line="${line.numberType}" data-line="${line.number}">${line.number}</div>
                                            <div class="direction">${line.direction}</div>
                                        </div>
                                        <div class="time-box">
                                            <div class="label label-danger delay" data-delay="${line.delayType}">${line.delayAbs}</div>
                                            <div class="departure">${line.departure}</div>
                                        </div>
                                    </div>
                                </td>
                            </tr>`;
                            tableEl.append(template);
                        });
                    } else {
                        $this.append(`<div class="alert alert-warning" role="alert">${settings.translation.noData} (${settings.station})</div>`);
                    }
                });

                schedule.catch((message) => {
                    $this.html(`<div class="alert alert-danger" role="alert">${message}</div>`);
                });
            };

            var intervalTime = settings.updateTime + ( Math.random() * settings.updateTimeRandom );
            var firstReqTime = 1 + ( Math.random() * settings.firstUpdateTimeRandom );

            addLoadingIndicator();
            setInterval(updateSchedule, intervalTime);
            setTimeout(updateSchedule, firstReqTime);

        });
        return this;
    };
})();
