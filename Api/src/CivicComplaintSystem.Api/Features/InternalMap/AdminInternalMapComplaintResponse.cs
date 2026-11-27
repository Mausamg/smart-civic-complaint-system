namespace CivicComplaintSystem.Api.Features.InternalMap;

/// <summary>
/// Lightweight administrator-only complaint map record.
/// Contains exact incident coordinates and operational
/// filtering fields, without citizen identity information.
/// </summary>
public sealed class AdminInternalMapComplaintResponse
{
    public Guid Id { get; init; }

    public string Title { get; init; } = string.Empty;

    public string Category { get; init; } = string.Empty;

    public string Status { get; init; } = string.Empty;

    public string Priority { get; init; } = string.Empty;

    public string Location { get; init; } = string.Empty;

    public string? Municipality { get; init; }

    public string? Ward { get; init; }

    public Guid? DepartmentId { get; init; }

    public string? DepartmentName { get; init; }

    public bool IsAssigned { get; init; }

    public double Latitude { get; init; }

    public double Longitude { get; init; }

    public DateTime CreatedAt { get; init; }
}
