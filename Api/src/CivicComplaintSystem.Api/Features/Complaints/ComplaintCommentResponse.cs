namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class ComplaintCommentResponse
{
    public Guid Id { get; set; }

    public Guid ComplaintId { get; set; }

    public string Message { get; set; } = string.Empty;

    public ComplaintCommentAuthorResponse CreatedBy { get; set; } = null!;

    public DateTime CreatedAtUtc { get; set; }
}


public sealed class ComplaintCommentAuthorResponse
{
    public Guid Id { get; set; }

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;
}
