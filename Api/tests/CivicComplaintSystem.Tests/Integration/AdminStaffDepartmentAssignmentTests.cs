using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Auth;
using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Departments;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Api.Features.Users.Staff.Responses;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CivicComplaintSystem.Tests.Integration;

[Collection("ComplaintDepartmentRoutingNonParallel")]
public sealed class AdminStaffDepartmentAssignmentTests
{
    [Fact]
    public async Task StaffDepartment_EnforcesSecurityAndConsistency()
    {
        await using (var setup = new AppDbContext(
            PostgresTestDb.CreateOptions()))
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
        var services = scope.ServiceProvider;

        var db = services.GetRequiredService<AppDbContext>();
        var users = services.GetRequiredService<UserManager<ApplicationUser>>();
        var tokens = services.GetRequiredService<JwtTokenService>();
        var config = services.GetRequiredService<IConfiguration>();

        var adminEmail = config["SeedAdmin:Email"];
        Assert.NotNull(adminEmail);

        var admin = await users.FindByEmailAsync(adminEmail);
        Assert.NotNull(admin);

        var adminRoles = await users.GetRolesAsync(admin);
        Assert.Contains(AppRoles.Admin, adminRoles);

        var adminToken = tokens.CreateToken(admin, adminRoles);

        var suffix = Guid.NewGuid().ToString("N");

        Department NewDepartment(string name, bool active = true)
        {
            var fullName = $"{name}-{suffix}";
            return new Department
            {
                Id = Guid.NewGuid(),
                Name = fullName,
                NormalizedName = fullName.ToUpperInvariant(),
                IsActive = active
            };
        }

        var roads = NewDepartment("Staff Roads");
        var water = NewDepartment("Staff Water");
        var inactive = NewDepartment("Staff Inactive", false);
        var departments = new[] { roads.Id, water.Id, inactive.Id };

        ApplicationUser NewUser(string name) => new()
        {
            Id = Guid.NewGuid(),
            UserName = $"{name}-{suffix}@test.local",
            Email = $"{name}-{suffix}@test.local",
            FirstName = name,
            LastName = "Tester",
            IsActive = true
        };

        var staff = NewUser("Staff");
        var citizen = NewUser("Citizen");
        var userIds = new[] { staff.Id, citizen.Id };
        var complaintId = Guid.NewGuid();

        async Task<HttpResponseMessage> PatchAsync(
            Guid staffId, Guid? departmentId, string? token)
        {
            using var request = new HttpRequestMessage(
                HttpMethod.Patch,
                $"/api/users/staff/{staffId}/department")
            {
                Content = JsonContent.Create(new { departmentId })
            };

            if (token is not null)
            {
                request.Headers.Authorization =
                    new AuthenticationHeaderValue("Bearer", token);
            }

            return await client.SendAsync(request);
        }

        async Task ExpectAsync(
            HttpStatusCode expected,
            Guid staffId,
            Guid? departmentId,
            string? token)
        {
            using var response = await PatchAsync(
                staffId, departmentId, token);

            Assert.Equal(expected, response.StatusCode);
        }

        try
        {
            db.Departments.AddRange(roads, water, inactive);
            await db.SaveChangesAsync();

            Assert.True((await users.CreateAsync(staff)).Succeeded);
            Assert.True((await users.CreateAsync(citizen)).Succeeded);
            Assert.True((await users.AddToRoleAsync(
                staff, AppRoles.Staff)).Succeeded);
            Assert.True((await users.AddToRoleAsync(
                citizen, AppRoles.Citizen)).Succeeded);

            db.Complaints.Add(new Complaint
            {
                Id = complaintId,
                Title = "Staff department security test",
                Description = "Temporary test complaint",
                Category = "potholes",
                Location = "Pokhara",
                SubmittedByUserId = citizen.Id,
                AssignedToUserId = staff.Id,
                DepartmentId = roads.Id,
                Status = ComplaintStatus.Submitted
            });

            await db.SaveChangesAsync();

            var citizenToken = tokens.CreateToken(
                citizen, new[] { AppRoles.Citizen });

            await ExpectAsync(HttpStatusCode.Unauthorized,
                staff.Id, roads.Id, null);

            await ExpectAsync(HttpStatusCode.Forbidden,
                staff.Id, roads.Id, citizenToken);

            await ExpectAsync(HttpStatusCode.NotFound,
                Guid.NewGuid(), roads.Id, adminToken);

            await ExpectAsync(HttpStatusCode.BadRequest,
                staff.Id, Guid.Empty, adminToken);

            await ExpectAsync(HttpStatusCode.NotFound,
                staff.Id, Guid.NewGuid(), adminToken);

            await ExpectAsync(HttpStatusCode.BadRequest,
                staff.Id, inactive.Id, adminToken);

            // Staff cannot move away from active complaint work.
            await ExpectAsync(HttpStatusCode.Conflict,
                staff.Id, water.Id, adminToken);

            // Clearing an already-null department is a no-op.
            await ExpectAsync(HttpStatusCode.OK,
                staff.Id, null, adminToken);

            Assert.Null((await db.Users.AsNoTracking()
                .SingleAsync(u => u.Id == staff.Id)).DepartmentId);

            // Matching department is permitted.
            using (var response = await PatchAsync(
                staff.Id, roads.Id, adminToken))
            {
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);

                var data = await response.Content
                    .ReadFromJsonAsync<StaffResponse>();

                Assert.NotNull(data);
                Assert.Equal<Guid?>(roads.Id, data.DepartmentId);
            }

            // Repeating the same department is harmless.
            await ExpectAsync(HttpStatusCode.OK,
                staff.Id, roads.Id, adminToken);

            // Clearing Roads while assigned active work is forbidden.
            await ExpectAsync(HttpStatusCode.Conflict,
                staff.Id, null, adminToken);

            // A conflicting department remains forbidden.
            await ExpectAsync(HttpStatusCode.Conflict,
                staff.Id, water.Id, adminToken);

            Assert.Equal<Guid?>(
                roads.Id,
                (await db.Users.AsNoTracking()
                    .SingleAsync(u => u.Id == staff.Id)).DepartmentId);

            // Verify that the staff directory exposes membership.
            using (var request = new HttpRequestMessage(
                HttpMethod.Get, "/api/users/staff"))
            {
                request.Headers.Authorization =
                    new AuthenticationHeaderValue(
                        "Bearer", adminToken);

                using var response = await client.SendAsync(request);
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);

                var directory = await response.Content
                    .ReadFromJsonAsync<List<StaffResponse>>();

                Assert.NotNull(directory);
                Assert.Equal<Guid?>(
                    roads.Id,
                    Assert.Single(directory,
                        u => u.Id == staff.Id).DepartmentId);
            }

            // Closing the complaint removes the active-work conflict.
            await db.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(
                        c => c.Status,
                        ComplaintStatus.Resolved));

            // Department heads must be replaced before moving.
            roads.HeadStaffUserId = staff.Id;
            await db.SaveChangesAsync();

            await ExpectAsync(HttpStatusCode.Conflict,
                staff.Id, water.Id, adminToken);

            roads.HeadStaffUserId = null;
            await db.SaveChangesAsync();

            await ExpectAsync(HttpStatusCode.OK,
                staff.Id, water.Id, adminToken);

            Assert.Equal<Guid?>(
                water.Id,
                (await db.Users.AsNoTracking()
                    .SingleAsync(u => u.Id == staff.Id)).DepartmentId);

            // Clearing membership is permitted without active conflicts.
            await ExpectAsync(HttpStatusCode.OK,
                staff.Id, null, adminToken);

            Assert.Null((await db.Users.AsNoTracking()
                .SingleAsync(u => u.Id == staff.Id)).DepartmentId);

            // Staff-department edits must not change complaint history.
            Assert.Equal(
                0,
                await db.ComplaintAssignmentHistories.CountAsync(
                    h => h.ComplaintId == complaintId));
        }
        finally
        {
            db.ChangeTracker.Clear();

            await db.Departments
                .Where(d => departments.Contains(d.Id))
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(
                        d => d.HeadStaffUserId,
                        (Guid?)null));

            await db.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteDeleteAsync();

            await db.UserRoles
                .Where(r => userIds.Contains(r.UserId))
                .ExecuteDeleteAsync();

            await db.Users
                .Where(u => userIds.Contains(u.Id))
                .ExecuteDeleteAsync();

            await db.Departments
                .Where(d => departments.Contains(d.Id))
                .ExecuteDeleteAsync();
        }
    }
}
