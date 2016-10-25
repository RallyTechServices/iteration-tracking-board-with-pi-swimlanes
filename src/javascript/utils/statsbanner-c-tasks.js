Ext.define('CArABU.technicalservices.Tasks', {
    extend: 'CArABU.technicalservices.IconWidget',
    alias:'widget.statsbannertasks',

    getRenderData: function() {

        var activeTasks = 0;
        Ext.Array.each(this.store.getRange(), function(r) {
            var summary = r.get('Summary');
            if (summary.Tasks && summary.Tasks.State){
                activeTasks += (summary.Tasks.State.Defined || 0 + summary.Tasks.State['In-Progress'] || 0);
            }
        });

        return {
            statIcon: this.statIcon,
            unitLabel: this.unitLabel,
            title: this.title,
            statUnits: activeTasks
        };
    }
});
