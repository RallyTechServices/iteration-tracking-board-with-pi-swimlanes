Ext.define('CArABU.technicalservices.Tasks', {
    extend: 'CArABU.technicalservices.IconWidget',
    alias:'widget.statsbannertasks',

    getRenderData: function() {
        console.log('this',this.statIcon, this.unitLabel, this.title, this.statUnits);
        var activeTasks = 0;
        Ext.Array.each(this.store.getRange(), function(r) {
            var type = r.get('_type');
            if (type.toLowerCase() === 'task' && r.get('State') !== 'Completed'){
                activeTasks++;
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
