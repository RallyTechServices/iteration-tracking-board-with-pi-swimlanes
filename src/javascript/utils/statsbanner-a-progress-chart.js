Ext.define("CArABU.technicalservices.IterationProgressChart", {
    requires: [
        "Rally.ui.chart.Chart"
    ],

    chartComponentConfig: {
        xtype: "rallychart",
        suppressClientMetrics: true /* keeps rallychart::lookback query time from displaying in client metrics */
    }
});