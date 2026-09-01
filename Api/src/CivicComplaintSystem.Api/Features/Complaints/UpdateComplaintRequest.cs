namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class UpdateComplaintRequest
{
    public string? Title { get; init; }

    public string? Description { get; init; }

    public string? Category { get; init; }

    public string? Location { get; init; }
}
