/// <reference path="class.utility.ts" />
/// <reference path="class.vvs-cached.ts" />
/// <reference path="jquery.vvsstation.settings.ts" />

$.fn.vvsStation = function(options: any) {
    this.each(function(index: number, el: any) : void {
        var $this = $(el);
        var vvs: VVS;

        // default settings
        var settings = $.extend(true, new VVSStationDefaultSettings(), $this.data(), options);

        if (!settings.station) {
            Utility.logError('VVS station not set');
            $this.text('VVS Station not set!');
            return;
        }

        if (settings.blacklistDirection) settings.blacklistDirection = new RegExp(settings.blacklistDirection);
        if (settings.whitelistDirection) settings.whitelistDirection = new RegExp(settings.whitelistDirection);
        if (settings.blacklistLine)      settings.blacklistLine = new RegExp(settings.blacklistLine);
        if (settings.whitelistLine)      settings.whitelistLine = new RegExp(settings.whitelistLine);

        try {
            if (settings.localCache && localStorage) {
                vvs = new VVSCached(settings.station, settings);
                Utility.logMessage(`Init VVS Station Monitor for station ${settings.station} (localCache: yes)`, '#008000');
            } else {
                vvs = new VVS(settings.station, settings);
                Utility.logMessage(`Init VVS Station Monitor for station ${settings.station} (localCache: no)`, '#008000');
            }
        } catch (e) {
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
            }, settings.timeToggle * 1000 );
        }

        var addLoadingIndicator = () : void => {
            if (!$this.find('.spinner-content').length) {
                $this.append('<div class="spinner-content">' + settings.loadingIndicator + '</div>');
            }
        };

        var humanRelativeTime = (line: any): string => {
            var ret = '';
            var departure = line.departure;

            if (departure >= 60) {
                var hours   = Math.floor(departure / 60);
                var minutes = String(Math.floor(departure % 60));

                ret = `<i class="hours">${hours}</i><i class="minutes">${minutes}</i>`;
            } else {
                ret = `<i class="minutes">${departure}</i>`;
            }

            return ret;
        };

        var processStationDataRow = (line: any) => {
            return {
                line: line,
                delay: {
                    type: line.delayType,
                    value: line.delayAbs
                },
                departure: {
                    relative: () => {
                        if (line.delay === 9999 || line.delay === -9999) {
                            return `<span class="marquee"><span>${settings.translations.departureCanceld} &mdash; ${line.departureTime} &mdash; ${settings.translations.departureCanceld}</span></span>`;
                        }

                        if (settings.departureType === 'intelligent' && line.departure >= settings.intelligentTimeThreshold) {
                            return line.departureTime;
                        } else {
                            return humanRelativeTime(line);
                        }
                    },
                    absolute: () => {
                        if (line.delay === 9999 || line.delay === -9999) {
                            return `<span class="marquee"><span>${settings.translations.departureCanceld} - ${line.departureTime} - ${settings.translations.departureCanceld}</span></span>`;
                        }

                        return line.departureTime;
                    }
                }

            };
        };


        var updateSchedule = (): void => {
            addLoadingIndicator();

            var schedule = vvs.stationSchedule();
            schedule.then((data: any) => {
                var stationName = () => {
                    if (data && data.station && data.station.name) {
                        return data.station.name;
                    } else {
                        return `Haltestelle ${settings.station}`;
                    }
                };

                // Init main view
                var viewMain: any = {
                    settings: settings,
                    stationName: stationName,
                    title: () => {
                        var viewTitle = {
                            stationName: stationName,
                        };

                        return Mustache.render(settings.templateTitle, viewTitle);
                    },
                    departureTitle: () => {
                        if(data && data.stops && data.stops.length) {
                            return `${settings.translations.from} ${settings.minDeparture} ${settings.translations.minute}`;
                        }
                    },
                    content: () => {
                        var template: string;
                        var viewContent = {
                            settings: settings,
                            station: stationName,
                            timetable: ([] as Array<any>)
                        };

                        if(data && data.stops && data.stops.length) {
                            template = settings.templateTimetable;

                            $.each(data.stops, (index: number, line: any) => {
                                viewContent.timetable.push(
                                    processStationDataRow(line)
                                );
                            });
                        } else {
                            template = settings.templateNoData;
                        }

                        return Mustache.render(template, viewContent);
                    },
                };

                // render view and push html to element
                $this.html(Mustache.render(settings.templateMain, viewMain));
            });

            schedule.catch((message: string) => {
                $this.html(`<div class="alert alert-danger" role="alert">${message}</div>`);
            });
        };

        addLoadingIndicator();
        setInterval(updateSchedule, settings.updateTime);
        setTimeout(updateSchedule, 100);
    });
    return this;
};
