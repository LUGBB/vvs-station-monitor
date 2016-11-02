/// <reference path="class.utility.ts" />

$.fn.clock = function(options: any) {
    this.each(function(index: number, el: any): void {
        var $this = $(el);

        // default settings
        var settings = $.extend(true, {
            template: '{{hours}}:{{minutes}}:{{seconds}}'
        }, $this.data(), options);

        $this.on('click', () => {
            $this.hide();
        });

        var callback = () => {
            var date = new Date();

            var view = {
                hours  : () => { return Utility.strPadLeft(date.getHours(),2,'0') },
                minutes: () => { return Utility.strPadLeft(date.getMinutes(),2,'0') },
                seconds: () => { return Utility.strPadLeft(date.getSeconds(),2,'0') },
                day: () => { return Utility.strPadLeft(date.getDay(),2,'0') },
                month: () => { return Utility.strPadLeft(date.getMonth(),2,'0') },
                year: () => { return date.getFullYear() }
            };

            $this.html(Mustache.render(settings.template, view));
        };

        setInterval(callback, 900);
        callback();
    });
};
