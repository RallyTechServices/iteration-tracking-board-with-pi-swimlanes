Ext.define('CArABU.technicalservices.IterationProgressDialog', {
    extend: 'Rally.ui.dialog.Dialog',
    alias:'widget.statsbanneriterationprogressdialog',

    config: {
        startingIndex: 0,
        autoShow: true,
        draggable: true,
        disableScroll: true,
        width: 720, //820,
        height: 550, //650,
        closable: true,
        constrain: true,
        store: null,
        context: null
    },
    layout: {
        type: 'vbox',
        align: 'center'
    },
    cls: 'iteration-progress-dialog',

    constructor: function (config){
        this.initConfig(config || {});
        this.callParent(arguments);
    },

    initComponent: function(){
        var chartWidth = 620;
        var chartHeight = 450;

        this.callParent(arguments);
        this.toggle = this.add({
            xtype: 'iterationprogressdialogcharttoggle',
            startingIndex: this.startingIndex,
            listeners: {
                toggle: this._toggleButtonClick,
                scope: this
            }
        });
        this.carousel = this.add({
            xtype: 'rallycarousel',
            showDots: false,
            enableAnimations: false,
            carouselItems: [
                {
                    xtype: 'statsbannerpiechart',
                    width: chartWidth,
                    height: chartHeight,
                    context: this.context
                },
                {
                    xtype: 'statsbannerburndownchart',
                    width: chartWidth,
                    height: chartHeight,
                    context: this.context,
                    store: this.store
                },
                {
                    xtype: 'statsbannercumulativeflowchart',
                    width: chartWidth,
                    height: chartHeight,
                    context: this.context,
                    store: this.store
                }
            ],
            startingIndex: this.startingIndex,
            listeners: {
                carouselmove: {
                    fn: this._onCarouselMove,
                    scope: this
                },
                afterlayout: {
                    fn: this._afterLayout,
                    single: true,
                    scope: this
                }
            }
        });
    },

    _toggleButtonClick: function(toggleBtnContainer, buttonIndex){
        this._setChart(buttonIndex);
    },

    _afterLayout: function(){
        Ext.defer(this._setChart, 10, this, [this.startingIndex]);
    },

    _setChart: function(chartIndex) {
        this.carousel.setCurrentItem(chartIndex);
        this.toggle.setCurrentItem(chartIndex);
        // need to bypass the setTitle method as it causes a relayout of the page messing up the carousel
        this.header.titleCmp.textEl.update(this.carousel.getCurrentItem().displayTitle);
    },

    _onCarouselMove: function(carousel){
        this._setChart(carousel.getCurrentItemIndex());
    }
});