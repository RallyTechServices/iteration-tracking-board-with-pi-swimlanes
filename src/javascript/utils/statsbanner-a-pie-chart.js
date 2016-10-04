Ext.define("CArABU.technicalservices.PieChart", {
    alias: "widget.statsbannerpiechart",
    extend: "Ext.Container",

    currentScope: undefined,
    height: undefined,
    width: undefined,
    displayTitle: 'Pie',
    config: {
        context: null
    },

    initComponent: function() {
        this.callParent(arguments);

        if (this._storyStates === undefined) {
            Rally.data.ModelFactory.getModels({
                types: ['UserStory', 'Defect', 'DefectSuite', 'TestSet'],
                context: this.getContext(),
                scope: this,
                requester: this,
                success: this._createStateMap
            });
        } else {
            this._loadArtifacts();
        }
    },

    _createStateMap: function(models) {
        var stateMap = ['Defined', 'In-Progress', 'Completed'],
            stateMapIndex = 0,
            storyStates = {};

        _.each(models.UserStory.getField('ScheduleState').getAllowedStringValues(), function(state) {
            if (state === stateMap[stateMapIndex + 1]) {
                stateMapIndex++;
            }
            storyStates[state] = stateMap[stateMapIndex];
        });

        this._storyStates = storyStates;
        this._loadArtifacts();
    },

    _loadArtifacts: function() {
        this._chartData = [];
        this._childChartData = [];

        this.store = Ext.create('Rally.data.wsapi.artifact.Store', {
            models: ['User Story', 'Defect', 'Defect Suite', 'Test Set'],
            fetch: ['Defects', 'PlanEstimate', 'Requirement', 'FormattedID', 'Name', 'Blocked', 'BlockedReason', 'ScheduleState', 'State', 'Tasks', 'TestCases'],
            filters: [this.context.getTimeboxScope().getQueryFilter()],
            sorters: [
                {property: 'ScheduleState'}
            ],
            context: this.context.getDataContext(),
            limit: Infinity,
            requester: this,
            autoLoad: true,
            listeners: {
                load: this._loadChildCollections,
                scope: this
            }
        });
    },

    _loadChildCollections: function() {
        var records = this.store.getRange();
        var promises = [];
        _.each(records, function(record) {
            if (record.get('Defects') && record.get('Defects').Count) {
                promises.push(record.getCollection('Defects', {
                    fetch: ['FormattedID', 'Name', 'ScheduleState', 'Blocked', 'BlockedReason', 'Requirement', 'State']
                }).load({
                    requester: this,
                    callback: function(defects) {
                        record.get('Defects').Results = defects;
                    }
                }));
            }
            if (record.get('Tasks') && record.get('Tasks').Count) {
                promises.push(record.getCollection('Tasks', {
                    fetch: ['FormattedID', 'Name', 'Blocked', 'BlockedReason', 'WorkProduct', 'State']
                }).load(
                    {
                        requester: this,
                        callback: function(tasks) {
                            record.get('Tasks').Results = tasks;
                        }
                    }
                ));
            }
            if (record.get('TestCases') && record.get('TestCases').Count){
                promises.push(record.getCollection('TestCases', {
                    fetch: ['FormattedID', 'Name', 'Type', 'WorkProduct']
                }).load({
                        requester: this,
                        callback: function(testCases){
                            record.get('TestCases').Results = testCases;
                        }
                    }
                ));
            }
        });

        if (promises.length > 0) {
            Deft.Promise.all(promises).then({
                success: this._onAllDataLoaded,
                scope: this
            });
        } else {
            this._onAllDataLoaded();
        }
    },

    _onAllDataLoaded: function() {
        _.each(this.store.getRange(), function(record) {
            var defects = record.get('Defects');
            var defectCount = (defects && defects.Count) || 0;
            var tasks = record.get('Tasks');
            var taskCount = (tasks && tasks.Count) || 0;
            var testCases =  record.get('TestCases');
            var testCaseCount = (testCases && testCases.Count) || 0;
            var relatedCount = taskCount + defectCount + testCaseCount;
            var planEstimate = record.get('PlanEstimate') || 1;
            var pointSizeForChildren = (planEstimate / relatedCount) || 1;
            var nullPointString = 'No tasks or defects.';

            this._addPointForTopLevelItem(record, relatedCount);

            if (relatedCount === 0) {
                this._childChartData.push({
                    name: nullPointString,
                    y: planEstimate,
                    color: '#FFF',
                    rallyName: null,
                    status: '',
                    blocked: false,
                    blockedReason: '',
                    hasChildren: false,
                    relatedCount: 0,
                    ref: null,
                    parentFormattedID: null
                });
            } else {
                if (defects && defects.Results) {
                    _.each(defects.Results, function(defect) {
                        this._addPointForChildItem(defect, record.get('FormattedID'), pointSizeForChildren);
                    }, this);
                }

                if (tasks && tasks.Results) {
                    _.each(tasks.Results, function(task) {
                        this._addPointForChildItem(task, record.get('FormattedID'), pointSizeForChildren);
                    }, this);
                }

                if (testCases && testCases.Results) {
                    _.each(testCases.Results, function(testCase) {
                        this._addPointForChildItem(testCase, record.get('FormattedID'), pointSizeForChildren, record.get('ScheduleState'), record.get('Blocked'));
                    }, this);
                }
            }
        }, this);

        var chart = this._createChartConfig();
        this.add(chart);

        //this.recordLoadEnd();
    },

    _onLoad: function() {
        this.fireEvent('contentupdated', this);
        this.fireEvent('ready', this);
        if (Rally.BrowserTest) {
            Rally.BrowserTest.publishComponentReady(this);
        }
    },

    _createChartConfig: function(overrides) {
        var me = this;
        var clickChartHandler = _.isFunction(this.clickHandler) ? this.clickHandler : Ext.emptyFn;
        var height = this.height;
        var pieHeight = this.height * 0.9;

        return Ext.Object.merge({
            xtype: 'rallychart',
            loadMask: false,
            updateAfterRender: Ext.bind(this._onLoad, this),

            chartData: {
                series: [
                    {
                        type: 'pie',
                        name: 'Parents',
                        data: this._chartData,
                        size: pieHeight,
                        allowPointSelect: false,
                        dataLabels: {
                            enabled: false
                        }
                    },
                    {
                        type: 'pie',
                        name: 'Children',
                        data: this._childChartData,
                        size: pieHeight,
                        innerSize: 0.8 * pieHeight,
                        allowPointSelect: false,
                        dataLabels: { enabled: false }
                    }
                ]
            },

            chartConfig: {
                chart: {
                    type: 'pie',
                    height: height,
                    width: this.width,
                    spacingTop: 0,
                    spacingRight: 3,
                    spacingBottom: 0,
                    spacingLeft: 3,
                    events: {
                        click: clickChartHandler
                    }
                },
                subtitle: {
                    useHTML: true,
                    text: '<table align="center" class="pie-chart-legend"><tr><td><span class="legend-swatch defined-sample-swatch"></span><span>Defined</td>' +
                    '<td><span class="legend-swatch in-progress-sample-swatch"></span>In-Progress</td>' +
                    '<td><span class="legend-swatch completed-sample-swatch"></span>Completed</td>' +
                    '<td><span class="legend-swatch blocked-sample-swatch"></span>Blocked</td></tr></table>',
                    verticalAlign: 'bottom',
                    floating: true,
                    x: -10,
                    y: -20
                },
                tooltip: {
                    formatter: this._formatTooltip,
                    useHTML: true
                },
                spacingTop: 0,
                title: { text: null },
                plotOptions: {
                    pie: {
                        cursor: 'pointer',
                        shadow: false,
                        center: ['50%', '45%'],
                        point: {
                            events: {
                                click: function() {
                                    var ref = this.ref;
                                    if (ref) {
                                        me.up('rallydialog').destroy();
                                        Rally.nav.Manager.showDetail(ref);
                                    }
                                }
                            }
                        },
                        showInLegend: false
                    }
                }
            }
        }, overrides || {});
    },

    _addPointForTopLevelItem: function(record, relatedCount) {
        var blocked = record.get('Blocked');
        var color = this._colorFromStatus(this._storyStates[record.get('ScheduleState')], blocked);
        var pointSize = record.get('PlanEstimate') || 1;

        this._chartData.push({
            name: record.get('FormattedID'),
            y: pointSize,
            color: color,
            rallyName: record.get('Name'),
            status: record.get('ScheduleState'),
            blocked: blocked,
            blockedReason: blocked ? record.get('BlockedReason') : null,
            hasChildren: relatedCount > 0,
            relatedCount: relatedCount,
            ref: record.get('_ref'),
            parentFormattedID: null
        });
    },

    _colorFromStatus: function(state, blocked) { //refactor into css and classes, should get cleaner
        var progressColors = {
            'Defined': '#C0C0C0', // light gray
            'In-Progress': '#00A9E0', // cyan
            'Completed': '#8DC63F', // lime
            'Blocked': '#EE1C25' // red
        };
        var color =  progressColors[state];
        if (blocked) {
            color = progressColors.Blocked;
        }
        return color;
    },

    _addPointForChildItem: function(record, parentFormattedID, pointSize, parentState, isParentBlocked) {
        var blocked = record.get('Blocked');
        var state = record.get('ScheduleState') || record.get('State') || record.get('Type');
        var color = this._colorFromStatus(this._storyStates[parentState || state], blocked || isParentBlocked);

        this._childChartData.push({
            name: record.get('FormattedID'),
            y: pointSize,
            color: color,
            rallyName: record.get('Name'),
            status: state,
            blocked: blocked,
            blockedReason: blocked ? record.get('BlockedReason') : null,
            hasChildren: false,
            relatedCount: 0,
            ref: record.get('_ref'),
            parentFormattedID: parentFormattedID
        });
    },

    _formatTooltip: function() {
        var relatedMessage = '';
        var blockedMessage = '';
        var artifactName = this.point.rallyName ? '<b>' + this.point.name + '</b>: ' + this.point.rallyName + '<br/>' : this.point.name;

        if (this.point.blocked) {
            blockedMessage = '<br/><b>Blocked</b>';
            if (this.point.blockedReason) {
                blockedMessage += ': ' + this.point.blockedReason;
            }
        }

        if (this.point.series && this.point.series.name === 'Parents') {
            relatedMessage = (this.point.relatedCount) ? '<br/>Related Items: ' + this.point.relatedCount : '';
        }

        return '<div style="min-width:200px;white-space:normal">' + artifactName + this.point.status + relatedMessage + blockedMessage + '</div>';
    }
});