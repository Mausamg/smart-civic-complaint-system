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

public class AdminComplaintPrioritySecurityTests
{
    [Fact]
    public async Task Priority_EnforcesAdminRoleAndStatusRules()
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

        var citizenId = Guid.NewGuid();
        var staffId = Guid.NewGuid();
        var openId = Guid.NewGuid();
        var closedId = Guid.NewGuid();

        ApplicationUser NewUser(Guid id) => new()
        {
            Id = id,
            UserName = $"priority-{id}@test.local",
            Email = $"priority-{id}@test.local",
            FirstName = "Priority",
            LastName = "Tester",
            IsActive = true
        };

        var citizen = NewUser(citizenId);
        var staff = NewUser(staffId);

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

            await CreateUserAsync(
                citizen, AppRoles.Citizen);

            await CreateUserAsync(
                staff, AppRoles.Staff);

            Complaint MakeComplaint(
                Guid id,
                ComplaintStatus status) => new()
            {
                Id = id,
                Title = "Priority security test",
                Description = "Testing priority permissions",
                Category = "Infrastructure",
                Location = "Pokhara",
                SubmittedByUserId = citizenId,
                Status = status,
                Priority = ComplaintPriority.Medium
            };

            db.Complaints.AddRange(
                MakeComplaint(
                    openId, ComplaintStatus.Submitted),
                MakeComplaint(
                    closedId, ComplaintStatus.Resolved));

            await db.SaveChangesAsync();

            var citizenToken = tokens.CreateToken(
                citizen, new[] { AppRoles.Citizen });

            var staffToken = tokens.CreateToken(
                staff, new[] { AppRoles.Staff });

            async Task<HttpResponseMessage> PatchPriorityAsync(
                Guid id,
                string? token,
                int? priority)
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Patch,
                    $"/api/complaints/{id}/priority")
                {
                    Content = JsonContent.Create(new
                    {
                        priority
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

            async Task<ComplaintPriority> SavedPriorityAsync(
                Guid id) =>
                await db.Complaints
                    .AsNoTracking()
                    .Where(c => c.Id == id)
                    .Select(c => c.Priority)
                    .SingleAsync();

            var high = (int)ComplaintPriority.High;

            // Anonymous users are rejected.
            using (var response = await PatchPriorityAsync(
                openId, null, high))
            {
                Assert.Equal(
                    HttpStatusCode.Unauthorized,
                    response.StatusCode);
            }

            // Citizens cannot update complaint priority.
            using (var response = await PatchPriorityAsync(
                openId, citizenToken, high))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            // Staff cannot use the Admin priority API.
            using (var response = await PatchPriorityAsync(
                openId, staffToken, high))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            // Missing and invalid priority values are rejected.
            using (var response = await PatchPriorityAsync(
                openId, adminToken, null))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            using (var response = await PatchPriorityAsync(
                openId, adminToken, 99))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            Assert.Equal(
                ComplaintPriority.Medium,
                await SavedPriorityAsync(openId));

            // Admin can update an open complaint.
            using (var response = await PatchPriorityAsync(
                openId, adminToken, high))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);
            }

            Assert.Equal(
                ComplaintPriority.High,
                await SavedPriorityAsync(openId));

            // Repeating the same priority is rejected.
            using (var response = await PatchPriorityAsync(
                openId, adminToken, high))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            // Resolved complaints cannot change priority.
            using (var response = await PatchPriorityAsync(
                closedId, adminToken, high))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            // Missing complaints return NotFound.
            using (var response = await PatchPriorityAsync(
                Guid.NewGuid(), adminToken, high))
            {
                Assert.Equal(
                    HttpStatusCode.NotFound,
                    response.StatusCode);
            }

            // Rejected operations must preserve saved values.
            Assert.Equal(
                ComplaintPriority.High,
                await SavedPriorityAsync(openId));

            Assert.Equal(
                ComplaintPriority.Medium,
                await SavedPriorityAsync(closedId));

            var open = await db.Complaints
                .AsNoTracking()
                .SingleAsync(c => c.Id == openId);

            Assert.Equal(
                ComplaintStatus.Submitted,
                open.Status);

            var closed = await db.Complaints
                .AsNoTracking()
                .SingleAsync(c => c.Id == closedId);

            Assert.Equal(
                ComplaintStatus.Resolved,
                closed.Status);
        }
        finally
        {
            var ids = new[] { openId, closedId };

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
