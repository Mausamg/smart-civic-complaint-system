namespace CivicComplaintSystem.Api.Features.Complaints;

public static class ComplaintStatusRules
{
    public static bool CanTransition(
        ComplaintStatus currentStatus,
        ComplaintStatus newStatus)
    {
        return currentStatus switch
        {
            ComplaintStatus.Submitted =>
                newStatus == ComplaintStatus.UnderReview ||
                newStatus == ComplaintStatus.Rejected,

            ComplaintStatus.UnderReview =>
                newStatus == ComplaintStatus.InProgress ||
                newStatus == ComplaintStatus.Resolved ||
                newStatus == ComplaintStatus.Rejected,

            ComplaintStatus.InProgress =>
                newStatus == ComplaintStatus.Resolved ||
                newStatus == ComplaintStatus.Rejected,

            ComplaintStatus.Resolved =>
                false,

            ComplaintStatus.Rejected =>
                false,

            _ => false
        };
    }
}