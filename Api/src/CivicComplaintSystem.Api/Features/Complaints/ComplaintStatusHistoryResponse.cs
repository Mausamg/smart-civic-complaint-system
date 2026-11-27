using System.Text.Json.Serialization;

namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class ComplaintStatusHistoryResponse
{
    public Guid Id { get; init; }

    public string OldStatus { get; init; } = string.Empty;

    public string NewStatus { get; init; } = string.Empty;

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Guid? ChangedByUserId { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ChangedByName { get; init; }

    public DateTime ChangedAtUtc { get; init; }

    public string? Note { get; init; }
}