using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Auth;
using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Dashboard;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CivicComplaintSystem.Tests.Integration;

[Collection("ComplaintDepartmentRoutingNonParallel")]
public class DashboardYearlyTrendSecurityTests
{
    [Fact]
    public async Task YearlyTrend_UsesRealData_AndEnforcesRolesAndStaffScope()
    {
        var options = PostgresTestDb.CreateOptions();

        await using (var setup = new AppDbContext(options))
            await setup.Database.MigrateAsync();

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

        var config = scope.ServiceProvider
            .GetRequiredService<IConfiguration>();

        var admin = await users.FindByEmailAsync(
            config["SeedAdmin:Email"]!);

        Assert.NotNull(admin);

        var ownerId = Guid.NewGuid();
        var staffId = Guid.NewGuid();
        var currentComplaintId = Guid.NewGuid();
        var previousComplaintId = Guid.NewGuid();
        var year = DateTime.UtcNow.Year;

        var owner = new ApplicationUser
        {
            Id = ownerId,
            UserName = $"year-owner-{ownerId}@test.local",
            Email = $"year-owner-{ownerId}@test.local",
            FirstName = "Year",
            LastName = "Owner",
            IsActive = true
        };

        var staff = new ApplicationUser
        {
            Id = staffId,
            UserName = $"year-staff-{staffId}@test.local",
            Email = $"year-staff-{staffId}@test.local",
            FirstName = "Year",
            LastName = "Staff",
            IsActive = true
        };

        var ownerCreated = false;
        var staffCreated = false;

        try
        {
            Assert.True((await users.CreateAsync(owner)).Succeeded);
            ownerCreated = true;

            Assert.True((await users.AddToRoleAsync(
                owner, AppRoles.Citizen)).Succeeded);

            Assert.True((await users.CreateAsync(staff)).Succeeded);
            staffCreated = true;

            Assert.True((await users.AddToRoleAsync(
                staff, AppRoles.Staff)).Succeeded);

            db.Complaints.AddRange(
                new Complaint
                {
                    Id = currentComplaintId,
                    Title = "Current year reporting test",
                    Description = "Test only",
                    Category = "Road",
                    Location = "Kathmandu",
                    CreatedAt = new DateTime(
                        year, 6, 15, 0, 0, 0, DateTimeKind.Utc),
                    SubmittedByUserId = ownerId,
                    AssignedToUserId = staffId,
                    Status = ComplaintStatus.Submitted
                },
                new Complaint
                {
                    Id = previousComplaintId,
                    Title = "Previous year reporting test",
                    Description = "Test only",
                    Category = "Road",
                    Location = "Kathmandu",
                    CreatedAt = new DateTime(
                        year - 1, 6, 15, 0, 0, 0, DateTimeKind.Utc),
                    SubmittedByUserId = ownerId,
                    Status = ComplaintStatus.Submitted
                }
            );

            await db.SaveChangesAsync();

            var adminToken = tokens.CreateToken(
                admin,
                await users.GetRolesAsync(admin));

            var ownerToken = tokens.CreateToken(
                owner,
                new[] { AppRoles.Citizen });

            var staffToken = tokens.CreateToken(
                staff,
                new[] { AppRoles.Staff });

            async Task<HttpResponseMessage> GetAsync(
                string? token)
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Get,
                    "/api/dashboard/yearly-trend");

                if (token is not null)
                    request.Headers.Authorization =
                        new AuthenticationHeaderValue(
                            "Bearer", token);

                return await client.SendAsync(request);
            }

            using (var anonymous = await GetAsync(null))
                Assert.Equal(
                    HttpStatusCode.Unauthorized,
                    anonymous.StatusCode);

            using (var citizen = await GetAsync(ownerToken))
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    citizen.StatusCode);

            using (var response = await GetAsync(adminToken))
            {
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);

                var data = await response.Content
                    .ReadFromJsonAsync<
                        List<DashboardYearlyTrendResponse>>();

                Assert.NotNull(data);
                Assert.Equal(5, data.Count);
                Assert.Equal(year - 4, data[0].Year);
                Assert.Equal(year, data[^1].Year);
                Assert.True(data.Single(
                    item => item.Year == year).Count >= 1);
                Assert.True(data.Single(
                    item => item.Year == year - 1).Count >= 1);
            }

            using (var response = await GetAsync(staffToken))
            {
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);

                var data = await response.Content
                    .ReadFromJsonAsync<
                        List<DashboardYearlyTrendResponse>>();

                Assert.NotNull(data);
                Assert.Equal(5, data.Count);
                Assert.Equal(
                    1,
                    data.Single(item => item.Year == year).Count);
                Assert.Equal(
                    0,
                    data.Single(item => item.Year == year - 1).Count);
            }
        }
        finally
        {
            await db.Complaints
                .Where(c =>
                    c.Id == currentComplaintId ||
                    c.Id == previousComplaintId)
                .ExecuteDeleteAsync();

            if (staffCreated)
                await users.DeleteAsync(staff);

            if (ownerCreated)
                await users.DeleteAsync(owner);
        }
    }
}
