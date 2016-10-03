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


    config: {
        context: null,
        expanded: true
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
        }, {
            xtype: 'statsbannertasks',
            title: 'Tasks',
            statIcon: 'icon-task',
            unitLabel: 'active',
            flex: 2
        },{
            xtype: 'statsbanneriterationprogress',
            flex: 4
        },{
            xtype: 'statsbannercollapseexpand',
            flex: 0
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

        this.items = this._configureItems(this.items);

        this.on('expand', this._onExpand, this);
        this.on('collapse', this._onCollapse, this);

        this.callParent(arguments);
        this._update();

    },
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
        filters = Rally.data.wsapi.Filter.and(filters);

        if (customFilters && customFilters.filters && customFilters.filters.length > 0  && customFilters.types &&
            (Ext.Array.contains(customFilters.types, 'hierarchicalrequirement') || Ext.Array.contains(customFilters.types, 'defect'))
        ){
            var customFilter = Rally.data.wsapi.Filter.fromQueryString(customFilters.filters.toString());
            filters = filters.and(customFilter);
        }
        return filters;
    },

    _createWorkItemStore: function(customFilters){
        var filters = this._getWorkItemFilters(customFilters);

        this.store = Ext.create('Rally.data.wsapi.artifact.Store', {
            models: ['HierarchicalRequirement','Defect','TestSet','DefectSuite'],
            fetch: ['ObjectID',
                'FormattedID',
                'ScheduleState',
                'AcceptedDate',
                'ClosedDate',
                'PlanEstimate',
                'Iteration',
                'Name',
                'StartDate',
                'EndDate',
                'State',
                'Defects:summary[State]',
                'Tasks:summary[State;Blocked]',
                'TestCases:summary'],
            filters: filters,
            pageSize: 1000,
            sorters: [{
                property: 'ScheduleState',
                direction:'ASC'
            }],
            context: this.context.getDataContext(),
            limit: 'Infinity'
        });
    }
});