using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Departments;
using CivicComplaintSystem.Api.Features.Departments.Requests;
using CivicComplaintSystem.Api.Features.Departments.Responses;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Tests.Integration;

public sealed class DepartmentCreationTests
{
    [Fact]
    public async Task CreateDepartment_ValidatesAndPersistsData()
    {
        var options = PostgresTestDb.CreateOptions();

        await using var db = new AppDbContext(options);

        await db.Database.MigrateAsync();

        var service = new DepartmentService(db);

        var uniqueName = $"Department Test {Guid.NewGuid():N}";
        var normalizedName = uniqueName.ToUpperInvariant();

        try
        {
            // 1. Create a real department.
            var result = await service.CreateAsync(
                new CreateDepartmentRequest
                {
                    Name = $"  {uniqueName}  ",
                    Description = "Test department",
                    ExpectedResolutionDays = 7,
                    CategoryKeys = new List<string>
                    {
                        "water",
                        "garbage"
                    }
                });

            Assert.Null(result.Error);
            Assert.False(result.Conflict);

            var created = Assert.IsType<DepartmentResponse>(
                result.Department);

            Assert.Equal(uniqueName, created.Name);
            Assert.True(created.IsActive);
            Assert.Equal(7, created.ExpectedResolutionDays);
            Assert.Equal(0, created.StaffCount);
            Assert.Equal(0, created.ActiveComplaints);
            Assert.Null(created.AverageResolutionDays);

            Assert.Equal(
                new[] { "garbage", "water" },
                created.CategoryKeys);

            // 2. Verify the department exists in PostgreSQL.
            var persisted = await db.Departments
                .AsNoTracking()
                .SingleAsync(
                    d => d.Id == created.Id);

            Assert.Equal(
                normalizedName,
                persisted.NormalizedName);

            // 3. Verify the read service.
            var loaded = await service.GetByIdAsync(created.Id);

            Assert.NotNull(loaded);
            Assert.Equal(created.Id, loaded.Id);
            Assert.Equal(2, loaded.CategoryKeys.Count);

            var all = await service.GetAllAsync();

            Assert.Contains(
                all,
                d => d.Id == created.Id);

            // 4. Reject duplicate department names.
            var duplicate = await service.CreateAsync(
                new CreateDepartmentRequest
                {
                    Name = uniqueName.ToLowerInvariant()
                });

            Assert.True(duplicate.Conflict);
            Assert.Null(duplicate.Department);

            // 5. Reject unsupported categories.
            var invalidCategory = await service.CreateAsync(
                new CreateDepartmentRequest
                {
                    Name = $"Invalid Category {Guid.NewGuid():N}",
                    CategoryKeys = new List<string>
                    {
                        "unsupported_category"
                    }
                });

            Assert.NotNull(invalidCategory.Error);
            Assert.Null(invalidCategory.Department);

            // 6. Reject an unknown department head.
            var invalidHead = await service.CreateAsync(
                new CreateDepartmentRequest
                {
                    Name = $"Invalid Head {Guid.NewGuid():N}",
                    HeadStaffUserId = Guid.NewGuid()
                });

            Assert.NotNull(invalidHead.Error);
            Assert.Null(invalidHead.Department);
        }
        finally
        {
            // Remove only records belonging to this test.
            // DepartmentCategory records cascade on deletion.
            await db.Departments
                .Where(d => d.NormalizedName == normalizedName)
                .ExecuteDeleteAsync();

            db.ChangeTracker.Clear();
        }
    }
}
