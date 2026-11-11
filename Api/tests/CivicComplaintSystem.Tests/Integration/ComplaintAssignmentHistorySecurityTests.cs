using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Auth;
using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CivicComplaintSystem.Tests.Integration;

public class ComplaintAssignmentHistorySecurityTests
{
    [Fact]
    public async Task AssignmentHistory_RequiresComplaintAccess()
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

        var adminEmail = config["SeedAdmin:Email"];
        Assert.NotNull(adminEmail);

        var admin = await users.FindByEmailAsync(adminEmail);
        Assert.NotNull(admin);

        var adminRoles = await users.GetRolesAsync(admin);
        Assert.Contains(AppRoles.Admin, adminRoles);

        var adminToken = tokens.CreateToken(
            admin, adminRoles);

        var complaintId = Guid.NewGuid();
        var historyId = Guid.NewGuid();

        var createdUsers = new List<ApplicationUser>();

        async Task<(Guid Id, string Token)> CreateUserAsync(
            string label,
            string role)
        {
            var id = Guid.NewGuid();

            var user = new ApplicationUser
            {
                Id = id,
                UserName = $"history-{id}@test.local",
                Email = $"history-{id}@test.local",
                FirstName = "History",
                LastName = label,
                IsActive = true
            };

            Assert.True(
                (await users.CreateAsync(user)).Succeeded);

            createdUsers.Add(user);

            Assert.True(
                (await users.AddToRoleAsync(
                    user, role)).Succeeded);

            return (
                id,
                tokens.CreateToken(
                    user, new[] { role })
            );
        }

        try
        {
            var owner = await CreateUserAsync(
                "Owner", AppRoles.Citizen);

            var stranger = await CreateUserAsync(
                "Stranger", AppRoles.Citizen);

            var oldStaff = await CreateUserAsync(
                "FormerStaff", AppRoles.Staff);

            var currentStaff = await CreateUserAsync(
                "CurrentStaff", AppRoles.Staff);

            db.Complaints.Add(new Complaint
            {
                Id = complaintId,
                Title = "Broken streetlight",
                Description = "Assignment history test",
                Category = "Infrastructure",
                Location = "Pokhara",
                SubmittedByUserId = owner.Id,
                AssignedToUserId = currentStaff.Id,
                Status = ComplaintStatus.InProgress
            });

            db.ComplaintAssignmentHistories.Add(
                new ComplaintAssignmentHistory
                {
                    Id = historyId,
                    ComplaintId = complaintId,
                    OldAssignedToUserId = oldStaff.Id,
                    NewAssignedToUserId = currentStaff.Id,
                    ChangedByUserId = admin.Id,
                    ChangedAtUtc = DateTime.UtcNow,
                    Note = "Reassigned to current staff."
                });

            await db.SaveChangesAsync();

            async Task<HttpResponseMessage> GetHistoryAsync(
                Guid id,
                string? token)
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Get,
                    $"/api/complaints/{id}/assignment-history");

                if (token is not null)
                {
                    request.Headers.Authorization =
                        new AuthenticationHeaderValue(
                            "Bearer", token);
                }

                return await client.SendAsync(request);
            }

            // Anonymous requests are rejected.
            using (var response = await GetHistoryAsync(
                complaintId, null))
            {
                Assert.Equal(
                    HttpStatusCode.Unauthorized,
                    response.StatusCode);
            }

            // Unrelated citizens cannot view history.
            using (var response = await GetHistoryAsync(
                complaintId, stranger.Token))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            // Previously assigned staff lose access.
            using (var response = await GetHistoryAsync(
                complaintId, oldStaff.Token))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            // Complaint owner can view assignment history.
            using (var response = await GetHistoryAsync(
                complaintId, owner.Token))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);

                var entries = await response.Content
                    .ReadFromJsonAsync<
                        List<ComplaintAssignmentHistoryResponse>>();

                Assert.NotNull(entries);

                var entry = Assert.Single(entries);

                Assert.Equal(historyId, entry.Id);
                Assert.Equal(
                    oldStaff.Id,
                    entry.OldAssignedToUserId);
                Assert.Equal(
                    currentStaff.Id,
                    entry.NewAssignedToUserId);
                Assert.Equal(
                    admin.Id,
                    entry.ChangedByUserId);
                Assert.Equal(
                    "Reassigned to current staff.",
                    entry.Note);
            }

            // Currently assigned staff can view history.
            using (var response = await GetHistoryAsync(
                complaintId, currentStaff.Token))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);
            }

            // Admin can view history.
            using (var response = await GetHistoryAsync(
                complaintId, adminToken))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);
            }

            // Unknown complaints return NotFound.
            using (var response = await GetHistoryAsync(
                Guid.NewGuid(), adminToken))
            {
                Assert.Equal(
                    HttpStatusCode.NotFound,
                    response.StatusCode);
            }
        }
        finally
        {
            await db.ComplaintAssignmentHistories
                .Where(h => h.ComplaintId == complaintId)
                .ExecuteDeleteAsync();

            await db.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteDeleteAsync();

            // ExecuteDeleteAsync bypasses EF's change tracker.
            // Clear tracked relationships before deleting users.
            db.ChangeTracker.Clear();

            foreach (var user in createdUsers
                .AsEnumerable().Reverse())
            {
                await users.DeleteAsync(user);
            }
        }
    }
}
