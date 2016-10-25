Ext.define('CArABU.technicalservices.Accepted', {
    extend: 'CArABU.technicalservices.ConfigurableGauge',
    alias:'widget.statsbanneraccepted',

    config: {
        data: {
            percentage: 0,
            calculatedUnits: 0,
            totalUnits: 0,
            title: "Accepted",
            byCount: false
        }
    },
    _getRenderData: function() {

        var total = 0,
            acceptedTotal = 0;

        Ext.Array.each(this.store.getRange(), function(r) {
            var iteration = r.get('Iteration'),
                planEst = r.get('PlanEstimate') || 0;
            //Todo, we are not including dates in the check becausehis is mainly checking to eliminate second class defects.

            if (planEst && iteration && iteration.Name === name){
                total += planEst;
                if (r.get('AcceptedDate')){
                    acceptedTotal += planEst;
                }
            }
        });

        var pct = total === 0 ? 0 : Math.round(acceptedTotal / total * 100);

        var data = {
            percentage: pct,
            percentUnit: '%',
            calculatedUnits: acceptedTotal,
            totalUnits: total,
            unit: this.unitLabel,
            title: this.title,
            tooltip: this.tooltip || ''
        };
        return data;

    }
});
