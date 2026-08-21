namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class AddComplaintCommentRequest
{
    public required string Message { get; set; }
}