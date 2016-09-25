# VVS station monitor

![VVS station monitor](documentation/preview.png "VVS station montitor")

## What's VVS?

VVS (VVS Verkehrs- und Tarifverbund Stuttgart) is the public transport group in stuttgart.

## What does the station monitor do?

The station monitor will show next departures from one or more stations
and will display also the delay.
The station monitor will refresh periodically and can be used for
infomation monitors.

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

## Why `vvs.php`?

Because efa-api.asw.io doesn't allows CORS requests we need a local proxy
which proxies the requests to efa-api.asw.io and pass them to the local
web page.
It's not possible to access https://efa-api.asw.io/ directly via 
JavaScript (AJAX) so we currently need a local proxy.
