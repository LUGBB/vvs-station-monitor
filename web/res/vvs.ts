(function() {
    'use strict';

    function padLeft(nr, n, str){
        return Array(n-String(nr).length+1).join(str||'0')+nr;
    }

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

                    var stops = [];
                    var ret = this.prepareStationData(station, data);

                    if (data.length) {
                        $.each(data, (index,line) => {
                            var departureTime = line.departureTime;
                            //delete line.departureTime;

                            line.departureTime = this.calculateDepatureTime(departureTime);
                            line.departure = this.calculateDepatureTimeRel(departureTime, currentdate);
                            line.numberType = this.transformLineNumberToType(line.number);
                            line.delayType = this.transformDelayToType(line.delay);
                            line.delaySign = Math.sign(line.delay);
                            line.delayAbs  = Math.abs(line.delay);

                            stops.push(line);
                        });

                        // filter by departure time
                        stops = stops.filter((value) => {
                            return (value.departure >= settings.minDeparture && value.departure <= settings.maxDeparture)
                        });

                        // whitelist by direction
                        if (settings.whitelistDirection) {
                            stops = stops.filter((value) => {
                                return value.direction.match(settings.whitelistDirection);
                            });
                        }

                        // blacklist by direction
                        if (settings.blacklistDirection) {
                            stops = stops.filter((value) => {
                                return !(value.direction.match(settings.blacklistDirection));
                            });
                        }

                        // whitelist by line
                        if (settings.blacklistLine) {
                            stops = stops.filter((value) => {
                                return !(value.number.match(settings.blacklistLine));
                            });
                        }

                        // blacklist by line
                        if (settings.whitelistLine) {
                            stops = stops.filter((value) => {
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
                }, function(reason) {
                    // rejection
                    reject(reason);
                });
            });
        }

        calculateDepatureTime(departure, currentdate) {
            var date = this.createDate(departure.year,departure.month,departure.day,departure.hour,departure.minute,0);
            return `${date.getHours()}:${padLeft(date.getMinutes(),2,0)}`;
        }

        calculateDepatureTimeRel(departure, currentdate) {
            var departureTimestamp = this.dateToTimestamp(this.createDate(departure.year,departure.month,departure.day,departure.hour,departure.minute,0));
            var currentTimestamp = Math.floor(Date.now() / 1000);

            var ret = Math.floor((departureTimestamp - currentTimestamp) / 60);

            return ret;
        }

        createDate(year, month, day, hour, minute, second) {
            return new Date(`${year}/${month}/${day} ${hour}:${minute}:${second}`);
        }

        dateToTimestamp(date) {
            return Math.floor(date.getTime() / 1000)''
        }

        transformLineNumberToType(lineNumber) {
            var ret = "";

            var match = lineNumber.match(/^([a-z]+)/i)

            // check if Bus
            if (!isNaN(Number(lineNumber))) {
                ret = "B";
            } else if (match) {
                ret = lineNumber[0];
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

        prepareStationData(station, data) {
            var ret = {
                station: {
                    name: false,
                    coordinates: false,
                },
                stops: []
            };

            if (data.length) {
                var firstStop = data.pop()
                ret.station.name = firstStop.stopName;
                ret.station.coordinates = firstStop.stationCoordinates;
            }

            return ret;
        }
    }

    class CachedVVS extends VVS {
        cacheTime = 59;

        cacheGetData(key) {
            var data = localStorage.getItem(key);

            if (data) {
                return JSON.parse(data);
            } else {
                throw new Exception('Could not get cache data');
            }
        }

        cacheSetData(key, value) {
            localStorage.setItem(key, JSON.stringify(value));
        }

        requestStationDepartures(station) {
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
                } catch (e) {
                    lastUptimeTime = false;
                    ret = false;
                }

                if (lastUptimeTime && ret && (currentTime - lastUptimeTime <= 60)) {
                    promise = new Promise((resolve, reject) => {
                        resolve(ret);
                    });
                } else {
                    promise = super.requestStationDepartures(station);
                    promise.then((data) => {
                        console.log(keyData, keyTimestamp);

                        try {
                            this.cacheSetData(keyData, data);
                            this.cacheSetData(keyTimestamp, currentTime);
                        } catch (e) {
                            // catch set error
                        }
                    });
                }
            } catch (e) {
                // fallback
                promise = super.requestStationDepartures(station);
            }

            return promise;
        }

        prepareStationData(station, data) {
            var ret = super.prepareStationData(station, data);

            var cacheKeyTitle = '' + station + '.title';
            var cacheKeyInfo = '' + station + '.info';

            if (ret.station.name) {
                try {
                    this.cacheSetData(cacheKeyInfo, ret.station);
                } catch (e) {
                    // catch fetch error
                }
            } else {
                try {
                    // deprecated
                    ret.station.name = this.cacheGetData(cacheKeyTitle);
                } catch (e) {
                    // catch fetch error
                }

                try {
                    var stationInfo = this.cacheGetData(cacheKeyInfo);
                    if (stationInfo) {
                        ret.station = stationInfo;
                    }
                } catch (e) {
                    // catch fetch error
                }
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
                updateTime:  30 * 1000,
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
                departureType: 'relative',
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

            $this.on('click', () => {
               $this.toggleClass('hover');
            });

            var addLoadingIndicator = () => {
                if (!$this.find('.spinner-content').length) {
                    $this.append('<div class="spinner-content">' + settings.loadingIndicator + '</div>');
                }
            };

            var humanRelativeTime = (line) => {
                var ret = '';
                var departure = line.departure;

                if (departure >= 60) {
                    var hours   = Math.floor(departure / 60);
                    var minutes = padLeft(Math.floor(departure % 60),2,"0");

                    ret += `<i class="time hours-minutes"><i class="hour">${hours}</i><i class="minute">${minutes}</i></i>`;
                } else {
                    ret += `<i class="time minutes">${departure}</i>`;
                }

                ret += `<i class="time absolute hover">${line.departureTime}</i>`;

                return ret;
            };

            var updateSchedule = () => {
                addLoadingIndicator();

                var schedule = vvs.stationSchedule(settings.station, settings);
                schedule.then(data => {
                    $this.html('');

                    var tableEl = false;

                    if(data && data.stops && data.stops.length) {
                        $.each(data.stops, (index, line) => {
                            if (index === 0) {
                                $this.append(`<h3>${data.station.name}</h3>`);
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


                            var departureType = 'rel';
                            var departureValue = humanRelativeTime(line);

                            switch(settings.departureType) {
                                case 'absolute':
                                    departureType = 'abs';
                                    departureValue = line.departureTime;
                                    break;

                                case 'intelligent':
                                    if (line.departure >= 60) {
                                        departureType = 'abs';
                                        departureValue = line.departureTime;
                                    }
                                    break;
                            }


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
                                            <div class="departure" data-departure-type="${departureType}">${departureValue}</div>
                                        </div>
                                    </div>
                                </td>
                            </tr>`;
                            tableEl.append(template);
                        });
                    } else {
                        if (data.station.name) {
                            $this.append(`<h3>${data.station.name}</h3>`);
                        }
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
