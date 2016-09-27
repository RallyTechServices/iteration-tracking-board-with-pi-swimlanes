Ext.define('CArABU.technicalservices.Defects', {
    extend: 'CArABU.technicalservices.IconWidget',
    alias:'widget.statsbannerdefects',

    getRenderData: function() {

        var activeDefects = 0;

        Ext.Array.each(this.store.getRange(), function(r) {
             var type = r.get('_type');
             if (type.toLowerCase() === 'defect' && !r.get('ClosedDate')){
                activeDefects++;
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
