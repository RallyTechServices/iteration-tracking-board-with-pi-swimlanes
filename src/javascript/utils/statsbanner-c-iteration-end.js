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
            totalDays = this.getWeekdaysBetween(endDate, startDate),
            daysLeft = this.getWeekdaysBetween(endDate, today);

        var data = {
            percentage: daysLeft,
            percentUnit: '',
            chartPercentage: totalDays > 0 ? daysLeft/totalDays * 100 : 0,
            calculatedUnits: 'days left',
            totalUnits: totalDays,
            unit: this.unit || '',
            title: this.title,
            tooltip: this.tooltip || ''
        };
        return data;

    },
    getWeekdaysBetween: function(endDate, startDate){
        return Rally.util.DateTime.getDifference(endDate, startDate, 'day');
    }
});
