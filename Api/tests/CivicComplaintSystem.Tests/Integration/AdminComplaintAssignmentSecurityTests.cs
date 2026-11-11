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

public class AdminComplaintAssignmentSecurityTests
{
    [Fact]
    public async Task Assignment_EnforcesAdminAndStaffEligibility()
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

        var adminToken = tokens.CreateToken(admin, adminRoles);

        var ownerId = Guid.NewGuid();
        var staffId = Guid.NewGuid();
        var inactiveStaffId = Guid.NewGuid();

        var complaintId = Guid.NewGuid();
        var closedComplaintId = Guid.NewGuid();

        ApplicationUser NewUser(
            Guid id,
            bool isActive = true) => new()
        {
            Id = id,
            UserName = $"security-{id}@test.local",
            Email = $"security-{id}@test.local",
            FirstName = "Security",
            LastName = "Test",
            IsActive = isActive
        };

        var owner = NewUser(ownerId);
        var staff = NewUser(staffId);
        var inactiveStaff = NewUser(
            inactiveStaffId, false);

        var createdUsers = new List<ApplicationUser>();

        try
        {
            async Task CreateUserAsync(
                ApplicationUser user,
                string role)
            {
                Assert.True(
                    (await users.CreateAsync(user)).Succeeded);

                createdUsers.Add(user);

                Assert.True(
                    (await users.AddToRoleAsync(
                        user, role)).Succeeded);
            }

            await CreateUserAsync(owner, AppRoles.Citizen);
            await CreateUserAsync(staff, AppRoles.Staff);
            await CreateUserAsync(
                inactiveStaff, AppRoles.Staff);

            db.Complaints.AddRange(
                new Complaint
                {
                    Id = complaintId,
                    Title = "Broken streetlight",
                    Description = "Assignment test",
                    Category = "Infrastructure",
                    Location = "Pokhara",
                    SubmittedByUserId = ownerId,
                    Status = ComplaintStatus.Submitted
                },
                new Complaint
                {
                    Id = closedComplaintId,
                    Title = "Resolved complaint",
                    Description = "Terminal status test",
                    Category = "Infrastructure",
                    Location = "Pokhara",
                    SubmittedByUserId = ownerId,
                    Status = ComplaintStatus.Resolved
                });

            await db.SaveChangesAsync();

            var citizenToken = tokens.CreateToken(
                owner, new[] { AppRoles.Citizen });

            async Task<HttpResponseMessage> AssignAsync(
                Guid id,
                Guid selectedUserId,
                string? token)
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Patch,
                    $"/api/complaints/{id}/assign")
                {
                    Content = JsonContent.Create(new
                    {
                        staffUserId = selectedUserId
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

            // Anonymous requests are rejected.
            using (var response = await AssignAsync(
                complaintId, staffId, null))
            {
                Assert.Equal(
                    HttpStatusCode.Unauthorized,
                    response.StatusCode);
            }

            // Citizens cannot use Admin assignment APIs.
            using (var response = await AssignAsync(
                complaintId, staffId, citizenToken))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            // Admin cannot assign a Citizen as staff.
            using (var response = await AssignAsync(
                complaintId, ownerId, adminToken))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            // Admin cannot assign an inactive staff member.
            using (var response = await AssignAsync(
                complaintId, inactiveStaffId, adminToken))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            // Invalid attempts must not assign the complaint.
            var before = await db.Complaints
                .AsNoTracking()
                .SingleAsync(c => c.Id == complaintId);

            Assert.Null(before.AssignedToUserId);
            Assert.Equal(
                ComplaintStatus.Submitted,
                before.Status);

            Assert.Equal(
                0,
                await db.ComplaintAssignmentHistories
                    .CountAsync(
                        h => h.ComplaintId == complaintId));

            // Admin can assign an active staff member.
            using (var response = await AssignAsync(
                complaintId, staffId, adminToken))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);
            }

            var assigned = await db.Complaints
                .AsNoTracking()
                .SingleAsync(c => c.Id == complaintId);

            Assert.Equal(
                staffId,
                assigned.AssignedToUserId);

            Assert.Equal(
                ComplaintStatus.UnderReview,
                assigned.Status);

            var assignmentHistory =
                await db.ComplaintAssignmentHistories
                    .AsNoTracking()
                    .SingleAsync(
                        h => h.ComplaintId == complaintId);

            Assert.Equal(
                staffId,
                assignmentHistory.NewAssignedToUserId);

            Assert.Equal(
                admin.Id,
                assignmentHistory.ChangedByUserId);

            var statusHistory =
                await db.ComplaintStatusHistories
                    .AsNoTracking()
                    .SingleAsync(
                        h => h.ComplaintId == complaintId);

            Assert.Equal(
                ComplaintStatus.Submitted,
                statusHistory.OldStatus);

            Assert.Equal(
                ComplaintStatus.UnderReview,
                statusHistory.NewStatus);

            // Both staff and citizen should be notified.
            Assert.Equal(
                2,
                await db.Notifications.CountAsync(
                    n => n.ComplaintId == complaintId));

            // Duplicate assignment is rejected.
            using (var response = await AssignAsync(
                complaintId, staffId, adminToken))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            // Closed complaints cannot be assigned.
            using (var response = await AssignAsync(
                closedComplaintId, staffId, adminToken))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            Assert.Equal(
                1,
                await db.ComplaintAssignmentHistories
                    .CountAsync(
                        h => h.ComplaintId == complaintId));

            Assert.Equal(
                0,
                await db.ComplaintAssignmentHistories
                    .CountAsync(
                        h => h.ComplaintId ==
                            closedComplaintId));

            Assert.Equal(
                2,
                await db.Notifications.CountAsync(
                    n => n.ComplaintId == complaintId));

            var closed = await db.Complaints
                .AsNoTracking()
                .SingleAsync(c => c.Id == closedComplaintId);

            Assert.Null(closed.AssignedToUserId);
            Assert.Equal(
                ComplaintStatus.Resolved,
                closed.Status);
        }
        finally
        {
            var ids = new[]
            {
                complaintId,
                closedComplaintId
            };

            await db.Notifications
                .Where(n =>
                    n.ComplaintId.HasValue &&
                    ids.Contains(n.ComplaintId.Value))
                .ExecuteDeleteAsync();

            await db.ComplaintAssignmentHistories
                .Where(h => ids.Contains(h.ComplaintId))
                .ExecuteDeleteAsync();

            await db.ComplaintStatusHistories
                .Where(h => ids.Contains(h.ComplaintId))
                .ExecuteDeleteAsync();

            await db.Complaints
                .Where(c => ids.Contains(c.Id))
                .ExecuteDeleteAsync();

            foreach (var user in createdUsers
                .AsEnumerable().Reverse())
            {
                await users.DeleteAsync(user);
            }
        }
    }
}
