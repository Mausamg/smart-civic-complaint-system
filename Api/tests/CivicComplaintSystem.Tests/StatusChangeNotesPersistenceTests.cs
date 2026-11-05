using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Complaints.Services;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Tests.Services;

public class StatusChangeNotesPersistenceTests
{
    [Theory]
    [InlineData("  Inspection underway.  ", "Inspection underway.")]
    [InlineData("   ", null)]
    [InlineData(null, null)]
    public async Task UpdateStatusAsync_ShouldPersistNormalizedNote(
        string? inputNote,
        string? expectedNote)
    {
        var options = PostgresTestDb.CreateOptions();

        await using var context = new AppDbContext(options);
        await context.Database.MigrateAsync();

        await using var transaction =
            await context.Database.BeginTransactionAsync();

        var citizenId = Guid.NewGuid();
        var staffId = Guid.NewGuid();

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
                Title = "Damaged road",
                Description = "Road needs maintenance",
                Category = "Road",
                Location = "Kathmandu",
                Municipality = "Kathmandu Metropolitan City",
                Latitude = 27.7172,
                Longitude = 85.3240
            });

        await service.UpdateStatusAsync(
            complaint,
            ComplaintStatus.UnderReview,
            staffId,
            note: inputNote);

        var savedComplaint = await context.Complaints
            .AsNoTracking()
            .SingleAsync(c => c.Id == complaint.Id);

        var history = await context.ComplaintStatusHistories
            .AsNoTracking()
            .SingleAsync(h => h.ComplaintId == complaint.Id);

        Assert.Equal(
            ComplaintStatus.UnderReview,
            savedComplaint.Status);

        Assert.Equal(
            ComplaintStatus.Submitted,
            history.OldStatus);

        Assert.Equal(
            ComplaintStatus.UnderReview,
            history.NewStatus);

        Assert.Equal(expectedNote, history.Note);
        Assert.Equal(staffId, history.ChangedByUserId);
        Assert.True(history.ChangedAtUtc <= DateTime.UtcNow);

        await transaction.RollbackAsync();
    }
}
