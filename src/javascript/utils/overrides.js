Ext.override(Rally.ui.cardboard.CardBoard,{
    _createColumnDefinition: function (columnConfig) {
        var config = Ext.merge({
            enableCrossColumnRanking: this.enableCrossColumnRanking
        }, Ext.clone(this.columnConfig), columnConfig);

        var enableRanking = this.enableRanking;
        if (this.context) {
            var workspace = this.context.getWorkspace();
            if (workspace) {
                enableRanking = enableRanking && workspace.WorkspaceConfiguration.DragDropRankingEnabled;
            }
        }

        var listenersConfig = {
            ready: this._onColumnReady,
            select: this._onCardSelect,
            deselect: this._onCardDeselect,
            cardinvalid: this._onCardInvalid,
            scope: this
        };

        Ext.merge(config, {
            cardConfig: Ext.clone(this.cardConfig),
            columnHeaderConfig: Ext.clone(this.columnHeaderConfig),
            model: this.models,
            attribute: this.attribute,
            storeConfig: Ext.clone(this.storeConfig),
            enableRanking: enableRanking,
            filterCollection: this.filterCollection ? this.filterCollection.clone() : undefined,
            ownerCardboard: this,
            listeners: listenersConfig,
            ddGroup: this.ddGroup
        });


        if (this.readOnly) {
            config.dropControllerConfig = false;
        }

        var cardConfig = config.cardConfig;
        if (columnConfig.cardConfig) {
            Ext.Object.merge(cardConfig, columnConfig.cardConfig);
            cardConfig.fields = Ext.Array.merge(columnConfig.cardConfig.fields || [], this.cardConfig.fields || []);
        }

        var storeConfig = config.storeConfig;
        if (columnConfig.storeConfig) {
            Ext.Object.merge(storeConfig, columnConfig.storeConfig);
            storeConfig.filters = Ext.Array.merge(columnConfig.storeConfig.filters || [], this.storeConfig.filters || []);
        }
        if (this._hasValidRowField()) {
            storeConfig.sorters = this._getRowSorters(storeConfig.sorters);
            storeConfig.fetch = Ext.Array.merge(this.rowConfig.field, storeConfig.fetch || []);
            config.enableCrossRowDragging = this.rowConfig.enableCrossRowDragging !== false &&
                !this.rowConfig.fieldDef.readOnly;
        }
        var sorter = _.last(storeConfig.sorters);
        if(sorter && !Rally.data.Ranker.isRankField(sorter.property)) {
            cardConfig.showRankMenuItems = false;
        }

        return Ext.widget(config.xtype, config);
    },

    _parseRows: function() {
       if(this.rowConfig && !this.rowConfig.values) {
           // if (this.rowConfig.field && Ext.Array.contains(this.validPortfolioItems, this.rowConfig.field) && !this.rowConfig.values){
           //// if (this.rowConfig.field && this.rowConfig.field.indexOf('PortfolioItem/') !== -1){
           //    //This is a portfolio item swimlane
           //     var fieldName = this.rowConfig.field.replace('PortfolioItem/','');
           //     this.rowConfig.fieldDef = this.getModel().getField(fieldName);
           //     console.log('fieldName', fieldName);
           //     return this._getPortfolioItemValues(this.rowConfig.field).then({
           //         success: function(swimlaneValues){
           //             if(swimlaneValues){
           //                 this.rowConfig.values = swimlaneValues.values;
           //                 if(swimlaneValues.sortDirection) {
           //                     this.rowConfig.sortDirection = swimlaneValues.sortDirection;
           //                 }
           //             }
           //         },
           //         scope: this
           //     });
           // } else {
                var fieldDef = this.rowConfig.fieldDef = this.getModel().getField(this.rowConfig.field);

                return this._getAllowedValues(fieldDef).then({
                    success: function(allowedValues){
                        if(allowedValues){
                            this.rowConfig.values = allowedValues.values;
                            if(allowedValues.sortDirection) {
                                this.rowConfig.sortDirection = allowedValues.sortDirection;
                            }
                        }
                    },
                    scope: this
                });
            //}
        }
        return Deft.Promise.when();
    },
    //_getPortfolioItemValues: function(portfolioItemName){
    //
    //    var portfolioItemTypePath = "PortfolioItem/" + portfolioItemName;
    //    return Ext.create('Rally.data.wsapi.Store',{
    //        model: portfolioItemTypePath,
    //        fetch: ['FormattedID','Name','ObjectID'],
    //        limit: 'Infinity',
    //        context: {project: null}
    //    }).load({
    //        callback: function(records, operation){
    //            var values = Ext.Array.map(records, function(r){ return r.getData(); });
    //
    //            return {
    //                values: values
    //            };
    //        }
    //    });
    //    return Deft.Promise.when();
    //},

    
    _hasValidRowField: function() {

        //if ( Ext.isEmpty(this.validPortfolioItems) ) { return false; }
        
        var field = this.rowConfig && this.rowConfig.field;
        if (Ext.Array.contains(this.validPortfolioItems || [], field)){
            return true;
        }

        var hasValidField = this.rowConfig &&
            _.every(this.getModels(), function(model){ return model.hasField(this.rowConfig.field); }, this);
        return hasValidField;
    },
    getRowFor: function (item) {
        var rows = this.getRows(),
            record = item.isModel ? item : item.getRecord(),
            row;

        if (this._hasValidRowField()) {
            row = _.find(rows, function (row) {
                    return row.isMatchingRecord(record);
                }) ||
                this._createRow({
                    showHeader: true,
                    value: record.get(this.rowConfig.field)
                }, true);
        } else {
            row = rows[0] || this._createDefaultRow();
        }

        return row;
    },
    getRows: function () {
        return this.rowDefinitions;
    },
    _renderColumns: function () {
        if (this.columnDefinitions.length > 0) {
            this._calculateMinWidth();

            this.getEl().update(this._getColumnContainerHtml());

            this.rowDefinitions = [];
            if(this._hasValidRowField()) {
                _.each(this.rowConfig.values, function(rowValue) {
                    this._createRow({
                        showHeader: true,
                        value: rowValue
                    });
                }, this);
            } else {
                this._createRow({showHeader: false, isDefault: true});
            }

            this._addColumnsToDom();

            this.fireEvent('aftercolumnrender', this);
        }
    },
    _createRow: function(rowConfig, applySort) {
        var collapsed = false;
        if (this.rowConfig && this.rowConfig.field && this.state && this.state.collapsedRows) {
            var rowKey = this._getRowKey(this.rowConfig.field, rowConfig.value);
            collapsed = this.state.collapsedRows.hasOwnProperty(rowKey);
        }

        var defaultRowConfig = {
            el: this.getEl().down('tbody.columns'),
            columns: this.columnDefinitions,
            context: this.getAppContextOrEnvironmentContext(),
            fieldDef: this.rowConfig && (this.rowConfig.fieldDef || {name: this.rowConfig.field}),
            collapsed: collapsed,
            validPortfolioItems: this.validPortfolioItems
        };

        if (this.rowConfig) {
            if(this.rowConfig.headerConfig) {
                defaultRowConfig.headerConfig = this.rowConfig.headerConfig;
            }
            if(this.rowConfig.sortField) {
                defaultRowConfig.sortField = this.rowConfig.sortField;
            }
        }

        var row = Ext.create('Rally.ui.cardboard.row.Row',
            Ext.apply(defaultRowConfig, rowConfig)),
            sortIndex = applySort ? this._getSortedIndex(row) : this.rowDefinitions.length;
        this.rowDefinitions.splice(sortIndex, 0, row);
        row.insert(this.rowDefinitions[sortIndex + 1]);

        if(row.isCollapsible()) {
            row.on('collapse', this.saveState, this);
            row.on('expand', this.saveState, this);
        }
        return row;
    },
});

Ext.override(Rally.ui.cardboard.Column,{
    _createCard: function(record, cardConfig) {
        if (this.fields && this.fields.length > 0) {
            if (!Ext.isObject(cardConfig)) {
                cardConfig = {};
            }
            cardConfig.fields = Ext.Array.union(this.cardConfig.fields || [], this.fields || []);
        }

        var config = Ext.merge({}, this.cardConfig, {
            record: record
        }, cardConfig);

        var card = Ext.widget(config.xtype, config);

        card.rankRecordHelper = {
            _addColumnFilters: function(storeConfig) {
                var row = card.ownerColumn.getRowFor(card);
                storeConfig.filters = Ext.Array.merge(
                    storeConfig.filters || [],
                    card.ownerColumn.store.filters.getRange());
                if(card.ownerColumn.getRows().length > 1) {
                    //Feature
                    //Feature.Parent
                    //Feature.Parent.Parent

                    storeConfig.filters.push({
                        property: row.fieldDef.name,
                        operator: '=',
                        value: row.getRowValue()
                    });
                }
            },

            findRecordToRankAgainst: function(options) {
                options = options || {};
                var extremeLoadOptions = {
                    last: !options.highest,
                    metricsCmp: options.requester,
                    storeConfig: {}
                };
                this.rankRecordHelper._addColumnFilters(extremeLoadOptions.storeConfig);
                return Rally.data.Ranker.loadExtremeRankedRecord(this.ownerColumn.store, extremeLoadOptions)
                    .then(function(record) {
                        Ext.callback(options.success, options.scope, [record]);
                        return record;
                    });
            },

            getMoveToPositionStore: function(options) {
                options = options || {};

                var store = this.ownerColumn.store;

                Ext.merge(options, {
                    storeConfig: {
                        model: store.model,
                        context: store.context
                    }
                });
                this.rankRecordHelper._addColumnFilters(options.storeConfig);
                return Deft.Promise.when(Ext.create(store.self, options.storeConfig));
            },
            scope: card
        };

        return card;
    }
});

Ext.override(Rally.ui.cardboard.row.Row,{
    isMatchingRecord: function(record) {

        var fieldDef = this.getFieldDef(),
            fieldName = fieldDef && fieldDef.name,
            rowValue = this.getRowValue() || "",
            recordValue ="";

        if (this.getRowValue() === false){
            rowValue = false;
        }

      //  var secondLevelPIName = this.validPortfolioItems && this.validPortfolioItems[1].replace('PortfolioItem/');

        var idx = _.indexOf(this.validPortfolioItems, fieldName);
        if (idx > 0){ //(fieldName === secondLevelPIName){
            var lowestPIName = this.validPortfolioItems[0].replace('PortfolioItem/');
            var pi = record.get(lowestPIName);
            if (pi){
                recordValue = pi && pi.Parent || "";
            }
        } else {
            recordValue = record.get(fieldName) || "";
            if (fieldDef && Ext.isFunction(fieldDef.getType) && fieldDef.getType() === "boolean"){
                recordValue = record.get(fieldName) || false ;
            }
        }
        return (rowValue === recordValue ||
        (Rally.util.Ref.isRefUri(rowValue) &&
        Rally.util.Ref.getRelativeUri(recordValue) === Rally.util.Ref.getRelativeUri(rowValue)));

    }
});


Ext.override(Rally.ui.gridboard.GridBoard, {
    _setSharedViewProperties: function (items, view) {
        //kc - this only works for plugins that have the setCurrentView function.  Those are the filter.
        // The field picker and toggle plugins do not have this function.

        //need to set the toggle state here since it is not set above
        this.setToggleState(view.toggleState);

        _.each(items || [], function (p) {
            if (_.isFunction(p.setCurrentView)) {
                p.setCurrentView(view);
            } else {

                if (p.ptype === 'rallygridboardfieldpicker'){
                    p.updateFields(view.fields);
                }
                if (p.ptype === 'rallygridboardsharedviewcontrol'){
                   //todo, set the view in the dropdown?
                }
            }
        }, this);
    }
});


Ext.override(Rally.ui.gridboard.SharedViewComboBox,{

    _isViewPreference: function(record){
        // record coming back from dialog has a number for AppId, but this.getContext is a string
        return record.self.typePath === 'preference' &&
            record.get('Type') === 'View' &&
            "" + record.get('AppId') === "" + this.getContext().getAppId();
    }

});