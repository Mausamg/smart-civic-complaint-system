namespace CivicComplaintSystem.Api.Features.Users.Staff.Responses;

public sealed class StaffResponse
{
    public Guid Id { get; init; }

    public string FirstName { get; init; } = string.Empty;

    public string LastName { get; init; } = string.Empty;

    public string Email { get; init; } = string.Empty;

    public bool IsActive { get; init; }

    public DateTimeOffset CreatedAtUtc { get; init; }
}

