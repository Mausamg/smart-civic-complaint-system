using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Auth;
using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Departments;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CivicComplaintSystem.Tests.Integration;

[CollectionDefinition(
    "ComplaintDepartmentRoutingNonParallel",
    DisableParallelization = true)]
public sealed class ComplaintDepartmentRoutingCollection
{
}

[Collection("ComplaintDepartmentRoutingNonParallel")]
public sealed class ComplaintDepartmentRoutingTests
{
    [Fact]
    public async Task CreateComplaint_RoutesOnlyToUniqueActiveDepartment()
    {
        var options = PostgresTestDb.CreateOptions();

        await using (var setup = new AppDbContext(options))
        {
            await setup.Database.MigrateAsync();
        }

        using var factory = new TestApiFactory();

        using var client = factory.CreateClient(
            new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost"),
                AllowAutoRedirect = false
            });

        using var scope = factory.Services.CreateScope();

        var db = scope.ServiceProvider
            .GetRequiredService<AppDbContext>();

        var users = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();

        var tokens = scope.ServiceProvider
            .GetRequiredService<JwtTokenService>();

        var suffix = Guid.NewGuid().ToString("N");
        var citizenId = Guid.NewGuid();

        var citizen = new ApplicationUser
        {
            Id = citizenId,
            UserName = $"routing-{suffix}@test.local",
            Email = $"routing-{suffix}@test.local",
            FirstName = "Routing",
            LastName = "Citizen",
            IsActive = true
        };

        Department MakeDepartment(
            string name,
            bool active = true)
        {
            var fullName = $"{name} {suffix}";

            return new Department
            {
                Id = Guid.NewGuid(),
                Name = fullName,
                NormalizedName = fullName.ToUpperInvariant(),
                IsActive = active
            };
        }

        var roads = MakeDepartment("Routing Roads");
        var inactiveWaste = MakeDepartment(
            "Routing Inactive Waste",
            active: false);

        var noiseA = MakeDepartment("Routing Noise A");
        var noiseB = MakeDepartment("Routing Noise B");

        var departments = new[]
        {
            roads,
            inactiveWaste,
            noiseA,
            noiseB
        };

        var departmentIds = departments
            .Select(department => department.Id)
            .ToArray();

        var citizenCreated = false;

        try
        {
            var userResult = await users.CreateAsync(citizen);

            citizenCreated = userResult.Succeeded;

            Assert.True(
                userResult.Succeeded,
                string.Join(
                    ", ",
                    userResult.Errors.Select(e => e.Description)));

            Assert.True(
                (await users.AddToRoleAsync(
                    citizen,
                    AppRoles.Citizen)).Succeeded);

            db.Departments.AddRange(departments);

            db.DepartmentCategories.AddRange(
                new DepartmentCategory
                {
                    DepartmentId = roads.Id,
                    CategoryKey = "potholes"
                },
                new DepartmentCategory
                {
                    DepartmentId = inactiveWaste.Id,
                    CategoryKey = "garbage"
                },
                new DepartmentCategory
                {
                    DepartmentId = noiseA.Id,
                    CategoryKey = "noise"
                },
                new DepartmentCategory
                {
                    DepartmentId = noiseB.Id,
                    CategoryKey = "noise"
                });

            await db.SaveChangesAsync();

            var token = tokens.CreateToken(
                citizen,
                new[] { AppRoles.Citizen });

            async Task<Complaint> CreateAndLoadAsync(
                string category)
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Post,
                    "/api/complaints")
                {
                    Content = JsonContent.Create(new
                    {
                        title = "Department routing integration test",
                        description =
                            "Testing automatic department assignment",
                        category,
                        location = "Pokhara",
                        municipality = "Pokhara Metropolitan City",
                        latitude = 28.2096,
                        longitude = 83.9856
                    })
                };

                request.Headers.Authorization =
                    new AuthenticationHeaderValue(
                        "Bearer",
                        token);

                using var response =
                    await client.SendAsync(request);

                Assert.Equal(
                    HttpStatusCode.Created,
                    response.StatusCode);

                using var json = JsonDocument.Parse(
                    await response.Content.ReadAsStringAsync());

                var complaintId = json.RootElement
                    .GetProperty("id")
                    .GetGuid();

                return await db.Complaints
                    .AsNoTracking()
                    .SingleAsync(c => c.Id == complaintId);
            }

            // 1. Unique active category mapping.
            var routed = await CreateAndLoadAsync(
                "  POTHOLES  ");

            Assert.Equal<Guid?>(
                roads.Id,
                routed.DepartmentId);

            Assert.Equal(
                ComplaintStatus.Submitted,
                routed.Status);

            // 2. Inactive departments must be ignored.
            var inactive = await CreateAndLoadAsync(
                "garbage");

            Assert.Null(inactive.DepartmentId);

            // 3. Multiple active matches are ambiguous.
            var ambiguous = await CreateAndLoadAsync(
                "noise");

            Assert.Null(ambiguous.DepartmentId);

            // 4. No configured department.
            var unmapped = await CreateAndLoadAsync(
                $"routing-unmapped-{suffix}");

            Assert.Null(unmapped.DepartmentId);

            // 5. The Roads department has exactly
            // one newly linked submitted complaint.
            var roadsActiveCount = await db.Complaints
                .AsNoTracking()
                .CountAsync(c =>
                    c.DepartmentId == roads.Id &&
                    c.Status == ComplaintStatus.Submitted);

            Assert.Equal(1, roadsActiveCount);
        }
        finally
        {
            // Clean up only records created by this test.
            await db.Complaints
                .Where(c =>
                    c.SubmittedByUserId == citizenId)
                .ExecuteDeleteAsync();

            await db.DepartmentCategories
                .Where(c =>
                    departmentIds.Contains(c.DepartmentId))
                .ExecuteDeleteAsync();

            await db.Departments
                .Where(d =>
                    departmentIds.Contains(d.Id))
                .ExecuteDeleteAsync();

            if (citizenCreated)
            {
                await users.DeleteAsync(citizen);
            }
        }
    }
}
