namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class UpdateComplaintStatusRequest
{
    public ComplaintStatus Status { get; init; }
}