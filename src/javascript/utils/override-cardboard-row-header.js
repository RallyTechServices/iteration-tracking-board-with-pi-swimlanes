Ext.override(Rally.ui.cardboard.row.Header, {

    _getTitle: function() {
        var value = this.getValue();

        if(Ext.isObject(value)) {
            var objectValue = value._refObjectName;
            if (value.FormattedID) {
                var tpl = Ext.create('Rally.ui.renderer.template.FormattedIDTemplate', {
                    showIcon: true,
                    showHover: false
                });
                value = tpl.apply(value) + ': ' + objectValue;
            } else {
                value = objectValue;
            }
        }

        var fieldDef = this.getFieldDef();

        if(_.isUndefined(value) || _.isNull(value) || value === '') {
            value = '-- None --';
        } else if (fieldDef.getType && fieldDef.getType() === 'boolean'){
            var booleanValue = value === true ? 'Yes' : 'No';
            value = fieldDef.displayName + ': ' + booleanValue;
        } else if (fieldDef.name === 'PlanEstimate') {
            value += ' ' + this.getContext().getWorkspace().WorkspaceConfiguration.IterationEstimateUnitName;
        } else if (fieldDef.name === 'Estimate') {
            value += ' ' + this.getContext().getWorkspace().WorkspaceConfiguration.TaskUnitName;
        }
        return value;
    }
});
