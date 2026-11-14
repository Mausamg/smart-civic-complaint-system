namespace CivicComplaintSystem.Api.Features.Announcements.Responses;

public sealed class AnnouncementResponse
{
    public Guid Id { get; init; }

    public string Title { get; init; } = string.Empty;

    public string Body { get; init; } = string.Empty;

    public string Category { get; init; } = string.Empty;


    public string LocationScope { get; init; } = "all";

    public string? Country { get; init; }

    public string? Province { get; init; }

    public string? District { get; init; }

    public string? Municipality { get; init; }

    public string? Ward { get; init; }

    public bool IsFeatured { get; init; }

    public bool IsPublished { get; init; }

    public DateTime? PublishedAtUtc { get; init; }

    public DateTime? ExpiresAtUtc { get; init; }

    public DateTime CreatedAtUtc { get; init; }

    public DateTime? UpdatedAtUtc { get; init; }

    public string Author { get; init; } = string.Empty;
}
