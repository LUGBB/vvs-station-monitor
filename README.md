# VVS station monitor

![VVS station monitor](documentation/preview.png "VVS station montitor")

## What's VVS?

VVS (VVS Verkehrs- und Tarifverbund Stuttgart) is the public transport group in stuttgart.

## What does the station monitor do?

The station monitor will show next departures from one or more stations
and will display also the delay.
The station monitor will refresh periodically and can be used for
infomation monitors.

### Examples

- [Stuttgart City](https://stationmonitor.lugbb.org/)
- [jweiland.net](https://stationmonitor.lugbb.org/jweiland.html)
- [Shackspace](https://stationmonitor.lugbb.org/shackspace.html)

## Features

- Auto update
- Blacklist/Whitelist for line and direction (regular expressions)
- Based on bootstrap (easier customization, responsive layout)
- Customizable font size (set it via css on the html element, see examples)
- Show time in relative (xxx min) or absolute (14:21) or both (switching based on time setting)
- Show relative and absolute times on mouseover
- Local caching (using localStorage, some rotation browser-plugin also reloads the page so this will prevent unnecessary ajax requests)
- Avoid duplicate ajax requests
- Clock (optional)
- Easy station configuration (by using `data-` attributes)
- Template based (mustache)
- Written in TypeScript
- [OpenSource license (MIT)](LICENSE)

For anyone wo don't want to use bootstrap:
It isn't required. Just remove the bootstrap CSS and add or write your own CSS.
Bootstrap was a solution to get a nice and responsive result with less work.

## Configuration

Most configuration can be set in the HTML eg. custom filtering and 
other stuff. The configuration will be automatically taken 
from `data-xxx` attributes and will overwrite the configuration.

You can use Bootstrap classes and add more station lists, filter 
directions and lines (eg. no busses).

### Get station id

You can get the station id from https://efa-api.asw.io/api/v1/station/ 
or from the formular at vvs.de:

![VVS station id](documentation/get-station-id.png "VVS station id")

## Configuration

All jQuery plugin configuration options for `vvsStation` can be easily configured as HTML attributes for each instance:

```
<div class="vvs-station" data-station="5006118" data-blacklist-line="^[0-9]+$" data-min-departure="15" data-max-departure="200"></div>

```

See [jquery.vvsstation.settings.ts](web/src/typescript/jquery.vvsstation.settings.ts) and [class.vvs.settings.ts](web/src/typescript/class.vvs.settings.ts)
for all available settings and their defaults.

Configuration            | HTML attribute                  | Description
-------------------------|---------------------------------|--------------------------------------------------------------------------------------
station                  | data-station                    | VVS Station ID
departureType            | data-departure-type             | Specifies how the departure should be displayed (relative, absolute, intelligent)
minDeparture             | data-min-departure              | Minimum depature time
maxDeparture             | data-max-departure              | Maximum depature time
intelligentTimeThreshold | data-intelligent-time-threshold | Threshold for display relative/absolute time
blacklistDirection       | data-blacklist-direction        | Blacklist (regexp) for destionation (eg. Herrenberg, Schorndorf..)
whitelistDirection       | data-whitelist-direction        | Whitelist (regexp) for destionation (eg. Herrenberg, Schorndorf..)
blacklistLine            | data-blacklist-line             | Blacklist (regexp) for Line (eg. S1, 82, R123)
whitelistLine            | data-whitelist-line             | Whitelist (regexp) for Line (eg. S1, 82, R123)
maxEntries               | data-max-entries                | Max numbers of departures which will be shown
timeToggle               | data-time-toggle                | Seconds between time toggle
templateMain             | data-template-main              | Main wrapper template
templateTitle            | data-template-title             | Template for only the station title
templateTimetable        | data-template-timetable         | Template for the whole time table (with mustache loop)
templateNoData           | data-template-no-data           | Template if there are no departures
delayClasses             | *not available*                 | Definition of coloring (by using css classes) of the departure lines based on delay time
translations             | *not available*                 | Object with all translations


## Clock

There is also support for a clock in the right bottom edge, eg:

```
<div id="clock" class="alert alert-info"></div>
<script>
    jQuery( document ).ready(function($) {
        $("#clock").clock();
    });
</script>

```

For positioning just add `bottom`, `top`, `left` and `right` to the div clock element.


## Customization

1. You need to install the npm modules:
```
npm install
```

2. Run the gulp watch
```
gulp watch
```

3. Customize your stuff and run the application

## Special thanks

Special thanks to the guys from [OK Lab Stuttgart](http://codefor.de/stuttgart/) for the [VVS Api](http://codefor.de/projekte/2015-06-09-stgt-efa-meta-api) ([GitHub project](https://github.com/opendata-stuttgart/metaEFA))
