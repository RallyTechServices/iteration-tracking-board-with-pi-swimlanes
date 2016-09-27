Ext.define('CArABU.technicalservices.BannerWidget', {
    extend: 'Ext.Component',
    alias: 'widget.bannerwidget',

    config: {
        expanded: true
    },

    cls: 'stat-panel',

    data: {},

    tpl: [
        '<div class="expanded-widget"></div>',
        '<div class="collapsed-widget"></div>'
    ],

    //constructor: function(config){
    //    this.mergeConfig(config);
    //    this.callParent([this.config]);
    //},

    onRender: function() {
        if (this.expanded) {
            this.removeCls('collapsed');
        } else {
            this.addCls('collapsed');
        }
        this.callParent(arguments);
    },

    expand: function() {
        this.removeCls('collapsed');
        this.setExpanded(true);
    },

    collapse: function() {
        this.addCls('collapsed');
        this.setExpanded(false);
    }
});