Ext.define('CArABU.technicalservices.IterationProgress', {
    extend: 'CArABU.technicalservices.BannerWidget',
    alias:'widget.statsbanneriterationprogress',

    config: {
        context: null,
        store: null
    },

    currentChartDisplayed: 0,

    stateId: 'stats-banner-iteration-progress',
    stateful: true,

    tpl: [
        '<div class="expanded-widget">',
        '<div class="stat-title"></div>',
        '<div class="stat-metric">',
        '<div class="stat-carousel"></div>',
        '</div>',
        '</div>',
        '<div class="collapsed-widget">',
        '<span class="metric-icon icon-pie"></span>',
        '<div class="stat-title"></div>',
        '</div>'
    ],

    constructor: function(config) {
        this.stateId = Rally.environment.getContext().getScopedStateId(this.stateId);
        this.callParent(arguments);
    },

    initComponent: function(){
        this.mon(this.store, 'datachanged', this.onDataChanged, this);
        this.callParent(arguments);

        this.callParent(arguments);
        var boundClickHandler = Ext.bind(this._onChartClick, this);

        this.carouselItems = [{
            xtype: 'statsbannerminimalpiechart',
            width: 150,
            height: 60,
            minimalMode: true,
            clickHandler: boundClickHandler,
            context: this.context,
            store: this.store
        },{
            xtype: 'statsbannerburndownchart',
            width: 150,
            height: 63,
            minimalMode: true,
            clickHandler: boundClickHandler,
            context: this.context,
            store: this.store
        },{
            xtype: 'statsbannercumulativeflowchart',
            width: 150,
            height: 63,
            minimalMode: true,
            clickHandler: boundClickHandler,
            context: this.context,
            store: this.store
        }];

        _.each(this.carouselItems, function(carouselItem) {
            carouselItem.listeners = {
                ready: this._onChartReady,
                scope: this
            };
        }, this);


        this._pendingChartReadies = this.carouselItems.length;
    },

    expand: function() {
        this.callParent();
        if (!this.carousel || this.carousel.getWidth() === 0) {
            this.onDataChanged();
        }
    },

    _onChartReady: function() {
        this._pendingChartReadies -= 1;
        if (this._pendingChartReadies === 0) {
            this.fireEvent('ready', this);
        }
    },

    _onChartClick: function() {
        var currentIndex = this.carousel.getCurrentItemIndex();
        Ext.create('CArABU.technicalservices.IterationProgressDialog', {
            startingIndex: currentIndex,
            store: this.store,
            context: this.context
        });
    },

    _cleanupCarousel: function () {
        if (this.carousel) {
            this.carousel.destroy();
            delete this.carousel;
        }
    },
    onDestroy: function () {
        this._cleanupCarousel();
        this.callParent(arguments);
    },

    onRender: function() {
        this.callParent(arguments);
        if (this._getTimebox()) {
            this._addPlaceholder();
        }
    },
    _getTimebox: function(){
        return this.timeboxRecord || null;
    },
    applyState: function (state) {
        if (state){
            if (state.currentChartDisplayed > this.carouselItems.length -1 || state.currentChartDisplayed < 0) {
                this.currentChartDisplayed = 0;
            } else {
                this.currentChartDisplayed = state.currentChartDisplayed;
            }
        }
    },
    getState: function(){
        return {
            currentChartDisplayed: this.currentChartDisplayed
        };
    },

    onDataChanged: function() {
        this._cleanupCarousel();
        if(this.rendered) {
            if (this._getTimebox()) {
                this.update();

                this.createCarousel();
            } else {
                this._addPlaceholder();
            }
        }
    },

    createCarousel: function() {
        this.carousel = Ext.create('Rally.ui.carousel.Carousel', {
            showHeader: false,
            showDots: true,
            smallDots: true,
            renderTo: this.getEl().down('.stat-carousel'),
            height: 75,
            layout: {
                type: 'vbox',
                align: 'center'
            },
            listeners: {
                currentitemset: this._updateTitle,
                carouselmove: this._updateTitle,
                scope: this
            },
            carouselItems: this.carouselItems
        });

        if (!Ext.isIE8m){
            // if such next line runs IE8 or < goes boom! WOW!
            this.carousel.setCurrentItem(this.currentChartDisplayed);
        }

        this.carousel.on('carouselmove', this._chartShownChanged, this);
    },

    _updateTitle: function(carousel){
        _.each(this.getEl().query('.stat-title'), function(el){
            Ext.fly(el).update(carousel.getCurrentItem().displayTitle);
        }, this);
    },
    _chartShownChanged: function(){
        var chartShown = _.findIndex(this.carouselItems, {xtype: this.carousel.getCurrentItem().xtype});
        this.currentChartDisplayed = chartShown || 0;
        this.saveState();
    },
    _addPlaceholder: function() {
        this.update();

        if (this.expanded) {
            this.carousel = Ext.create('Ext.Container', {
                renderTo: this.getEl().down('.stat-carousel'),
                html: 'no iteration data'
            });
        }
    }
});