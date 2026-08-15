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

    public DbSet<ComplaintAssignmentHistory> ComplaintAssignmentHistories =>
        Set<ComplaintAssignmentHistory>();

    public DbSet<ComplaintComment> ComplaintComments =>
        Set<ComplaintComment>();

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

        builder.Entity<ComplaintAssignmentHistory>()
            .HasOne(h => h.Complaint)
            .WithMany(c => c.AssignmentHistory)
            .HasForeignKey(h => h.ComplaintId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ComplaintAssignmentHistory>()
            .HasOne(h => h.OldAssignedToUser)
            .WithMany()
            .HasForeignKey(h => h.OldAssignedToUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<ComplaintAssignmentHistory>()
            .HasOne(h => h.NewAssignedToUser)
            .WithMany()
            .HasForeignKey(h => h.NewAssignedToUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<ComplaintAssignmentHistory>()
            .HasOne(h => h.ChangedByUser)
            .WithMany()
            .HasForeignKey(h => h.ChangedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<ComplaintComment>()
            .HasOne(c => c.Complaint)
            .WithMany(c => c.Comments)
            .HasForeignKey(c => c.ComplaintId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ComplaintComment>()
            .HasOne(c => c.CreatedByUser)
            .WithMany()
            .HasForeignKey(c => c.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}