namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class ComplaintCommentResponse
{
    public Guid Id { get; set; }

    public Guid ComplaintId { get; set; }

    public string Message { get; set; } = string.Empty;

    public UserSummaryResponse CreatedBy { get; set; } = null!;

    public DateTime CreatedAtUtc { get; set; }
}