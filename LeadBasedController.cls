public with sharing class LeadBasedController {

    // Method to get Lead Data by Status and Lead to Opportunity Duration
    @AuraEnabled(cacheable=true)
    public static Map<String, List<Map<String, Object>>> getLeadData() {
        Map<String, List<Map<String, Object>>> result = new Map<String, List<Map<String, Object>>>();
        List<Map<String, Object>> statusData = new List<Map<String, Object>>();
        List<Map<String, Object>> durationData = new List<Map<String, Object>>();

        // Query for lead counts by status
        AggregateResult[] newLeads = [SELECT COUNT(Id) total FROM Lead WHERE IsConverted = FALSE];
        AggregateResult[] convertedLeads = [SELECT COUNT(Id) total FROM Lead WHERE IsConverted = TRUE];
        AggregateResult[] notConvertedLeads = [SELECT COUNT(Id) total FROM Lead WHERE IsConverted = FALSE AND Status = 'Closed - Not Converted'];

        statusData.add(new Map<String, Object>{ 'Status' => 'New Leads', 'Count' => (Integer)newLeads[0].get('total') });
        statusData.add(new Map<String, Object>{ 'Status' => 'Converted Leads', 'Count' => (Integer)convertedLeads[0].get('total') });
        statusData.add(new Map<String, Object>{ 'Status' => 'Not Converted Leads', 'Count' => (Integer)notConvertedLeads[0].get('total') });

        // Query for lead to opportunity duration
        List<Lead> leads = [SELECT Id, Name, CreatedDate, ConvertedDate, ConvertedOpportunity.CreatedDate FROM Lead WHERE IsConverted = TRUE];
        for (Lead lead : leads) {
            if (lead.ConvertedOpportunity != null) {
                Opportunity opp = lead.ConvertedOpportunity;
                Long durationInMillis = opp.CreatedDate.getTime() - lead.CreatedDate.getTime();
                Long durationInDays = durationInMillis / (1000 * 60 * 60 * 24);
                
                Map<String, Object> leadDuration = new Map<String, Object>();
                leadDuration.put('LeadName', lead.Name);
                leadDuration.put('DurationInDays', durationInDays);
                
                durationData.add(leadDuration);
            }
        }

        result.put('statusData', statusData);
        result.put('durationData', durationData);
        return result;
    }

    // Method to get combined Lead data by Industry and Product Interest
    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getCombinedLeadData() {
        List<Map<String, Object>> combinedData = new List<Map<String, Object>>();
        
        AggregateResult[] results = [
            SELECT Industry, ProductInterest__c, COUNT(Id) total 
            FROM Lead 
            WHERE Industry != null AND ProductInterest__c != null 
            GROUP BY Industry, ProductInterest__c
        ];
        
        for (AggregateResult ar : results) {
            combinedData.add(new Map<String, Object>{
                'Industry' => (String) ar.get('Industry'),
                'ProductInterest' => (String) ar.get('ProductInterest__c'),
                'Count' => (Integer) ar.get('total')
            });
        }
        
        return combinedData;
    }

    // Method to get Yearly Lead Data
    @AuraEnabled(cacheable=true)
    public static List<LeadYearlyStats> getLeadCountByYear() {
        // Query to get the number of leads grouped by year
        List<AggregateResult> results = [
            SELECT CALENDAR_YEAR(CreatedDate) year, COUNT(Id) leadCount
            FROM Lead
            GROUP BY CALENDAR_YEAR(CreatedDate)
            ORDER BY CALENDAR_YEAR(CreatedDate) DESC
        ];
        
        List<LeadYearlyStats> statsList = new List<LeadYearlyStats>();
        
        // Loop through the results and add them to the list
        for (AggregateResult result : results) {
            LeadYearlyStats stats = new LeadYearlyStats();
            stats.year = (Integer) result.get('year');  // The value for the year will be in 'year'
            stats.leadCount = (Integer) result.get('leadCount');  // Lead count is in 'leadCount'
            statsList.add(stats);
        }
        return statsList;
    }

    // Wrapper class to store Yearly Lead Stats
    public class LeadYearlyStats {
        @AuraEnabled public Integer year;
        @AuraEnabled public Integer leadCount;
    }
}
