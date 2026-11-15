namespace CivicComplaintSystem.Api.Features.Users;
using Microsoft.AspNetCore.Identity;
using CivicComplaintSystem.Api.Features.Departments;

public class ApplicationUser : IdentityUser<Guid>
{
    public string FirstName { get; set; }= string.Empty;
    
    public string LastName { get; set; }= string.Empty;
    
    public bool IsActive { get; set; }= true;
    
    public Guid? DepartmentId { get; set; }

    public Department? Department { get; set; }

    public DateTimeOffset CreateAtUtc { get; set; } = DateTimeOffset.UtcNow;
}