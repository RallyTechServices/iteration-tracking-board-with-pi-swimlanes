Ext.define("iteration-tracking-board-with-pi-swimlanes", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),

    integrationHeaders : {
        name : "iteration-tracking-board-with-pi-swimlanes"
    },

    items: [{
        xtype: 'container',
       itemId: 'banner_box'
    },{
        xtype: 'container',
        itemId: 'grid_box'

    }],

    config: {
        defaultSettings: {
            showAgeForCard: true,
            showAgeAfterDays: 3,
            swimlane: 'Feature',
            showBanner: true,
            showSwimlanes: true
        }
    },
    settingsScope: 'project',
    validPortfolioItems: null,
                        
    launch: function() {
        if (!this.isTimeboxScoped()){
            this.showNoScopeMessage();
            return;
        }

        this.fetchPortfolioItemTypes().then({
            success: function(types){
                this.validPortfolioItems = types;
                this.logger.log('validPortfolioItems', this.validPortfolioItems);
                this.onTimeboxScopeChange();
                //this.initializeData().then({
                //    success: this.onTimeboxScopeChange,
                //    failure: this.showErrorNotification,
                //    scope: this
                //});
            },
            failure: this.showErrorNotification,
            scope: this
        });

    },
    fetchPortfolioItemTypes: function(){
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.wsapi.Store', {
            model: 'TypeDefinition',
            fetch: ['TypePath', 'Ordinal','Name'],
            filters: [
                {
                    property: 'Parent.Name',
                    operator: '=',
                    value: 'Portfolio Item'
                },
                {
                    property: 'Creatable',
                    operator: '=',
                    value: 'true'
                }
            ],
            sorters: [{
                property: 'Ordinal',
                direction: 'ASC'
            }]
        }).load({
            callback: function(records, operation, success){
                if (success){
                    var types = Ext.Array.map(records, function(r){ return {TypePath: r.get('TypePath'), DisplayName: r.get('Name')}; });
                    deferred.resolve(types);
                } else {
                    var error_msg = '';
                    if (operation && operation.error && operation.error.errors){
                        error_msg = operation.error.errors.join(',');
                    }
                    deferred.reject('Error loading Portfolio Item Types:  ' + error_msg);
                }
            }
        });

        return deferred;
    },

    showErrorNotification: function(msg){
        Rally.ui.notify.Notifier.showError({message: msg});
    },
    isTimeboxScoped: function(){
        return this.getContext().getTimeboxScope() && this.getContext().getTimeboxScope().getType() === 'iteration' || false;
    },
    onTimeboxScopeChange: function(timeboxScope) {
        if (!timeboxScope){
            timeboxScope = this.getContext().getTimeboxScope();
        }
        if(timeboxScope && timeboxScope.getType() === 'iteration') {
            this.getContext().setTimeboxScope(timeboxScope);
            this.updateView(timeboxScope);
        }
    },
    getPortfolioSwimlaneIndex: function(){
        var portfolioItems = this.getValidPortfolioItemFields(),
            swimlane = this.getSwimlane();

        return _.indexOf(portfolioItems, swimlane);
    },
    initializeData: function(timeboxScope){
        var deferred = Ext.create('Deft.Deferred'),
            portfolioItems = this.getValidPortfolioItemFields(),
            swimlane = this.getSwimlane(),
            idx = this.getPortfolioSwimlaneIndex();

        this.logger.log('initializeData', portfolioItems, swimlane,idx );

        if (swimlane && idx > 0){

            var featureName = portfolioItems[0],
                filters = timeboxScope && timeboxScope.getQueryFilter();

            filters = filters.and({
                property: featureName + '.ObjectID',
                operator: '>',
                value: 0
            });

            Ext.create('Rally.data.wsapi.Store',{
                model: 'HierarchicalRequirement',
                fetch: [featureName,'ObjectID'],
                filters: filters,
                limit: Infinity
            }).load({
                callback: function(records, operation, success){
                    if (operation.wasSuccessful()){
                        var features = Ext.Array.map(records, function(r){
                            return r.get(featureName) && r.get(featureName).ObjectID;
                        });
                        features = Ext.Array.unique(features);

                        var a = [];
                        for (var i=0; i<idx; i++){
                            a.push('Children');
                        }
                        a.push('ObjectID');
                        var filterProperty = a.join('.')

                        var filters = Ext.Array.map(features, function(f){
                            return {
                                property: filterProperty,
                                value: f
                            };
                        });
                        if (filters.length > 1){
                            filters = Rally.data.wsapi.Filter.or(filters);
                        }

                        Ext.create('Rally.data.wsapi.Store',{
                            model: 'PortfolioItem/' + portfolioItems[idx],
                            fetch: ['ObjectID','Name','FormattedID','Parent'],
                            filters: filters,
                            compress: false,
                            context: {project: null}
                        }).load({
                            callback: function(records, operation){
                                if (operation.wasSuccessful()){

                                    var portfolioItemHash = {};
                                    Ext.Array.each(records, function(r){
                                        portfolioItemHash[r.get('ObjectID')] = r.getData();
                                    });
                                    this.portfolioItemHash = portfolioItemHash;
                                    deferred.resolve();
                                } else {
                                    deferred.reject("Error loading " + swimlane + ":  " + operation.error && operation.error.errors.join(','));
                                }
                            },
                            scope: this
                        });
                    } else {
                        deferred.reject('Failed to load stories associated with iteration:  ' + operation.error.errors.join(','));
                    }
                },
                scope: this
            });


            //Ext.create('Rally.data.wsapi.Store',{
            //    model: 'PortfolioItem/' + portfolioItems[idx],
            //    fetch: ['ObjectID','Name','FormattedID','Parent'],
            //    filters: [{   //Using Leaf Story count so that we only get portfolio items that have stories associated with them.
            //        property: 'LeafStoryCount',
            //        operator: '>',
            //        value: 0
            //    }],
            //    compress: false,
            //    context: {project: null}
            //}).load({
            //    callback: function(records, operation){
            //        if (operation.wasSuccessful()){
            //
            //            var portfolioItemHash = {};
            //            Ext.Array.each(records, function(r){
            //                portfolioItemHash[r.get('ObjectID')] = r.getData();
            //            });
            //            this.portfolioItemHash = portfolioItemHash;
            //            deferred.resolve();
            //        } else {
            //            deferred.reject("Error loading " + swimlane + ":  " + operation.error && operation.error.errors.join(','));
            //        }
            //
            //    },
            //    scope: this
            //});
        } else {
            deferred.resolve();
        }
        return deferred;
    },
    getNullIterationFilter: function(){
        return Ext.create('Rally.data.wsapi.Filter',{
            property: 'Iteration',
            value: null
        });
    },
    getIterationFilter: function(){
        var timeboxScope = this.getContext().getTimeboxScope();
        if(timeboxScope && timeboxScope.getRecord() !== null) {
            return timeboxScope.getQueryFilter();
        }
        return this.getNullIterationFilter();
    },
    showBanner: function(){
        return (this.getSetting('showBanner') === true || this.getSetting('showBanner') && this.getSetting('showBanner').toLowerCase() === "true");
    },
    getGridBox: function(){
        return this.down('#grid_box');
    },
    getBannerBox: function(){
        return this.down('#banner_box')
    },
    updateStatsBanner: function(){
        var showBanner = this.showBanner();
        this.logger.log('updateStatsBanner', showBanner);

        this.getBannerBox().removeAll();

        if (!showBanner){
            return;
        }

        this.getBannerBox().add({
            xtype: 'statsbanner',
            margin: '0 0 5px 0',
            context: this.getContext(),
            timeboxRecord: this.getContext().getTimeboxScope().getRecord()
        });
    },
    getSwimlane: function(){
        return ((this.getSetting('showSwimlanes') === true || this.getSetting('showSwimlanes') === 'true') && this.getSetting('swimlane') && this.getSetting('swimlane').replace('PortfolioItem/','')) || null;
    },
    getShowAge: function(){
        return this.getSetting('showAgeForCard') === true || this.getSetting('showAgeForCard') === 'true' || false;
    },
    getShowAgeAfterDays: function(){
        return this.getShowAge() && (this.getSetting('showAgeAfterDays') || 3) || -1;
    },
    showNoScopeMessage: function(){
        this.add({
            xtype: 'container',
            html: '<div class="no-data-container"><div class="secondary-message">This app is designed for an Iteration scoped dashboard.  Please update the current dashboard to have an iteration scope.</div></div>'
        });
    },

    _rebuildView: function() {
        if (this.down('rallygridboard')){
            this.down('rallygridboard').destroy();
        }

        var timeboxScope = this.getContext().getTimeboxScope();
        
        if(timeboxScope && timeboxScope.getType() === 'iteration') {
            this.getContext().setTimeboxScope(timeboxScope);
            this.updateView(timeboxScope);
        }
    },
    
    updateView: function(timeboxScope){
        this.logger.log('updateView');

        this.getGridBox().removeAll();
        this.getBannerBox().removeAll();

        if (!timeboxScope){
            this.showNoScopeMessage();
            return;
        }

        this.initializeData(timeboxScope).then({
            success: this.buildStore,
            failure: this.showErrorNotification,
            scope: this
        });


    },
    buildStore: function(){
        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: this.getModelNames(),
            enableHierarchy: true,
            filters: this.getIterationFilter(),
            //fetch: ['Feature','Parent','ObjectID']
        }).then({
            success: this.buildBoard,
            scope: this
        });
    },
    getModelNames: function(){
        return ['userstory','defect','testset','defectsuite'];
    },
    getValidPortfolioItemTypePaths: function(){
        return Ext.Array.map(this.validPortfolioItems, function(p){ return p.TypePath; });
    },
    getValidPortfolioItemFields: function(){
        return Ext.Array.map(this.validPortfolioItems, function(p){ return p.TypePath.replace('PortfolioItem/',''); });
    },

    getCardboardConfig: function(iterationFilters){
        var boardConfig = {
                attribute: 'ScheduleState',
                storeConfig: {
                    filters: iterationFilters,
                    fetch: ['Feature','Parent','ObjectID'],
                    compact: false
                },
                cardConfig: {
                    showAge: this.getShowAgeAfterDays(),
                    ageFieldName: 'ScheduleState'
                }

            };

        if (this.getSwimlane()){
            var values = undefined;
            if (this.getPortfolioSwimlaneIndex() > 0){
                values = Ext.Object.getValues(this.portfolioItemHash);
            };
            console.log('values', values,this.getSwimlane(),this.getPortfolioSwimlaneIndex(), this.portfolioItemHash);
            boardConfig.rowConfig = {
                field: this.getSwimlane(),
                sortDirection: 'ASC',
                values: values,
                enableCrossRowDragging: false,
                validPortfolioItems: this.getValidPortfolioItemFields()
            };
            boardConfig.validPortfolioItems = this.getValidPortfolioItemFields();
        }

        return boardConfig;

    },
    //updateFeatures: function(store, node, records){
    //    if (this.getSwimlane() && this.getPortfolioSwimlaneIndex() > 0){
    //        var featureName = this.getValidPortfolioItemFields()[0],
    //            portfolioItemHash = this.portfolioItemHash;
    //
    //
    //        Ext.Array.each(records, function(r){
    //            var feature = r.get(featureName);
    //            if (feature){
    //                feature.__ancestor = portfolioItemHash[feature.ObjectID];
    //                r.set(featureName, feature);
    //            }
    //        });
    //    }
    //},
    buildBoard: function(store){
        this.logger.log('buildBoard');

        //store.on('load', this.updateFeatures, this);

        if ( Ext.isEmpty(this.toggleState) ) { this.toggleState = "grid"; }
        
        var modelNames = this.getModelNames(),
            context = this.getContext(),
            iterationFilters = this.getIterationFilter(),
            margin = 3;
        this.logger.log('buildBoard iterationFilters', iterationFilters.toString());

        //store.load();
        this.getGridBox().add({
            xtype: 'rallygridboard',
            context: context,
            modelNames: modelNames,
            toggleState: this.toggleState,
            stateful: false,
            
            plugins: [
                'rallygridboardaddnew',
                {
                    ptype: 'rallygridboardfieldpicker',
                    headerPosition: 'left',
                    modelNames: modelNames,
                    stateful: true,
                    stateId: context.getScopedStateId('columns-example'),
                    margin: margin
                },
                {
                    ptype: 'rallygridboardinlinefiltercontrol',
                    margin: margin,
                    inlineFilterButtonConfig: {
                        stateful: true,
                        stateId: context.getScopedStateId('filters'),
                        modelNames: modelNames,
                        inlineFilterPanelConfig: {
                            quickFilterPanelConfig: {
                                defaultFields: [
                                    'ArtifactSearch',
                                    'Owner',
                                    'ModelType'
                                ]
                            }
                        }
                    }
                },
                {
                    ptype: 'rallygridboardsharedviewcontrol',
                    stateful: true,
                    stateId: context.getScopedStateId('iteration-view'),
                    stateEvents: ['select','beforedestroy'],
                    margin: margin
                },
                {
                    ptype: 'rallygridboardactionsmenu',
                    menuItems: [
                        {
                            text: 'Export...',
                            handler: function() {
                                window.location = Rally.ui.gridboard.Export.buildCsvExportUrl(
                                    this.down('rallygridboard').getGridOrBoard());
                            },
                            scope: this
                        }
                    ],
                    buttonConfig: {
                        iconCls: 'icon-export'
                    }
                },
                'rallygridboardtoggleable'
            ],
            cardBoardConfig: this.getCardboardConfig(iterationFilters),
            gridConfig: {
                store: store,
                columnCfgs: [
                    'Name',
                    'ScheduleState',
                    'Owner',
                    'PlanEstimate'
                ],
                storeConfig: {
                    filters: iterationFilters
                }

            },
            listeners: {
                viewchange: function(gb) {
                    this.toggleState = gb.toggleState;
                    this._rebuildView();
                },
                load: this.updateStatsBanner,
                scope: this
            },
            height: this.getHeight()
        });
    },
    getUserSettingsFields: function(){
        return [{
            xtype: 'rallycheckboxfield',
            name: 'showBanner',
            fieldLabel: ' ',
            labelWidth: 100,
            boxLabel: 'Show the Iteration Progress Banner'
        }];
    },
    getSwimlaneStoreData: function(){


        var data = [
            {name: 'Blocked', value: 'Blocked'},
            {name: 'Owner', value: 'Owner'},
            {name: 'Sizing', value: 'PlanEstimate'},
            {name: 'Expedite', value: 'Expedite'}
        ];

        data.push({
            name: this.validPortfolioItems[0].DisplayName,
            value: this.validPortfolioItems[0].TypePath
        });

        data.push({
            name: this.validPortfolioItems[1].DisplayName,
            value: this.validPortfolioItems[1].TypePath
        });

        //We don't support all levels yet.
        //Ext.Array.each(this.validPortfolioItems, function(p){
        //    data.push({
        //        name: p.DisplayName,
        //        value: p.TypePath
        //    });
        //});
        return data;
    },
    getSettingsFields: function(){

        var swimlaneStore = Ext.create('Rally.data.custom.Store',{
            data: this.getSwimlaneStoreData()
        });


        var showAgeForCard = this.getSetting('showAgeForCard') === true || this.getSetting('showAgeForCard') === 'true',
            age = this.getSetting('showAgeAfterDays') || 3,
            showSwimlanes = this.getSetting('showSwimlanes') === true || this.getSetting('showSwimlanes') === 'true',
            swimlane = this.getSetting('swimlane');

        return [{
            xtype: 'container',
            layout: 'hbox',
            handlesEvents: {
                change: function (cb) {
                    if (cb.name === 'showAgeForCard') {
                        this.down('rallytextfield').setDisabled(cb.getValue() !== true);
                    }
                }
            },
            padding: 10,
            items: [{
                xtype: 'rallycheckboxfield',
                boxLabel: 'Show Age for card after',
                fieldLabel: ' ',
                labelWidth: 100,
                name: 'showAgeForCard',
                bubbleEvents: ['change'],
                labelSeparator: '',
                value: showAgeForCard
            }, {
                xtype: 'rallytextfield',
                name: 'showAgeAfterDays',
                width: 25,
                fieldLabel: '',
                margin: '0 5 0 5',
                disabled: showAgeForCard !== true,
                value: age
            }, {
                xtype: 'label',
                text: ' day(s) in column',
                margin: '3 0 0 0'
            }]
        },{
            xtype: 'container',
            layout: 'hbox',
            padding: 10,
            handlesEvents: {
                change: function(cb){
                    if (cb.name === 'showSwimlanes'){
                        this.down('rallycombobox').setDisabled(cb.getValue() !== true);
                    }

                }
            },
            items: [{
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Swimlanes',
                name: 'showSwimlanes',
                labelAlign: 'right',
                labelWidth: 100,
                bubbleEvents: ['change'],
                labelSeparator: '',
                value: showSwimlanes
            },{
                xtype: 'rallycombobox',
                store: swimlaneStore,
                displayField: 'name',
                valueField: 'value',
                name: 'swimlane',
                margin: '0 10 0 10',
                disabled: showSwimlanes !== true,
                value: swimlane
            }]
        }];


    },
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    }
});
