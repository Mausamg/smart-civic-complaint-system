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
using Microsoft.Extensions.DependencyInjection;

namespace CivicComplaintSystem.Tests.Integration;

public class StaffComplaintStatusSecurityTests
{
    [Fact]
    public async Task StatusChanges_RequireCurrentStaffAssignment()
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

        var complaintId = Guid.NewGuid();
        var createdUsers = new List<ApplicationUser>();

        async Task<(Guid Id, string Token)> CreateUserAsync(
            string label, string role)
        {
            var id = Guid.NewGuid();

            var user = new ApplicationUser
            {
                Id = id,
                UserName = $"{label}-{id}@test.local",
                Email = $"{label}-{id}@test.local",
                FirstName = "Security",
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
                tokens.CreateToken(user, new[] { role })
            );
        }

        try
        {
            var owner = await CreateUserAsync(
                "owner", AppRoles.Citizen);

            var staffA = await CreateUserAsync(
                "staffA", AppRoles.Staff);

            var staffB = await CreateUserAsync(
                "staffB", AppRoles.Staff);

            db.Complaints.Add(new Complaint
            {
                Id = complaintId,
                Title = "Damaged road",
                Description = "Road needs inspection",
                Category = "Infrastructure",
                Location = "Pokhara",
                SubmittedByUserId = owner.Id,
                AssignedToUserId = staffA.Id,
                Status = ComplaintStatus.UnderReview
            });

            await db.SaveChangesAsync();

            async Task<HttpResponseMessage> PatchAsync(
                string? token,
                string status,
                string note)
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Patch,
                    $"/api/complaints/{complaintId}/status")
                {
                    Content = JsonContent.Create(new
                    {
                        status,
                        note
                    })
                };

                if (token is not null)
                {
                    request.Headers.Authorization =
                        new AuthenticationHeaderValue(
                            "Bearer", token);
                }

                return await client.SendAsync(request);
            }

            async Task<ComplaintStatus> SavedStatusAsync() =>
                await db.Complaints
                    .AsNoTracking()
                    .Where(c => c.Id == complaintId)
                    .Select(c => c.Status)
                    .SingleAsync();

            // Unauthenticated requests are rejected.
            using (var response = await PatchAsync(
                null, "InProgress", "Unauthorized"))
            {
                Assert.Equal(
                    HttpStatusCode.Unauthorized,
                    response.StatusCode);
            }

            // Citizens cannot change complaint status.
            using (var response = await PatchAsync(
                owner.Token, "InProgress", "Citizen"))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            // Unassigned Staff B cannot update it.
            using (var response = await PatchAsync(
                staffB.Token, "InProgress", "Wrong staff"))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            // Returning from UnderReview to Submitted is invalid.
            using (var response = await PatchAsync(
                staffA.Token, "Submitted", "Invalid regression"))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            Assert.Equal(
                ComplaintStatus.UnderReview,
                await SavedStatusAsync());

            Assert.Equal(
                0,
                await db.ComplaintStatusHistories
                    .CountAsync(
                        h => h.ComplaintId == complaintId));

            // Assigned Staff A can move to InProgress.
            using (var response = await PatchAsync(
                staffA.Token,
                "InProgress",
                "Inspection started"))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);
            }

            Assert.Equal(
                ComplaintStatus.InProgress,
                await SavedStatusAsync());

            // Reassign complaint to Staff B.
            var updated = await db.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(
                        c => c.AssignedToUserId,
                        (Guid?)staffB.Id));

            Assert.Equal(1, updated);

            // Previous Staff A immediately loses access.
            using (var response = await PatchAsync(
                staffA.Token, "Resolved", "Old staff"))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            // Newly assigned Staff B can resolve it.
            using (var response = await PatchAsync(
                staffB.Token,
                "Resolved",
                "Work completed"))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);
            }

            Assert.Equal(
                ComplaintStatus.Resolved,
                await SavedStatusAsync());

            // Terminal complaints cannot be reopened.
            using (var response = await PatchAsync(
                staffB.Token,
                "InProgress",
                "Attempt to reopen"))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            Assert.Equal(
                ComplaintStatus.Resolved,
                await SavedStatusAsync());

            // Only successful changes produce history.
            var history = await db.ComplaintStatusHistories
                .AsNoTracking()
                .Where(h => h.ComplaintId == complaintId)
                .OrderBy(h => h.ChangedAtUtc)
                .ToListAsync();

            Assert.Equal(2, history.Count);

            Assert.Contains(history, h =>
                h.ChangedByUserId == staffA.Id &&
                h.NewStatus == ComplaintStatus.InProgress &&
                h.Note == "Inspection started");

            Assert.Contains(history, h =>
                h.ChangedByUserId == staffB.Id &&
                h.NewStatus == ComplaintStatus.Resolved &&
                h.Note == "Work completed");

            // Only successful changes notify the citizen.
            Assert.Equal(
                2,
                await db.Notifications.CountAsync(n =>
                    n.ComplaintId == complaintId &&
                    n.UserId == owner.Id));
        }
        finally
        {
            await db.Notifications
                .Where(n => n.ComplaintId == complaintId)
                .ExecuteDeleteAsync();

            await db.ComplaintStatusHistories
                .Where(h => h.ComplaintId == complaintId)
                .ExecuteDeleteAsync();

            await db.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteDeleteAsync();

            foreach (var user in createdUsers
                .AsEnumerable().Reverse())
            {
                await users.DeleteAsync(user);
            }
        }
    }
}
