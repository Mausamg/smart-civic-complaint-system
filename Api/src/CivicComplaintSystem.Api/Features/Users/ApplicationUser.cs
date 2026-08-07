namespace CivicComplaintSystem.Api.Features.Users;
using Microsoft.AspNetCore.Identity;

public class ApplicationUser : IdentityUser<Guid>
{
    public string FirstName { get; set; }= string.Empty;
    
    public string LastName { get; set; }= string.Empty;
    
    public bool IsActive { get; set; }= true;
    
    public DateTimeOffset CreateAtUtc { get; set; } = DateTimeOffset.UtcNow;
}