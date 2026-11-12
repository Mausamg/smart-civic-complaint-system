using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Departments;
using CivicComplaintSystem.Api.Features.Departments.Requests;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Tests.Integration;

public sealed class DepartmentUpdateTests
{
    [Fact]
    public async Task UpdateDepartment_ValidatesAndPersistsChanges()
    {
        var options = PostgresTestDb.CreateOptions();

        await using var db = new AppDbContext(options);
        await db.Database.MigrateAsync();

        var service = new DepartmentService(db);

        var suffix = Guid.NewGuid().ToString("N");

        var originalName = $"Department Original {suffix}";
        var updatedName = $"Department Updated {suffix}";
        var otherName = $"Department Other {suffix}";

        var cleanupNames = new[]
        {
            originalName.ToUpperInvariant(),
            updatedName.ToUpperInvariant(),
            otherName.ToUpperInvariant()
        };

        try
        {
            // 1. Create two temporary departments.
            var first = await service.CreateAsync(
                new CreateDepartmentRequest
                {
                    Name = originalName,
                    Description = "Original description",
                    ExpectedResolutionDays = 7,
                    CategoryKeys = new List<string>
                    {
                        "water",
                        "garbage"
                    }
                });

            Assert.Null(first.Error);
            Assert.NotNull(first.Department);

            var second = await service.CreateAsync(
                new CreateDepartmentRequest
                {
                    Name = otherName,
                    CategoryKeys = new List<string>
                    {
                        "potholes"
                    }
                });

            Assert.Null(second.Error);
            Assert.NotNull(second.Department);

            var id = first.Department.Id;
            var originalCreatedAt = first.Department.CreatedAtUtc;

            // 2. Update name, description, categories and settings.
            var updated = await service.UpdateAsync(
                id,
                new CreateDepartmentRequest
                {
                    Name = $"  {updatedName}  ",
                    Description = "Updated description",
                    ExpectedResolutionDays = 14,
                    CategoryKeys = new List<string>
                    {
                        "water",
                        "streetlights"
                    }
                });

            Assert.False(updated.Conflict);
            Assert.False(updated.NotFound);
            Assert.Null(updated.Error);
            Assert.NotNull(updated.Department);

            Assert.Equal(id, updated.Department.Id);
            Assert.Equal(updatedName, updated.Department.Name);
            Assert.Equal(
                "Updated description",
                updated.Department.Description);

            Assert.Equal(
                14,
                updated.Department.ExpectedResolutionDays);

            Assert.Equal(
                originalCreatedAt,
                updated.Department.CreatedAtUtc);

            Assert.NotNull(updated.Department.UpdatedAtUtc);

            Assert.Equal(
                new[] { "streetlights", "water" },
                updated.Department.CategoryKeys);

            // 3. Confirm changes really reached PostgreSQL.
            db.ChangeTracker.Clear();

            var stored = await db.Departments
                .AsNoTracking()
                .Include(d => d.Categories)
                .SingleAsync(d => d.Id == id);

            Assert.Equal(
                updatedName.ToUpperInvariant(),
                stored.NormalizedName);

            Assert.Equal(
                new[] { "streetlights", "water" },
                stored.Categories
                    .Select(c => c.CategoryKey)
                    .OrderBy(c => c)
                    .ToArray());

            // 4. Reject the name of another department.
            var duplicate = await service.UpdateAsync(
                id,
                new CreateDepartmentRequest
                {
                    Name = otherName.ToLowerInvariant()
                });

            Assert.True(duplicate.Conflict);
            Assert.False(duplicate.NotFound);
            Assert.Null(duplicate.Department);

            // 5. Reject an unknown staff member as head.
            var invalidHead = await service.UpdateAsync(
                id,
                new CreateDepartmentRequest
                {
                    Name = updatedName,
                    HeadStaffUserId = Guid.NewGuid()
                });

            Assert.NotNull(invalidHead.Error);
            Assert.Null(invalidHead.Department);

            // 6. Unknown departments return NotFound.
            var missing = await service.UpdateAsync(
                Guid.NewGuid(),
                new CreateDepartmentRequest
                {
                    Name = $"Missing Department {suffix}"
                });

            Assert.True(missing.NotFound);
            Assert.Null(missing.Department);

            // 7. Failed updates must not overwrite saved changes.
            db.ChangeTracker.Clear();

            var unchanged = await service.GetByIdAsync(id);

            Assert.NotNull(unchanged);
            Assert.Equal(updatedName, unchanged.Name);
            Assert.Equal(
                new[] { "streetlights", "water" },
                unchanged.CategoryKeys);
        }
        finally
        {
            // Remove only the uniquely named test departments.
            // Their category mappings cascade on deletion.
            db.ChangeTracker.Clear();

            await db.Departments
                .Where(d => cleanupNames.Contains(d.NormalizedName))
                .ExecuteDeleteAsync();
        }
    }
}
