
class Utility {

    /**
     * String pad left
     *
     * @param nr
     * @param n
     * @param str
     * @returns {string}
     */
    static strPadLeft(nr: string|number, n: number, str: string) : string {
        return Array(n-String(nr).length+1).join(str||'0')+nr;
    }

    /**
     * Convert date object to unix timestamp
     *
     * @param date
     * @returns {number}
     */
    static dateToTimestamp(date: Date) : number {
        return Math.floor(date.getTime() / 1000);
    }

    /**
     * Create date by arguments
     *
     * @param year
     * @param month
     * @param day
     * @param hour
     * @param minute
     * @param second
     * @returns {Date}
     */
    static createDate(year: string|number, month: string|number, day: string|number, hour: string|number, minute: string|number, second: string|number) : Date {
        return new Date(`${year}/${month}/${day} ${hour}:${minute}:${second}`);
    }

    /**
     * Check if touch device
     *
     * @returns {boolean|number}
     */
    static isTouchDevice(): boolean {
        return !!(
               'ontouchstart' in window  // works on most browsers
            || navigator.maxTouchPoints  // works on IE10/11 and Surface
        )
    }

    /**
     * Log message
     *
     * @param message
     */
    static logMessage(message: string, color: string = '#000000'): void {
        if(console && console.log) {
            console.log(`%c ${message}`, `color: ${color}`);
        }
    }

    /**
     * Log error
     *
     * @param message
     */
    static logError(message: string): void {
        if(console && console.error) {
            console.error(`[ERROR] ${message}`);
        }
    }

    /**
     * Log exception
     *
     * @param message
     */
    static logException(message: any): void {
        if(console && console.warn) {
            if (message instanceof Error) {
                console.warn(`[EXCEPTION:${message.name}] ${message.message}`);
            } else {
                console.warn(`[EXCEPTION] ${message}`);
            }
        }
    }

}
