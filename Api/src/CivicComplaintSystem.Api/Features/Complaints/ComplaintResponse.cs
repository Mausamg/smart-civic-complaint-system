namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class ComplaintResponse
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
    public string Location { get; init; } = string.Empty;

    public string? Subcategory { get; init; }

    public DateTime? ObservedAt { get; init; }

    public string? AffectedPeopleRange { get; init; }

    public bool? IsActive { get; init; }

    public string? Municipality { get; init; }

    public string? Ward { get; init; }

    public double? Latitude { get; init; }

    public double? Longitude { get; init; }
    public string Status { get; init; } = string.Empty;
    public string Priority { get; set; } = null!;
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public Guid SubmittedByUserId { get; init; }
    public Guid? AssignedToUserId { get; init; }
    public UserSummaryResponse? SubmittedBy { get; init; }
    public UserSummaryResponse? AssignedTo { get; init; }
}