using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Complaints.Services;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Tests.Services;

public class ComplaintCommandServiceTests
{
    [Fact]
    public async Task CreateAsync_ShouldSaveComplaint()
    {
        var options = PostgresTestDb.CreateOptions();

        // Prepare schema using existing EF Core migrations
        await using (var setupContext = new AppDbContext(options))
        {
            await setupContext.Database.MigrateAsync();
        }

        await using var context = new AppDbContext(options);

        // Test data will be rolled back
        await using var transaction =
            await context.Database.BeginTransactionAsync();

        var citizenId = Guid.NewGuid();

        context.Users.Add(new ApplicationUser
        {
            Id = citizenId,
            UserName = $"citizen-{citizenId}@test.local",
            FirstName = "Test",
            LastName = "Citizen"
        });

        await context.SaveChangesAsync();

        var request = new CreateComplaintRequest
        {
            Title = "  Broken streetlight  ",
            Description = "Streetlight is not working",
            Category = "Streetlight",
            Location = "Kathmandu"
        };

        var service = new ComplaintCommandService(context);

        // Act: Execute real service method
        var result = await service.CreateAsync(
            citizenId, request);

        // Assert: Verify persisted database values
        var savedComplaint = await context.Complaints
            .AsNoTracking()
            .SingleAsync(c => c.Id == result.Id);

        Assert.NotEqual(Guid.Empty, savedComplaint.Id);
        Assert.Equal("Broken streetlight", savedComplaint.Title);
        Assert.Equal(ComplaintStatus.Submitted, savedComplaint.Status);
        Assert.Equal(citizenId, savedComplaint.SubmittedByUserId);
        Assert.Equal("Kathmandu", savedComplaint.Location);

        // Remove test data without affecting database schema
        await transaction.RollbackAsync();
    }


    [Fact]
    public async Task UpdateAsync_ShouldOnlyUpdateProvidedFields()
    {
        var options = PostgresTestDb.CreateOptions();

        await using var context = new AppDbContext(options);

        await context.Database.MigrateAsync();

        await using var transaction =
            await context.Database.BeginTransactionAsync();

        var citizenId = Guid.NewGuid();

        context.Users.Add(new ApplicationUser
        {
            Id = citizenId,
            UserName = $"citizen-{citizenId}@test.local",
            FirstName = "Test",
            LastName = "Citizen"
        });

        await context.SaveChangesAsync();

        var service = new ComplaintCommandService(context);

        var complaint = await service.CreateAsync(
            citizenId,
            new CreateComplaintRequest
            {
                Title = "Broken road",
                Description = "Road needs repair",
                Category = "Road",
                Location = "Kathmandu"
            });

        // Act: Update only the title
        await service.UpdateAsync(
            complaint,
            new UpdateComplaintRequest
            {
                Title = "  Damaged road near school  "
            });

        // Assert: Read the stored complaint
        var updated = await context.Complaints
            .AsNoTracking()
            .SingleAsync(c => c.Id == complaint.Id);

        Assert.Equal("Damaged road near school", updated.Title);
        Assert.Equal("Road needs repair", updated.Description);
        Assert.Equal("Road", updated.Category);
        Assert.Equal("Kathmandu", updated.Location);
        Assert.NotNull(updated.UpdatedAt);

        await transaction.RollbackAsync();
    }


    [Fact]
    public async Task AssignAsync_ShouldAssignStaffAndCreateHistory()
    {
        var options = PostgresTestDb.CreateOptions();

        await using var context = new AppDbContext(options);
        await context.Database.MigrateAsync();

        await using var transaction =
            await context.Database.BeginTransactionAsync();

        var citizenId = Guid.NewGuid();
        var staffId = Guid.NewGuid();
        var adminId = Guid.NewGuid();

        // Add users for foreign key relationships
        context.Users.AddRange(
            new ApplicationUser
            {
                Id = citizenId,
                UserName = $"citizen-{citizenId}@test.local"
            },
            new ApplicationUser
            {
                Id = staffId,
                UserName = $"staff-{staffId}@test.local"
            },
            new ApplicationUser
            {
                Id = adminId,
                UserName = $"admin-{adminId}@test.local"
            }
        );

        await context.SaveChangesAsync();

        var service = new ComplaintCommandService(context);

        var complaint = await service.CreateAsync(
            citizenId,
            new CreateComplaintRequest
            {
                Title = "Broken streetlight",
                Description = "Streetlight not working",
                Category = "Streetlight",
                Location = "Kathmandu"
            });

        // Act
        await service.AssignAsync(
            complaint,
            staffId,
            adminId);

        // Assert
        var savedComplaint = await context.Complaints
            .AsNoTracking()
            .SingleAsync(c => c.Id == complaint.Id);

        var assignmentHistory = await context.ComplaintAssignmentHistories
            .AsNoTracking()
            .SingleAsync(h => h.ComplaintId == complaint.Id);

        var statusHistory = await context.ComplaintStatusHistories
            .AsNoTracking()
            .SingleAsync(h => h.ComplaintId == complaint.Id);

        Assert.Equal(staffId, savedComplaint.AssignedToUserId);
        Assert.Equal(ComplaintStatus.UnderReview, savedComplaint.Status);

        Assert.Null(assignmentHistory.OldAssignedToUserId);
        Assert.Equal(staffId, assignmentHistory.NewAssignedToUserId);
        Assert.Equal(adminId, assignmentHistory.ChangedByUserId);

        Assert.Equal(ComplaintStatus.Submitted, statusHistory.OldStatus);
        Assert.Equal(ComplaintStatus.UnderReview, statusHistory.NewStatus);

        await transaction.RollbackAsync();
    }


    [Fact]
    public async Task AssignAsync_WhenHistoryFails_ShouldRollbackChanges()
    {
        var options = PostgresTestDb.CreateOptions();

        await using var context = new AppDbContext(options);
        await context.Database.MigrateAsync();

        await using var transaction =
            await context.Database.BeginTransactionAsync();

        var citizenId = Guid.NewGuid();
        var staffId = Guid.NewGuid();

        // This user deliberately does not exist in the database
        var invalidAdminId = Guid.NewGuid();

        context.Users.AddRange(
            new ApplicationUser
            {
                Id = citizenId,
                UserName = $"citizen-{citizenId}@test.local"
            },
            new ApplicationUser
            {
                Id = staffId,
                UserName = $"staff-{staffId}@test.local"
            }
        );

        await context.SaveChangesAsync();

        var service = new ComplaintCommandService(context);

        var complaint = await service.CreateAsync(
            citizenId,
            new CreateComplaintRequest
            {
                Title = "Broken streetlight",
                Description = "Light is not working",
                Category = "Streetlight",
                Location = "Kathmandu"
            });

        var complaintId = complaint.Id;

        // Act: Force a foreign key violation in history
        await Assert.ThrowsAsync<DbUpdateException>(() => service.AssignAsync(
            complaint,
            staffId,
            invalidAdminId));

        // Clear the in-memory tracked entities
        context.ChangeTracker.Clear();

        // Assert: Check what actually remains in PostgreSQL
        var savedComplaint = await context.Complaints
            .AsNoTracking()
            .SingleAsync(c => c.Id == complaintId);

        Assert.Equal(
            ComplaintStatus.Submitted,
            savedComplaint.Status);

        Assert.Null(savedComplaint.AssignedToUserId);

        Assert.Empty(await context.ComplaintAssignmentHistories
            .Where(h => h.ComplaintId == complaintId)
            .ToListAsync());

        Assert.Empty(await context.ComplaintStatusHistories
            .Where(h => h.ComplaintId == complaintId)
            .ToListAsync());

        await transaction.RollbackAsync();
    }
}