using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Departments;
using CivicComplaintSystem.Api.Features.Departments.Requests;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Tests.Integration;

public sealed class DepartmentDeletionTests
{
    [Fact]
    public async Task DeleteDepartment_ProtectsRelationshipsAndHistory()
    {
        var options = PostgresTestDb.CreateOptions();

        await using var db = new AppDbContext(options);
        await db.Database.MigrateAsync();

        var service = new DepartmentService(db);

        var suffix = Guid.NewGuid().ToString("N");
        var name = $"Delete Test {suffix}";
        var normalizedName = name.ToUpperInvariant();

        var userId = Guid.NewGuid();
        var complaintId = Guid.NewGuid();

        try
        {
            // Create a department with a category.
            var created = await service.CreateAsync(
                new CreateDepartmentRequest
                {
                    Name = name,
                    CategoryKeys = new List<string> { "water" }
                });

            Assert.Null(created.Error);
            Assert.NotNull(created.Department);

            var departmentId = created.Department.Id;

            // 1. Active departments cannot be deleted.
            var activeBlocked = await service.DeleteAsync(
                departmentId);

            Assert.False(activeBlocked.Deleted);
            Assert.True(activeBlocked.Conflict);

            // Deactivate before further deletion checks.
            var deactivated = await service.SetActiveAsync(
                departmentId, false);

            Assert.Null(deactivated.Error);
            Assert.NotNull(deactivated.Department);
            Assert.False(deactivated.Department.IsActive);

            // Create a temporary user.
            var email = $"delete-test-{suffix}@test.local";

            var user = new ApplicationUser
            {
                Id = userId,
                UserName = email,
                NormalizedUserName = email.ToUpperInvariant(),
                Email = email,
                NormalizedEmail = email.ToUpperInvariant(),
                FirstName = "Department",
                LastName = "DeleteTest",
                IsActive = true
            };

            db.Users.Add(user);
            await db.SaveChangesAsync();

            var department = await db.Departments
                .SingleAsync(d => d.Id == departmentId);

            // 2. A department head prevents deletion.
            department.HeadStaffUserId = userId;
            await db.SaveChangesAsync();

            var headBlocked = await service.DeleteAsync(
                departmentId);

            Assert.False(headBlocked.Deleted);
            Assert.True(headBlocked.Conflict);
            Assert.Contains(
                "head",
                headBlocked.Error!,
                StringComparison.OrdinalIgnoreCase);

            // 3. Assigned staff prevent deletion.
            department.HeadStaffUserId = null;
            user.DepartmentId = departmentId;
            await db.SaveChangesAsync();

            var staffBlocked = await service.DeleteAsync(
                departmentId);

            Assert.False(staffBlocked.Deleted);
            Assert.True(staffBlocked.Conflict);
            Assert.Contains(
                "staff",
                staffBlocked.Error!,
                StringComparison.OrdinalIgnoreCase);

            // 4. Even resolved complaints protect history.
            user.DepartmentId = null;
            await db.SaveChangesAsync();

            var complaint = new Complaint
            {
                Id = complaintId,
                Title = "Historical complaint test",
                Description = "Temporary deletion test",
                Category = "water",
                Location = "Test location",
                SubmittedByUserId = userId,
                DepartmentId = departmentId,
                Status = ComplaintStatus.Resolved
            };

            db.Complaints.Add(complaint);
            await db.SaveChangesAsync();

            var historyBlocked = await service.DeleteAsync(
                departmentId);

            Assert.False(historyBlocked.Deleted);
            Assert.True(historyBlocked.Conflict);
            Assert.Contains(
                "complaints",
                historyBlocked.Error!,
                StringComparison.OrdinalIgnoreCase);

            // Remove only this test's temporary complaint.
            db.Complaints.Remove(complaint);
            await db.SaveChangesAsync();

            // 5. Empty, inactive department can be deleted.
            var deleted = await service.DeleteAsync(
                departmentId);

            Assert.True(deleted.Deleted);
            Assert.Null(deleted.Error);
            Assert.False(deleted.Conflict);
            Assert.False(deleted.NotFound);

            // 6. Confirm deletion and category cascade.
            db.ChangeTracker.Clear();

            Assert.False(await db.Departments
                .AsNoTracking()
                .AnyAsync(d => d.Id == departmentId));

            Assert.False(await db.DepartmentCategories
                .AsNoTracking()
                .AnyAsync(c => c.DepartmentId == departmentId));

            // 7. Deleted departments return NotFound.
            var missing = await service.DeleteAsync(
                departmentId);

            Assert.True(missing.NotFound);
            Assert.False(missing.Deleted);
        }
        finally
        {
            // Clean up only this test's records, including
            // partial records if an assertion fails.
            db.ChangeTracker.Clear();

            await db.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteDeleteAsync();

            await db.Departments
                .Where(d => d.NormalizedName == normalizedName)
                .ExecuteUpdateAsync(
                    setters => setters.SetProperty(
                        d => d.HeadStaffUserId,
                        (Guid?)null));

            await db.Users
                .Where(u => u.Id == userId)
                .ExecuteUpdateAsync(
                    setters => setters.SetProperty(
                        u => u.DepartmentId,
                        (Guid?)null));

            await db.Users
                .Where(u => u.Id == userId)
                .ExecuteDeleteAsync();

            await db.Departments
                .Where(d => d.NormalizedName == normalizedName)
                .ExecuteDeleteAsync();
        }
    }
}
