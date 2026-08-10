using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Users;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Api.Data;

public class AppDbContext
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public AppDbContext(
        DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Complaint> Complaints =>
        Set<Complaint>();

    public DbSet<ComplaintStatusHistory> ComplaintStatusHistories =>
        Set<ComplaintStatusHistory>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ComplaintStatusHistory>()
            .HasOne(h => h.Complaint)
            .WithMany(c => c.StatusHistory)
            .HasForeignKey(h => h.ComplaintId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ComplaintStatusHistory>()
            .HasOne(h => h.ChangedByUser)
            .WithMany()
            .HasForeignKey(h => h.ChangedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}