using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Complaints.Services;
using CivicComplaintSystem.Api.Features.Departments;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Tests.Integration;

[Collection("ComplaintDepartmentRoutingNonParallel")]
public sealed class ComplaintDepartmentEditRoutingTests
{
    [Fact]
    public async Task EditingCategory_ReassignsDepartmentSafely()
    {
        await using var db = new AppDbContext(
            PostgresTestDb.CreateOptions());

        await db.Database.MigrateAsync();

        var suffix = Guid.NewGuid().ToString("N");
        var citizenId = Guid.NewGuid();

        string Key(string name) => $"{name}-{suffix}";

        Department MakeDepartment(
            string name,
            bool active = true)
        {
            var fullName = $"{name}-{suffix}";

            return new Department
            {
                Id = Guid.NewGuid(),
                Name = fullName,
                NormalizedName = fullName.ToUpperInvariant(),
                IsActive = active
            };
        }

        var roads = MakeDepartment("Edit Roads");
        var waste = MakeDepartment("Edit Waste");
        var inactive = MakeDepartment("Edit Inactive", false);
        var duplicateA = MakeDepartment("Edit Duplicate A");
        var duplicateB = MakeDepartment("Edit Duplicate B");

        var departments = new[]
        {
            roads, waste, inactive, duplicateA, duplicateB
        };

        var departmentIds = departments
            .Select(d => d.Id)
            .ToArray();

        var citizen = new ApplicationUser
        {
            Id = citizenId,
            UserName = $"routing-edit-{suffix}@test.local",
            Email = $"routing-edit-{suffix}@test.local",
            FirstName = "Routing",
            LastName = "Tester",
            IsActive = true
        };

        db.Set<ApplicationUser>().Add(citizen);
        db.Departments.AddRange(departments);

        db.DepartmentCategories.AddRange(
            new DepartmentCategory
            {
                DepartmentId = roads.Id,
                CategoryKey = Key("roads")
            },
            new DepartmentCategory
            {
                DepartmentId = waste.Id,
                CategoryKey = Key("waste")
            },
            new DepartmentCategory
            {
                DepartmentId = inactive.Id,
                CategoryKey = Key("inactive")
            },
            new DepartmentCategory
            {
                DepartmentId = duplicateA.Id,
                CategoryKey = Key("duplicate")
            },
            new DepartmentCategory
            {
                DepartmentId = duplicateB.Id,
                CategoryKey = Key("duplicate")
            });

        try
        {
            await db.SaveChangesAsync();

            var service = new ComplaintCommandService(db);

            var complaint = await service.CreateAsync(
                citizenId,
                new CreateComplaintRequest
                {
                    Title = "Pothole complaint",
                    Description = "A pothole needs repair.",
                    Category = Key("roads"),
                    Location = "Pokhara",
                    Municipality = "Pokhara",
                    Latitude = 28.2096,
                    Longitude = 83.9856
                });

            // Creation must route to Roads.
            Assert.Equal<Guid?>(roads.Id, complaint.DepartmentId);

            async Task EditAsync(
                string? title = null,
                string? category = null)
            {
                await service.UpdateAsync(
                    complaint,
                    new UpdateComplaintRequest
                    {
                        Title = title,
                        Category = category
                    });
            }

            async Task<Guid?> SavedDepartmentAsync() =>
                await db.Complaints
                    .AsNoTracking()
                    .Where(c => c.Id == complaint.Id)
                    .Select(c => c.DepartmentId)
                    .SingleAsync();

            // A title edit must preserve the department.
            await EditAsync(title: "Updated pothole report");
            Assert.Equal<Guid?>(
                roads.Id,
                await SavedDepartmentAsync());

            // Changing only the category's case
            // must preserve the department.
            await EditAsync(
                category: Key("roads").ToUpperInvariant());

            Assert.Equal<Guid?>(
                roads.Id,
                await SavedDepartmentAsync());

            // Changing category moves the complaint.
            await EditAsync(category: Key("waste"));
            Assert.Equal<Guid?>(
                waste.Id,
                await SavedDepartmentAsync());

            // An inactive department cannot receive it.
            await EditAsync(category: Key("inactive"));
            Assert.Null(await SavedDepartmentAsync());

            // Two active matching departments are ambiguous.
            await EditAsync(category: Key("duplicate"));
            Assert.Null(await SavedDepartmentAsync());

            // An unmapped category remains unassigned.
            await EditAsync(category: Key("unknown"));
            Assert.Null(await SavedDepartmentAsync());

            // Route it back to Roads.
            await EditAsync(category: Key("roads"));
            Assert.Equal<Guid?>(
                roads.Id,
                await SavedDepartmentAsync());

            // Verify the active submitted complaint count.
            var count = await db.Complaints
                .AsNoTracking()
                .CountAsync(c =>
                    c.DepartmentId == roads.Id &&
                    c.Status == ComplaintStatus.Submitted);

            Assert.Equal(1, count);
        }
        finally
        {
            // Delete only this test's temporary records.
            await db.Complaints
                .Where(c => c.SubmittedByUserId == citizenId)
                .ExecuteDeleteAsync();

            await db.DepartmentCategories
                .Where(c =>
                    departmentIds.Contains(c.DepartmentId))
                .ExecuteDeleteAsync();

            await db.Departments
                .Where(d => departmentIds.Contains(d.Id))
                .ExecuteDeleteAsync();

            await db.Set<ApplicationUser>()
                .Where(u => u.Id == citizenId)
                .ExecuteDeleteAsync();
        }
    }
}
