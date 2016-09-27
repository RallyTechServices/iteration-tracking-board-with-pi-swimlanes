Ext.define('CArABU.technicalservices.PlannedVelocity', {
    extend: 'CArABU.technicalservices.ConfigurableGauge',
    alias:'widget.statsbannerplannedvelocity',

    config: {
        data: {
            percentage: 0,
            calculatedUnits: 0,
            totalUnits: 0,
            title: "Planned Velocity",
            byCount: false
        }
    },
    _getRenderData: function() {

        var total = 0,
            plannedVelocity = this.timeboxRecord.get('PlannedVelocity') || 0,
            name = this.timeboxRecord.get('Name');

        Ext.Array.each(this.store.getRange(), function(r) {
            var iteration = r.get('Iteration');
            //Todo, we are not including dates in the check becausehis is mainly checking to eliminate second class defects.
            if (r.get('PlanEstimate') && iteration && iteration.Name === name){
                total += r.get('PlanEstimate') || 0;
            }
        });

        var pct = plannedVelocity === 0 ? 0 : Math.round(total / plannedVelocity * 100);

        var data = {
            percentage: pct,
            percentUnit: '%',
            calculatedUnits: total,
            totalUnits: plannedVelocity,
            unit: this.unitLabel,
            title: this.title,
            tooltip: this.tooltip || ''
        };
        return data;

    }
});
