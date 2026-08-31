using System.Text.Json.Serialization;

namespace CivicComplaintSystem.Api.Features.Users.Staff.Requests;

public sealed class UpdateStaffStatusRequest
{
    [JsonRequired]
    public bool IsActive { get; set; }
}