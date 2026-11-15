using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Departments;
using CivicComplaintSystem.Api.Features.Departments.Requests;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Tests.Integration;

public sealed class DepartmentStatusTests
{
    [Fact]
    public async Task DepartmentStatus_ProtectsStaffAndActiveComplaints()
    {
        var options = PostgresTestDb.CreateOptions();

        await using var db = new AppDbContext(options);

        await db.Database.MigrateAsync();

        var service = new DepartmentService(db);

        var suffix = Guid.NewGuid().ToString("N");
        var name = $"Status Test {suffix}";
        var normalizedName = name.ToUpperInvariant();

        var userId = Guid.NewGuid();
        var complaintId = Guid.NewGuid();

        try
        {
            // 1. Create a temporary department.
            var created = await service.CreateAsync(
                new CreateDepartmentRequest
                {
                    Name = name,
                    CategoryKeys = new List<string>
                    {
                        "water"
                    }
                });

            Assert.Null(created.Error);
            Assert.NotNull(created.Department);

            var departmentId = created.Department.Id;

            Assert.True(created.Department.IsActive);

            // 2. Deactivate an empty department.
            var disabled = await service.SetActiveAsync(
                departmentId, false);

            Assert.Null(disabled.Error);
            Assert.False(disabled.Conflict);
            Assert.False(disabled.NotFound);
            Assert.NotNull(disabled.Department);
            Assert.False(disabled.Department.IsActive);

            var disabledAt = disabled.Department.UpdatedAtUtc;

            Assert.NotNull(disabledAt);

            // 3. Repeating the same state is harmless.
            var repeated = await service.SetActiveAsync(
                departmentId, false);

            Assert.Null(repeated.Error);
            Assert.NotNull(repeated.Department);
            Assert.False(repeated.Department.IsActive);
            Assert.Equal(
                disabledAt,
                repeated.Department.UpdatedAtUtc);

            // 4. Reactivate the department.
            var enabled = await service.SetActiveAsync(
                departmentId, true);

            Assert.Null(enabled.Error);
            Assert.NotNull(enabled.Department);
            Assert.True(enabled.Department.IsActive);

            // 5. Assign a temporary user to this department.
            var email = $"department-status-{suffix}@test.local";

            var user = new ApplicationUser
            {
                Id = userId,
                UserName = email,
                NormalizedUserName = email.ToUpperInvariant(),
                Email = email,
                NormalizedEmail = email.ToUpperInvariant(),
                FirstName = "Department",
                LastName = "StatusTest",
                IsActive = true,
                DepartmentId = departmentId
            };

            db.Users.Add(user);
            await db.SaveChangesAsync();

            // 6. Staff assignment blocks deactivation.
            var staffBlocked = await service.SetActiveAsync(
                departmentId, false);

            Assert.True(staffBlocked.Conflict);
            Assert.False(staffBlocked.NotFound);
            Assert.Null(staffBlocked.Department);
            Assert.Contains(
                "staff",
                staffBlocked.Error!,
                StringComparison.OrdinalIgnoreCase);

            // 7. Remove staff membership.
            user.DepartmentId = null;
            await db.SaveChangesAsync();

            // 8. Add an unresolved complaint.
            db.Complaints.Add(new Complaint
            {
                Id = complaintId,
                Title = "Department status test complaint",
                Description = "Temporary integration test record",
                Category = "water",
                Location = "Test location",
                SubmittedByUserId = userId,
                DepartmentId = departmentId,
                Status = ComplaintStatus.Submitted
            });

            await db.SaveChangesAsync();

            // 9. Unresolved complaints block deactivation.
            var complaintBlocked = await service.SetActiveAsync(
                departmentId, false);

            Assert.True(complaintBlocked.Conflict);
            Assert.False(complaintBlocked.NotFound);
            Assert.Null(complaintBlocked.Department);
            Assert.Contains(
                "complaints",
                complaintBlocked.Error!,
                StringComparison.OrdinalIgnoreCase);

            // 10. Resolve the complaint.
            var complaint = await db.Complaints
                .SingleAsync(c => c.Id == complaintId);

            complaint.Status = ComplaintStatus.Resolved;

            await db.SaveChangesAsync();

            // 11. Resolved complaints do not block deactivation.
            var afterResolution = await service.SetActiveAsync(
                departmentId, false);

            Assert.Null(afterResolution.Error);
            Assert.False(afterResolution.Conflict);
            Assert.NotNull(afterResolution.Department);
            Assert.False(afterResolution.Department.IsActive);

            // 12. Unknown departments return NotFound.
            var missing = await service.SetActiveAsync(
                Guid.NewGuid(), false);

            Assert.True(missing.NotFound);
            Assert.Null(missing.Department);

            // 13. Confirm the final state in PostgreSQL.
            db.ChangeTracker.Clear();

            var stored = await service.GetByIdAsync(
                departmentId);

            Assert.NotNull(stored);
            Assert.False(stored.IsActive);
            Assert.Equal(0, stored.StaffCount);
            Assert.Equal(0, stored.ActiveComplaints);
        }
        finally
        {
            // Only delete records created by this test.
            db.ChangeTracker.Clear();

            await db.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteDeleteAsync();

            await db.Users
                .Where(u => u.Id == userId)
                .ExecuteDeleteAsync();

            await db.Departments
                .Where(d => d.NormalizedName == normalizedName)
                .ExecuteDeleteAsync();
        }
    }
}
