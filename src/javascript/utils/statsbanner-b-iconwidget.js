Ext.define('CArABU.technicalservices.IconWidget', {
    extend: 'CArABU.technicalservices.BannerWidget',
    alias:'widget.statsbannericonwidget',

    requires: [
        'Rally.ui.chart.Chart',
        'Rally.util.Timebox',
        'Rally.util.Colors'
    ],

    tpl: [
        '<div class="expanded-widget">',
        '<div class="stat-title" id="{uniqueid}" >{title}</div>', //data-qtip="{tooltip}"
        '<div class="stat-metric">',
        '<div class="metric-icon ',
        '{statIcon}',
        '"></div>',
        '{statUnits}',
        '<div class="stat-secondary">{unitLabel}</div>',
        '</div>',  //stat-metric
        '</div>',  //expanded-widget
        '<div class="collapsed-widget">',
        '<div class="metric-icon ',
        '{statIcon}',
        '"></div>',
        '<div class="stat-title">{title}</div>',
        '<div class="stat-metric">{statUnits}</div>',
        '</div>'
    ],

    config: {
        data: {
            statIcon: '',
            statUnits: 0,
            statSecondaryLabel: 0,
            totalUnits: 0,
            unit: '',
            title: ''
        }
    },
    getTooltip: function(values){
        if (values.tooltip){
            return values.tooltip;
        }
        return '';
    },
    initComponent: function() {
        this.mon(this.store, 'datachanged', this.onDataChanged, this);
        this.callParent(arguments);
    },
    onDataChanged: function() {
        var data = this.getRenderData();
        this.update(data);
    },
    getRenderData: function() {
        return {};
    }
});