Ext.define('CArABU.technicalservices.IterationEnd', {
    extend: 'CArABU.technicalservices.ConfigurableGauge',
    alias:'widget.statsbanneriterationend',

    config: {
        data: {
            percentage: 0,
            calculatedUnits: 0,
            totalUnits: 0,
            title: "Iteration End",
            byCount: false
        }
    },
    _getRenderData: function() {

        var today = new Date(),
            startDate = this.timeboxRecord.get('StartDate'),
            endDate = this.timeboxRecord.get('EndDate'),
            totalDays = this.daysBetween(startDate, endDate, true),
            daysLeft = this.daysBetween(today, endDate, true);

        if (today > endDate){
            daysLeft = 0;
        }

        var pct = totalDays > 0 ? (totalDays - daysLeft)/totalDays * 100 : 0;

        var data = {
            displayPercentage: daysLeft,
            percentage: pct,
            percentUnit: '',
            calculatedUnits: 'days left',
            totalUnits: totalDays,
            unit: this.unit || '',
            title: this.title,
            tooltip: this.tooltip || ''
        };
        return data;

    },
    daysBetween: function(startDate,endDate,skip_weekends){

        var date1 = Ext.clone(startDate),
            date2 = Ext.clone(endDate);

        if ( typeof(date1) == "string" ) {
            date1 = Rally.util.DateTime.fromIsoString(date1);
        }
        if ( typeof(date2) == "string" ) {
            date2 = Rally.util.DateTime.fromIsoString(date2);
        }

        if ( date1 == date2 ) { return 0; }
        if (typeof date1 === "number") { date1 = new Date(startDate); }
        if (typeof date2 === "number") { date2 = new Date(date2); }

        if ( !skip_weekends ) {
            return Math.abs( Rally.util.DateTime.getDifference(date1,date2,'day') );
        } else {

            if (date2 < date1){
                var x = date2;
                date2 = date1;
                date1 = x;
            }

            // shift to the following Monday
            if (!this.isWeekday(date1)) {
                date1 = this.shiftDateToNextWeekday(date1);
            }
            if (!this.isWeekday(date2)) {
                date2 = this.shiftDateToLastWeekday(date2);
            }

            // calculate differnece in weeks (1000mS * 60sec * 60min * 24hrs * 7 days = 604800000)
            var iDays = Math.round((date2.getTime() - date1.getTime())/ 86400000),
                iWeeks = Math.floor(iDays/7),
                iLeftoverDays = iDays % 7;

            return iWeeks  * 5 + iLeftoverDays;
        }
    },

    isWeekday: function(check_date) {
        var weekday = true;
        var day = check_date.getDay();

        if ( day === 0 || day === 6 ) {
            weekday = false;
        }
        return weekday;
    },
    shiftDateToNextWeekday: function(check_date) {
        var day = check_date.getDay();

        var delta = 0;

        if ( day === 0 ) {
            // it's Sunday
            delta = 1;
        }
        if ( day === 6 ) {
            delta = 2;
        }

        var shifted_date = check_date;
        if ( delta > 0 ) {
            shifted_date = new Date(check_date.setHours(0));
            shifted_date = Rally.util.DateTime.add(shifted_date,"day",delta);
        }
        return shifted_date;
    },
    shiftDateToLastWeekday: function(check_date) {
        var day = check_date.getDay();

        var delta = 0;

        if ( day === 0 ) {
            // it's Sunday
            delta = -2;
        }
        if ( day === 6 ) {
            delta = -1;
        }

        var shifted_date = check_date;
        if ( delta != 0 ) {
            //shifted_date = new Date(check_date.setHours(0));
            shifted_date = Rally.util.DateTime.add(check_date,"day",delta);
        }
        return shifted_date;
    }

});
