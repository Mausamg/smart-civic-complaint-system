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

public class StaffComplaintCommentAccessTests
{
    [Fact]
    public async Task Staff_LosesCommentAccessAfterReassignment()
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

        async Task<(Guid Id, string Token)> CreateTestUser(
            string label, string role)
        {
            var id = Guid.NewGuid();

            var user = new ApplicationUser
            {
                Id = id,
                UserName = $"{label}-{id}@test.local",
                Email = $"{label}-{id}@test.local",
                FirstName = "Test",
                LastName = label,
                IsActive = true
            };

            var result = await users.CreateAsync(user);
            Assert.True(result.Succeeded);
            createdUsers.Add(user);

            Assert.True((await users.AddToRoleAsync(
                user, role)).Succeeded);

            return (id, tokens.CreateToken(
                user, new[] { role }));
        }

        try
        {
            var owner = await CreateTestUser(
                "owner", AppRoles.Citizen);

            var staffA = await CreateTestUser(
                "staffA", AppRoles.Staff);

            var staffB = await CreateTestUser(
                "staffB", AppRoles.Staff);

            db.Complaints.Add(new Complaint
            {
                Id = complaintId,
                Title = "Broken streetlight",
                Description = "Streetlight needs repair",
                Category = "Infrastructure",
                Location = "Pokhara",
                SubmittedByUserId = owner.Id,
                AssignedToUserId = staffA.Id,
                Status = ComplaintStatus.InProgress
            });

            await db.SaveChangesAsync();

            var url = $"/api/complaints/{complaintId}/comments";

            // Staff A currently owns the assignment.
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue(
                    "Bearer", staffA.Token);

            using (var response = await client.GetAsync(url))
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using (var response = await client.PostAsJsonAsync(
                url, new { message = "Inspection scheduled." }))
                Assert.Equal(
                    HttpStatusCode.Created, response.StatusCode);

            // Reassign complaint from Staff A to Staff B.
            var updated = await db.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(
                        c => c.AssignedToUserId,
                        (Guid?)staffB.Id));

            Assert.Equal(1, updated);

            // Staff A must lose both read and write access.
            using (var response = await client.GetAsync(url))
                Assert.Equal(
                    HttpStatusCode.Forbidden, response.StatusCode);

            using (var response = await client.PostAsJsonAsync(
                url, new { message = "Unauthorized update" }))
                Assert.Equal(
                    HttpStatusCode.Forbidden, response.StatusCode);

            // The rejected message must not be saved.
            Assert.Equal(1, await db.ComplaintComments
                .CountAsync(c => c.ComplaintId == complaintId));

            // Staff B now has access.
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue(
                    "Bearer", staffB.Token);

            using (var response = await client.GetAsync(url))
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using (var response = await client.PostAsJsonAsync(
                url, new { message = "Repair is underway." }))
                Assert.Equal(
                    HttpStatusCode.Created, response.StatusCode);

            Assert.Equal(2, await db.ComplaintComments
                .CountAsync(c => c.ComplaintId == complaintId));

            // Citizen replies after reassignment to Staff B.
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue(
                    "Bearer", owner.Token);

            using (var response = await client.PostAsJsonAsync(
                url, new { message = "When will the repair finish?" }))
                Assert.Equal(
                    HttpStatusCode.Created, response.StatusCode);

            // Exactly one citizen-reply notification must exist.
            var staffNotification = await db.Notifications
                .AsNoTracking()
                .Where(n =>
                    n.ComplaintId == complaintId &&
                    n.Title == "New citizen reply")
                .SingleAsync();

            // Staff B receives it, not the previously assigned Staff A.
            Assert.Equal(staffB.Id, staffNotification.UserId);
            Assert.Equal((Guid?)complaintId,
                staffNotification.ComplaintId);
            Assert.False(staffNotification.IsRead);

            // Remove the assignment.
            var unassigned = await db.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(
                        c => c.AssignedToUserId,
                        (Guid?)null));

            Assert.Equal(1, unassigned);

            // Citizen can still reply to their own open complaint.
            using (var response = await client.PostAsJsonAsync(
                url, new { message = "Any further update?" }))
                Assert.Equal(
                    HttpStatusCode.Created, response.StatusCode);

            // An unassigned complaint must not notify any staff.
            Assert.Equal(1, await db.Notifications
                .CountAsync(n =>
                    n.ComplaintId == complaintId &&
                    n.Title == "New citizen reply"));

            Assert.Equal(4, await db.ComplaintComments
                .CountAsync(c => c.ComplaintId == complaintId));
        }
        finally
        {
            await db.Notifications
                .Where(n => n.ComplaintId == complaintId)
                .ExecuteDeleteAsync();

            await db.ComplaintComments
                .Where(c => c.ComplaintId == complaintId)
                .ExecuteDeleteAsync();

            await db.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteDeleteAsync();

            foreach (var user in createdUsers.AsEnumerable().Reverse())
                await users.DeleteAsync(user);
        }
    }
}
