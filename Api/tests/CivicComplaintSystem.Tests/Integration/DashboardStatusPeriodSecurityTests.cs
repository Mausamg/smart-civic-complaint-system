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
public class DashboardStatusPeriodSecurityTests
{
    [Fact]
    public async Task StatusBreakdown_FiltersDates_AndEnforcesAccess()
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

        var adminToken = tokens.CreateToken(
            admin, await users.GetRolesAsync(admin));

        var ownerId = Guid.NewGuid();
        var staffId = Guid.NewGuid();

        var owner = new ApplicationUser
        {
            Id = ownerId,
            UserName = $"status-owner-{ownerId}@test.local",
            Email = $"status-owner-{ownerId}@test.local",
            FirstName = "Status",
            LastName = "Owner",
            IsActive = true
        };

        var staff = new ApplicationUser
        {
            Id = staffId,
            UserName = $"status-staff-{staffId}@test.local",
            Email = $"status-staff-{staffId}@test.local",
            FirstName = "Status",
            LastName = "Staff",
            IsActive = true
        };

        var fixtures = new (
            Guid Id,
            int DaysAgo,
            ComplaintStatus Status,
            Guid? Assignee
        )[]
        {
            (Guid.NewGuid(), 2, ComplaintStatus.Submitted, staffId),
            (Guid.NewGuid(), 20, ComplaintStatus.UnderReview, staffId),
            (Guid.NewGuid(), 100, ComplaintStatus.Resolved, staffId),
            (Guid.NewGuid(), 400, ComplaintStatus.Rejected, staffId),
            (Guid.NewGuid(), 2, ComplaintStatus.Submitted, null)
        };

        var ownerCreated = false;
        var staffCreated = false;

        async Task<HttpResponseMessage> SendAsync(
            string? token,
            string? period = null)
        {
            var suffix = period is null
                ? ""
                : $"?period={Uri.EscapeDataString(period)}";

            using var request = new HttpRequestMessage(
                HttpMethod.Get,
                $"/api/dashboard/status-breakdown{suffix}");

            if (token is not null)
            {
                request.Headers.Authorization =
                    new AuthenticationHeaderValue(
                        "Bearer", token);
            }

            return await client.SendAsync(request);
        }

        async Task<List<DashboardStatusResponse>> GetAsync(
            string token,
            string? period)
        {
            using var response = await SendAsync(token, period);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var data = await response.Content
                .ReadFromJsonAsync<List<DashboardStatusResponse>>();

            Assert.NotNull(data);
            return data;
        }

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

            var now = DateTime.UtcNow;

            foreach (var item in fixtures)
            {
                db.Complaints.Add(new Complaint
                {
                    Id = item.Id,
                    Title = "Status reporting integration test",
                    Description = "Test data only",
                    Category = "Road",
                    Location = "Kathmandu",
                    CreatedAt = now.AddDays(-item.DaysAgo),
                    SubmittedByUserId = ownerId,
                    AssignedToUserId = item.Assignee,
                    Status = item.Status
                });
            }

            await db.SaveChangesAsync();

            var staffToken = tokens.CreateToken(
                staff, new[] { AppRoles.Staff });

            var citizenToken = tokens.CreateToken(
                owner, new[] { AppRoles.Citizen });

            using (var response = await SendAsync(null, "weekly"))
                Assert.Equal(
                    HttpStatusCode.Unauthorized,
                    response.StatusCode);

            using (var response = await SendAsync(
                citizenToken, "monthly"))
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);

            using (var response = await SendAsync(
                adminToken, "fortnight"))
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);

            var weekly = await GetAsync(staffToken, "weekly");
            var monthly = await GetAsync(staffToken, "monthly");
            var yearly = await GetAsync(staffToken, "yearly");
            var allTime = await GetAsync(staffToken, null);

            Assert.Equal(1, weekly.Sum(x => x.Count));
            Assert.Equal(2, monthly.Sum(x => x.Count));
            Assert.Equal(3, yearly.Sum(x => x.Count));
            Assert.Equal(4, allTime.Sum(x => x.Count));

            Assert.Equal(
                1,
                weekly.Single(x => x.Status == "Submitted").Count);

            Assert.Equal(
                1,
                monthly.Single(x => x.Status == "UnderReview").Count);

            Assert.Equal(
                1,
                yearly.Single(x => x.Status == "Resolved").Count);

            Assert.Equal(
                1,
                allTime.Single(x => x.Status == "Rejected").Count);

            // Admin can see both recent complaints,
            // including the complaint with no staff assignment.
            var adminWeekly = await GetAsync(adminToken, "weekly");

            Assert.True(
                adminWeekly.Single(x => x.Status == "Submitted").Count
                >= 2);
        }
        finally
        {
            var ids = fixtures.Select(x => x.Id).ToArray();

            await db.Complaints
                .Where(c => ids.Contains(c.Id))
                .ExecuteDeleteAsync();

            if (staffCreated)
                await users.DeleteAsync(staff);

            if (ownerCreated)
                await users.DeleteAsync(owner);
        }
    }
}
