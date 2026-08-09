using CivicComplaintSystem.Api.Features.Users;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using CivicComplaintSystem.Api.Features.Complaints;

namespace CivicComplaintSystem.Api.Data;

public class AppDbContext
:IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public AppDbContext(
        DbContextOptions<AppDbContext> options)
        : base(options)
    {
        
    }
    public DbSet<Complaint> Complaints => Set<Complaint>();
}