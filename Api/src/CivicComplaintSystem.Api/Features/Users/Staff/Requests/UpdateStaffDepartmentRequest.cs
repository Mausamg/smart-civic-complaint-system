using System.Text.Json.Serialization;

namespace CivicComplaintSystem.Api.Features.Users.Staff.Requests;

public sealed class UpdateStaffDepartmentRequest
{
    [JsonRequired]
    public Guid? DepartmentId { get; set; }
}
