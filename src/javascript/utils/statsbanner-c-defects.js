Ext.define('CArABU.technicalservices.Defects', {
    extend: 'CArABU.technicalservices.IconWidget',
    alias:'widget.statsbannerdefects',

    getRenderData: function() {

        var activeDefects = 0;

        Ext.Array.each(this.store.getRange(), function(r) {
             var defectState = r.get('State') || null;
             if (defectState === "Closed"){
                activeDefects++;
             }
             var summary = r.get('Summary');
             if (summary && summary.Defects && summary.Defects.State){
                 var defectCount = summary.Defects.Count || 0,
                     closedDefectCount = summary.Defects.State.Closed || 0;

                 activeDefects += (defectCount - closedDefectCount);
             }
        });

        return {
            statIcon: this.statIcon,
            unitLabel: this.unitLabel,
            title: this.title,
            statUnits: activeDefects
        };
    }
});
