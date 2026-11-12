using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Api.Features.Users.Staff;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Tests.Integration;

public sealed class StaffPerformanceReassignmentTests
{
    [Fact]
    public async Task Reassignment_AttributesWorkToCorrectStaff()
    {
        var options = PostgresTestDb.CreateOptions();

        await using var db = new AppDbContext(options);
        await db.Database.MigrateAsync();

        var complaintId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var staffAId = Guid.NewGuid();
        var staffBId = Guid.NewGuid();
        var adminId = Guid.NewGuid();

        var userIds = new[]
        {
            ownerId, staffAId, staffBId, adminId
        };

        ApplicationUser CreateUser(Guid id, string name) =>
            new ApplicationUser
            {
                Id = id,
                FirstName = name,
                LastName = "Test",
                UserName = $"performance-{id}@test.local",
                Email = $"performance-{id}@test.local",
                IsActive = true
            };

        var assignedAt = DateTime.UtcNow.AddHours(-4);

        try
        {
            db.Users.AddRange(
                CreateUser(ownerId, "Owner"),
                CreateUser(staffAId, "StaffA"),
                CreateUser(staffBId, "StaffB"),
                CreateUser(adminId, "Admin")
            );

            db.Complaints.Add(new Complaint
            {
                Id = complaintId,
                Title = "Reassignment test complaint",
                Description = "Temporary integration test.",
                Category = "Road",
                Location = "Pokhara",
                CreatedAt = assignedAt.AddMinutes(-30),
                SubmittedByUserId = ownerId,
                AssignedToUserId = staffBId,
                Status = ComplaintStatus.Resolved
            });

            db.ComplaintAssignmentHistories.AddRange(
                new ComplaintAssignmentHistory
                {
                    Id = Guid.NewGuid(),
                    ComplaintId = complaintId,
                    NewAssignedToUserId = staffAId,
                    ChangedByUserId = adminId,
                    ChangedAtUtc = assignedAt
                },
                new ComplaintAssignmentHistory
                {
                    Id = Guid.NewGuid(),
                    ComplaintId = complaintId,
                    OldAssignedToUserId = staffAId,
                    NewAssignedToUserId = staffBId,
                    ChangedByUserId = adminId,
                    ChangedAtUtc = assignedAt.AddMinutes(60)
                }
            );

            db.ComplaintComments.AddRange(
                new ComplaintComment
                {
                    Id = Guid.NewGuid(),
                    ComplaintId = complaintId,
                    CreatedByUserId = staffAId,
                    CreatedAtUtc = assignedAt.AddMinutes(15),
                    Message = "Initial investigation."
                },
                new ComplaintComment
                {
                    Id = Guid.NewGuid(),
                    ComplaintId = complaintId,
                    CreatedByUserId = staffBId,
                    CreatedAtUtc = assignedAt.AddMinutes(70),
                    Message = "Continuing investigation."
                }
            );

            db.ComplaintStatusHistories.Add(
                new ComplaintStatusHistory
                {
                    Id = Guid.NewGuid(),
                    ComplaintId = complaintId,
                    OldStatus = ComplaintStatus.InProgress,
                    NewStatus = ComplaintStatus.Resolved,
                    ChangedByUserId = staffBId,
                    ChangedAtUtc = assignedAt.AddMinutes(110)
                }
            );

            await db.SaveChangesAsync();

            var service = new StaffPerformanceService(db);

            var reportA = await service.GetAsync(staffAId);
            var reportB = await service.GetAsync(staffBId);

            // Staff A retains historical credit.
            Assert.Equal(0, reportA.CurrentlyAssigned);
            Assert.Equal(1, reportA.LifetimeAssigned);
            Assert.Equal(0, reportA.ResolvedByStaff);

            Assert.NotNull(reportA.AverageFirstActionMinutes);
            Assert.Equal(
                15d,
                reportA.AverageFirstActionMinutes.Value,
                2
            );

            Assert.Null(reportA.AverageResolutionMinutes);

            var activityA = Assert.Single(reportA.Assignments);

            Assert.False(activityA.IsCurrentlyAssigned);
            Assert.False(activityA.ResolvedByStaff);
            Assert.NotNull(activityA.ReassignedAtUtc);

            // PostgreSQL timestamps have microsecond precision.
            // Allow up to 1 ms for DateTime round-trip precision.
            Assert.InRange(
                Math.Abs(
                    (
                        activityA.ReassignedAtUtc.Value -
                        assignedAt.AddMinutes(60)
                    ).TotalMilliseconds
                ),
                0d,
                1d
            );

            // Staff B owns and resolves the complaint.
            Assert.Equal(1, reportB.CurrentlyAssigned);
            Assert.Equal(1, reportB.LifetimeAssigned);
            Assert.Equal(1, reportB.ResolvedByStaff);

            Assert.NotNull(reportB.AverageFirstActionMinutes);
            Assert.NotNull(reportB.AverageResolutionMinutes);

            Assert.Equal(
                10d,
                reportB.AverageFirstActionMinutes.Value,
                2
            );

            Assert.Equal(
                50d,
                reportB.AverageResolutionMinutes.Value,
                2
            );

            var activityB = Assert.Single(reportB.Assignments);

            Assert.True(activityB.IsCurrentlyAssigned);
            Assert.True(activityB.ResolvedByStaff);
            Assert.Null(activityB.ReassignedAtUtc);
        }
        finally
        {
            // Delete only records created by this test.
            await db.ComplaintComments
                .Where(c => c.ComplaintId == complaintId)
                .ExecuteDeleteAsync();

            await db.ComplaintStatusHistories
                .Where(h => h.ComplaintId == complaintId)
                .ExecuteDeleteAsync();

            await db.ComplaintAssignmentHistories
                .Where(h => h.ComplaintId == complaintId)
                .ExecuteDeleteAsync();

            await db.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteDeleteAsync();

            db.ChangeTracker.Clear();

            await db.Users
                .Where(u => userIds.Contains(u.Id))
                .ExecuteDeleteAsync();
        }
    }
}
