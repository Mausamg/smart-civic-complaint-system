namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class CreateComplaintRequest
{
    public required string Title { get; init; }

    public required string Description { get; init; }

    public required string Category { get; init; }

    public required string Location { get; init; }
}