using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Auth;
using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Api.Features.Users.Staff.Responses;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CivicComplaintSystem.Tests.Integration;

public class StaffPerformanceApiTests
{
    [Fact]
    public async Task Performance_RequiresAdmin_AndCalculatesRecordedTimes()
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

        var createdUsers = new List<ApplicationUser>();
        var complaintId = Guid.NewGuid();

        async Task<(ApplicationUser User, string Token)> CreateUserAsync(
            string role)
        {
            var id = Guid.NewGuid();

            var user = new ApplicationUser
            {
                Id = id,
                UserName = $"performance-{id}@test.local",
                Email = $"performance-{id}@test.local",
                FirstName = "Performance",
                LastName = "Tester",
                IsActive = true
            };

            Assert.True((await users.CreateAsync(user)).Succeeded);
            createdUsers.Add(user);

            Assert.True(
                (await users.AddToRoleAsync(user, role)).Succeeded);

            return (
                user,
                tokens.CreateToken(user, new[] { role })
            );
        }

        try
        {
            var owner = await CreateUserAsync(AppRoles.Citizen);
            var staff = await CreateUserAsync(AppRoles.Staff);

            var assignedAt = DateTime.UtcNow.AddHours(-2);

            db.Complaints.Add(new Complaint
            {
                Id = complaintId,
                Title = "Staff performance test complaint",
                Description = "Test complaint only",
                Category = "Road",
                Location = "Pokhara",
                CreatedAt = assignedAt.AddMinutes(-30),
                SubmittedByUserId = owner.User.Id,
                AssignedToUserId = staff.User.Id,
                Status = ComplaintStatus.Resolved
            });

            db.ComplaintAssignmentHistories.Add(
                new ComplaintAssignmentHistory
                {
                    Id = Guid.NewGuid(),
                    ComplaintId = complaintId,
                    NewAssignedToUserId = staff.User.Id,
                    ChangedByUserId = admin.Id,
                    ChangedAtUtc = assignedAt
                });

            db.ComplaintComments.Add(new ComplaintComment
            {
                Id = Guid.NewGuid(),
                ComplaintId = complaintId,
                CreatedByUserId = staff.User.Id,
                CreatedAtUtc = assignedAt.AddMinutes(10),
                Message = "Investigating the issue."
            });

            db.ComplaintStatusHistories.Add(
                new ComplaintStatusHistory
                {
                    Id = Guid.NewGuid(),
                    ComplaintId = complaintId,
                    OldStatus = ComplaintStatus.InProgress,
                    NewStatus = ComplaintStatus.Resolved,
                    ChangedByUserId = staff.User.Id,
                    ChangedAtUtc = assignedAt.AddMinutes(40)
                });

            await db.SaveChangesAsync();

            async Task<HttpResponseMessage> GetAsync(
                Guid staffId,
                string? token)
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Get,
                    $"/api/users/staff/{staffId}/performance");

                if (token is not null)
                {
                    request.Headers.Authorization =
                        new AuthenticationHeaderValue(
                            "Bearer", token);
                }

                return await client.SendAsync(request);
            }

            using (var anonymous = await GetAsync(
                staff.User.Id, null))
            {
                Assert.Equal(
                    HttpStatusCode.Unauthorized,
                    anonymous.StatusCode);
            }

            using (var citizen = await GetAsync(
                staff.User.Id, owner.Token))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    citizen.StatusCode);
            }

            using (var staffRequest = await GetAsync(
                staff.User.Id, staff.Token))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    staffRequest.StatusCode);
            }

            using (var missing = await GetAsync(
                Guid.NewGuid(), adminToken))
            {
                Assert.Equal(
                    HttpStatusCode.NotFound,
                    missing.StatusCode);
            }

            using (var response = await GetAsync(
                staff.User.Id, adminToken))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);

                var data = await response.Content
                    .ReadFromJsonAsync<StaffPerformanceResponse>();

                Assert.NotNull(data);
                Assert.Equal(staff.User.Id, data.StaffId);
                Assert.Equal(1, data.CurrentlyAssigned);
                Assert.Equal(1, data.LifetimeAssigned);
                Assert.Equal(1, data.ResolvedByStaff);

                Assert.NotNull(data.AverageFirstActionMinutes);
                Assert.NotNull(data.AverageResolutionMinutes);

                Assert.Equal(
                    10d, data.AverageFirstActionMinutes.Value, 2);

                Assert.Equal(
                    40d, data.AverageResolutionMinutes.Value, 2);

                var activity = Assert.Single(data.Assignments);

                Assert.Equal(complaintId, activity.ComplaintId);
                Assert.True(activity.IsCurrentlyAssigned);
                Assert.True(activity.ResolvedByStaff);
                Assert.Null(activity.ReassignedAtUtc);
            }
        }
        finally
        {
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

            foreach (var user in createdUsers.AsEnumerable().Reverse())
            {
                await users.DeleteAsync(user);
            }
        }
    }
}
