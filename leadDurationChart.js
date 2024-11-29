import { LightningElement, wire } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import CHART_JS from '@salesforce/resourceUrl/ChartJS'; // Path to the Chart.js resource
import getLeadData from '@salesforce/apex/LeadBasedController.getLeadData';
import getCombinedLeadData from '@salesforce/apex/LeadBasedController.getCombinedLeadData';
import getLeadCountByYear from '@salesforce/apex/LeadBasedController.getLeadCountByYear';

export default class LeadCharts extends LightningElement {
    chartJsInitialized = false;
    statusTableData = [];
    durationTableData = [];
    combinedData = [];
    yearlyLeadData = [];
    chartInstanceStatus;
    chartInstanceDuration;
    chartInstanceCombined;
    chartInstanceYearly;

    statusColumns = [
        { label: 'Lead Status', fieldName: 'status', type: 'text' },
        { label: 'Count', fieldName: 'count', type: 'number' }
    ];

    durationColumns = [
        { label: 'Lead Name', fieldName: 'leadName', type: 'text' },
        { label: 'Duration (Days)', fieldName: 'durationInDays', type: 'number' }
    ];

    @wire(getLeadData)
    wiredLeadData({ error, data }) {
        if (data) {
            if (data.statusData.length > 0) {
                this.statusTableData = data.statusData.map(item => ({
                    status: item.Status,
                    count: item.Count
                }));
            }

            if (data.durationData.length > 0) {
                this.durationTableData = data.durationData.map(item => ({
                    leadName: item.LeadName,
                    durationInDays: item.DurationInDays
                }));
            }

            if (this.chartJsInitialized) {
                this.initializeCharts();
            }
        } else if (error) {
            console.error('Error fetching lead data', error);
        }
    }

    @wire(getCombinedLeadData)
    wiredCombinedLeadData({ error, data }) {
        if (data) {
            this.combinedData = data.map(item => ({
                label: `${item.Industry} - ${item.ProductInterest}`,
                count: item.Count
            }));

            if (this.chartJsInitialized) {
                this.initializeCombinedChart();
            }
        } else if (error) {
            console.error('Error fetching combined lead data', error);
        }
    }

    @wire(getLeadCountByYear)
    wiredLeadCountByYear({ error, data }) {
        if (data) {
            this.yearlyLeadData = data;
            this.initializeYearlyLeadChart();
        } //else if (error) {
          //  console.error('Error fetching yearly lead data', error);
       // }
    }

    renderedCallback() {
        // Ensure Chart.js is only loaded once
        if (this.chartJsInitialized) {
            return;
        }

        loadScript(this, CHART_JS)
            .then(() => {
                this.chartJsInitialized = true;
                this.initializeCharts(); // Initialize charts after the script is loaded
            })
            .catch(error => {
                console.error('Error loading Chart.js', error);
            });
    }

    initializeCharts() {
        if (this.statusTableData.length > 0) {
            this.initializeStatusChart();
        }
        if (this.durationTableData.length > 0) {
            this.initializeDurationChart();
        }
        if (this.combinedData.length > 0) {
            this.initializeCombinedChart();
        }
        if (this.yearlyLeadData.length > 0) {
            this.initializeYearlyLeadChart();
        }
    }

    initializeStatusChart() {
        const canvas = this.template.querySelector('.status-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (this.chartInstanceStatus) {
            this.chartInstanceStatus.destroy();
        }

        this.chartInstanceStatus = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.statusTableData.map(item => item.status),
                datasets: [{
                    label: 'Lead Status Counts',
                    data: this.statusTableData.map(item => item.count),
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
                    borderColor: ['#FF6384', '#36A2EB', '#FFCE56'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    initializeDurationChart() {
        const canvas = this.template.querySelector('.duration-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (this.chartInstanceDuration) {
            this.chartInstanceDuration.destroy();
        }

        this.chartInstanceDuration = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.durationTableData.map(item => item.leadName),
                datasets: [{
                    label: 'Duration (Days)',
                    data: this.durationTableData.map(item => item.durationInDays),
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    initializeCombinedChart() {
        const canvas = this.template.querySelector('.combined-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (this.chartInstanceCombined) {
            this.chartInstanceCombined.destroy();
        }

        this.chartInstanceCombined = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: this.combinedData.map(item => item.label),
                datasets: [{
                    data: this.combinedData.map(item => item.count),
                    backgroundColor: this.getColorPalette(this.combinedData.length),
                    borderColor: '#ffffff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw}`;
                            }
                        }
                    }
                }
            }
        });
    }

    getColorPalette(count) {
        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
            '#8E44AD', '#2ECC71', '#F1C40F', '#E74C3C', '#3498DB', '#1ABC9C'
        ];
        let palette = [];
        for (let i = 0; i < count; i++) {
            palette.push(colors[i % colors.length]);
        }
        return palette;
    }

    initializeYearlyLeadChart() {
        if (!this.yearlyLeadData || this.yearlyLeadData.length === 0) return;

        let years = [];
        let leadCounts = [];

        this.yearlyLeadData.forEach(item => {
            years.push(item.year);
            leadCounts.push(item.leadCount);
        });

        const chartData = {
            labels: years,
            datasets: [{
                label: 'Yearly Lead Count',
                data: leadCounts,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        };

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false
        };

        const chartElement = this.template.querySelector('.yearly-chart');
        if (this.chartInstanceYearly) {
            this.chartInstanceYearly.destroy();
        }

        this.chartInstanceYearly = new Chart(chartElement, {
            type: 'bar',
            data: chartData,
            options: chartOptions
        });
    }
}
