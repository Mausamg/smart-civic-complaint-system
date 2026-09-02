namespace CivicComplaintSystem.Api.Features.Complaints;

public enum ComplaintStatus
{
    Submitted = 0,
    UnderReview = 1,
    InProgress = 3,
    Resolved = 4,
    Rejected = 5,
    Withdrawn = 6
}