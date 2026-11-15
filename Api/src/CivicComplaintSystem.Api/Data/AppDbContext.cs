using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Departments;
using CivicComplaintSystem.Api.Features.Announcements;
using CivicComplaintSystem.Api.Features.Complaints.Attachments;
using CivicComplaintSystem.Api.Features.Notifications;
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

    public DbSet<Announcement> Announcements =>
        Set<Announcement>();

    public DbSet<AnnouncementRead> AnnouncementReads =>
        Set<AnnouncementRead>();

    public DbSet<Department> Departments =>
        Set<Department>();

    public DbSet<DepartmentCategory> DepartmentCategories =>
        Set<DepartmentCategory>();

    public DbSet<ComplaintStatusHistory> ComplaintStatusHistories =>
        Set<ComplaintStatusHistory>();

    public DbSet<ComplaintAssignmentHistory> ComplaintAssignmentHistories =>
        Set<ComplaintAssignmentHistory>();

    public DbSet<ComplaintComment> ComplaintComments =>
        Set<ComplaintComment>();

    public DbSet<Notification> Notifications =>
        Set<Notification>();

    public DbSet<ComplaintAttachment> ComplaintAttachments =>
        Set<ComplaintAttachment>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);


        builder.Entity<AnnouncementRead>()
            .HasKey(r => new
            {
                r.UserId,
                r.AnnouncementId
            });

        builder.Entity<AnnouncementRead>()
            .HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<AnnouncementRead>()
            .HasOne(r => r.Announcement)
            .WithMany()
            .HasForeignKey(r => r.AnnouncementId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Announcement>()
            .Property(a => a.LocationScope)
            .HasDefaultValue("all");

        builder.Entity<Announcement>()
            .HasIndex(a => new
            {
                a.LocationScope,
                a.Country,
                a.Province,
                a.District,
                a.Municipality
            });

        builder.Entity<Announcement>()
            .HasOne(a => a.CreatedByUser)
            .WithMany()
            .HasForeignKey(a => a.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Announcement>()
            .HasIndex(a => new
            {
                a.IsPublished,
                a.PublishedAtUtc
            });

        builder.Entity<Department>()
            .HasIndex(d => d.NormalizedName)
            .IsUnique();

        builder.Entity<Department>()
            .HasOne(d => d.HeadStaffUser)
            .WithMany()
            .HasForeignKey(d => d.HeadStaffUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<ApplicationUser>()
            .HasOne(u => u.Department)
            .WithMany(d => d.StaffMembers)
            .HasForeignKey(u => u.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Complaint>()
            .HasOne(c => c.Department)
            .WithMany(d => d.Complaints)
            .HasForeignKey(c => c.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<DepartmentCategory>()
            .HasKey(dc => new
            {
                dc.DepartmentId,
                dc.CategoryKey
            });

        builder.Entity<DepartmentCategory>()
            .HasOne(dc => dc.Department)
            .WithMany(d => d.Categories)
            .HasForeignKey(dc => dc.DepartmentId)
            .OnDelete(DeleteBehavior.Cascade);

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

        builder.Entity<Notification>()
            .HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ComplaintAttachment>()
            .HasOne(a => a.Complaint)
            .WithMany(c => c.Attachments)
            .HasForeignKey(a => a.ComplaintId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ComplaintAttachment>()
            .HasOne(a => a.UploadedByUser)
            .WithMany()
            .HasForeignKey(a => a.UploadedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}