Ext.define('CArABU.technicalservices.StatsBanner', {
    extend: 'Ext.container.Container',
    alias:'widget.statsbanner',
    mixins: [
        'Rally.Messageable',
        'Rally.clientmetrics.ClientMetricsRecordable'
    ],
    cls: 'stats-banner',
    layout: 'hbox',
    border: 0,
    width: '100%',
    stateful: true,
    stateEvents: ['expand', 'collapse'],
    filters: [],
    firstPortfolioItemName: 'Feature',

    config: {
        context: null,
        expanded: true,

    },

    items: [
        {
            xtype: 'statsbannerplannedvelocity',
            title: 'Planned Velocity',
            unitLabel: "points",
            flex: 2,
            uniqueid: 'planned-velocity'
        },{
            xtype: 'statsbanneriterationend',
            title: 'Iteration End',
            unitLabel: "days left of",
            uniqueid: 'iteration-end',
            flex: 2
        },{
            xtype: 'statsbanneraccepted',
            title: 'Accepted',
            unitLabel: 'points',
            flex: 2
        },{
            xtype: 'statsbannerdefects',
            title: 'Defects',
            unitLabel: 'active',
            statIcon: 'icon-defect',
            flex: 2
        },{
            xtype: 'statsbannertasks',
            title: 'Tasks',
            statIcon: 'icon-task',
            unitLabel: 'active',
            flex: 2
        }
    ],

    constructor: function(config) {
        this.callParent(arguments);
    },

    initComponent: function() {
        this.addEvents(
            /**
             * @event
             * Fires when expand is clicked
             */
            'expand',
            /**
             * @event
             * Fires when collapse is clicked
             */
            'collapse'
        );

        this.subscribe(this, Rally.Message.objectDestroy, this._update, this);
        this.subscribe(this, Rally.Message.objectCreate, this._update, this);
        this.subscribe(this, Rally.Message.objectUpdate, this._update, this);
        this.subscribe(this, Rally.Message.bulkUpdate, this._update, this);

        this._createWorkItemStore(this.customFilters);
      //  this._createTestCaseStore();

        this.items = this._configureItems(this.items);

        this.on('expand', this._onExpand, this);
        this.on('collapse', this._onCollapse, this);

        this.callParent(arguments);
        this._update();

    },
    //_checkForLateStories: function(store){
    //    var lateStories = [],
    //        targetDate = Rally.util.DateTime.fromIsoString(this.timeboxRecord.get(this.timeboxEndDateField));
    //
    //    _.each(this.store.getRange(), function(record){
    //        var iteration = record.get('Iteration'),
    //            children = record.get('DirectChildrenCount') || 0;
    //        if (children === 0){
    //            if (iteration){
    //                if (Rally.util.DateTime.fromIsoString(iteration.EndDate) > targetDate){
    //                    lateStories.push(record);
    //                }
    //            } else {
    //                lateStories.push(record);
    //            }
    //        }
    //
    //    }, this);
    //    if (lateStories.length > 0){
    //        this.fireEvent('latestoriesfound', lateStories);
    //    }
    //},
    onRender: function() {
        if (this.expanded) {
            this.removeCls('collapsed');
        } else {
            this.addCls('collapsed');
        }
        this._setExpandedOnChildItems();
        this.callParent(arguments);
    },

    applyState: function (state) {
        if (Ext.isDefined(state.expanded)) {
            this.setExpanded(state.expanded);
        }
        this._setExpandedOnChildItems();
    },

    getState: function(){
        return {
            expanded: this.expanded
        };
    },

    _setExpandedOnChildItems: function() {
        _.each(this.items.getRange(), function(item) {
            item.setExpanded(this.expanded);
        }, this);
    },

    _getItemDefaults: function() {
        return {
            flex: 1,
            context: this.context,
            store: this.store,
            listeners: {
                ready: this._onReady,
                scope: this
            }
        };
    },

    _onReady: function() {
        this._readyCount = (this._readyCount || 0) + 1;
        if(this._readyCount === this.items.getCount()) {
            this.recordComponentReady();
            delete this._readyCount;
        }
    },

    _onCollapse: function() {
        this.addCls('collapsed');
        this.setExpanded(false);

        _.invoke(this.items.getRange(), 'collapse');
    },

    _onExpand: function() {
        this.removeCls('collapsed');
        this.setExpanded(true);

        _.invoke(this.items.getRange(), 'expand');
    },

    _hasTimebox: function() {
        return true;
    },

    _configureItems: function(items) {
        var idx = 0;
        var defaults = {
            flex: 1,
            context: this.context,
            store: this.store,
            uniqueid: this.uniqueid || 'id-' + idx++,
            timeboxRecord: this.timeboxRecord,
            listeners: {
                ready: this._onReady,
                scope: this
            }
        };

        return _.map(items, function(item) {
            return _.defaults(_.cloneDeep(item), defaults);
        });
    },

    _update: function () {
        if(this._hasTimebox()) {
            this.store.load();
        }
    },
    _getWorkItemFilters: function(customFilters){
        var filters = [{
            property: 'Iteration.Name',
            value: this.timeboxRecord.get('Name')
        },{
            property: 'Iteration.StartDate',
            value: this.timeboxRecord.get('StartDate')
        },{
            property: 'Iteration.EndDate',
            value: this.timeboxRecord.get('EndDate')
        }];
        var workItemFilters = Rally.data.wsapi.Filter.and(filters),
            defectFilters = Rally.data.wsapi.Filter.and([{
                property: 'Requirement.Iteration.Name',
                value: this.timeboxRecord.get('Name')
            },{
                property: 'Requirement.Iteration.StartDate',
                value: this.timeboxRecord.get('StartDate')
            },{
                property: 'Requirement.Iteration.EndDate',
                value: this.timeboxRecord.get('EndDate')
            }]);

        filters = workItemFilters.or(defectFilters);

        if (customFilters && customFilters.filters && customFilters.filters.length > 0  && customFilters.types &&
            (Ext.Array.contains(customFilters.types, 'hierarchicalrequirement') || Ext.Array.contains(customFilters.types, 'defect'))
        ){
            var customFilter = Rally.data.wsapi.Filter.fromQueryString(customFilters.filters.toString());
            filters = filters.and(customFilter);
        }

        console.log('filters', filters.toString());
        return filters;
    },
    //_createTestCaseResultStore: function(){
    //
    //    var filters =  Rally.data.wsapi.Filter.or([{
    //        property: 'TestCase.Milestones.ObjectID',
    //        //     operator: 'contains',
    //        value:  this.timeboxRecord.get('ObjectID')
    //    },{
    //        property: 'TestCase.WorkProduct.Milestones.ObjectID',
    //        //     operator: 'contains',
    //        value:  this.timeboxRecord.get('ObjectID')
    //    }]);
    //
    //    this.testCaseResultStore = Ext.create('Rally.data.wsapi.Store',{
    //        model: 'TestCaseResult',
    //        filters: filters,
    //        fetch: ['ObjectID', 'TestCase','WorkProduct','FormattedID','Attachments'],
    //        context: this.context.getDataContext(),
    //        pageSize: 1000,
    //        limit: 'Infinity'
    //    });
    //},

    _createWorkItemStore: function(customFilters){
        var filters = this._getWorkItemFilters(customFilters);

        this.store = Ext.create('Rally.data.wsapi.artifact.Store', {
            models: ['HierarchicalRequirement','Defect','Task'],
            fetch: ['ObjectID', 'FormattedID', 'ScheduleState','AcceptedDate','ClosedDate', 'PlanEstimate','Iteration','Name','StartDate','EndDate','State'],
            filters: filters,
            pageSize: 1000,
            context: this.context.getDataContext(),
            limit: 'Infinity'
        });
    }
});