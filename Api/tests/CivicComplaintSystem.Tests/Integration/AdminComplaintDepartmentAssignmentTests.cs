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
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CivicComplaintSystem.Tests.Integration;

[Collection("ComplaintDepartmentRoutingNonParallel")]
public sealed class AdminComplaintDepartmentAssignmentTests
{
    [Fact]
    public async Task DepartmentAssignment_EnforcesSecurityAndConsistency()
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

        Department MakeDepartment(string name, bool active = true)
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

        var roads = MakeDepartment("Assignment Roads");
        var waste = MakeDepartment("Assignment Waste");
        var inactive = MakeDepartment("Assignment Inactive", false);

        var departmentIds = new[]
        {
            roads.Id, waste.Id, inactive.Id
        };

        ApplicationUser MakeUser(string name) => new()
        {
            Id = Guid.NewGuid(),
            UserName = $"{name}-{suffix}@test.local",
            Email = $"{name}-{suffix}@test.local",
            FirstName = name,
            LastName = "Tester",
            IsActive = true
        };

        var citizen = MakeUser("Citizen");
        var staff = MakeUser("Staff");
        staff.DepartmentId = roads.Id;

        var complaintId = Guid.NewGuid();
        var closedId = Guid.NewGuid();
        var createdUsers = new List<ApplicationUser>();

        async Task<HttpResponseMessage> PatchAsync(
            Guid id, string? token, Guid? departmentId)
        {
            using var request = new HttpRequestMessage(
                HttpMethod.Patch,
                $"/api/complaints/{id}/department")
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
            Guid id,
            string? token,
            Guid? departmentId)
        {
            using var response = await PatchAsync(
                id, token, departmentId);

            Assert.Equal(expected, response.StatusCode);
        }

        async Task<Complaint> LoadAsync() =>
            await db.Complaints
                .AsNoTracking()
                .SingleAsync(c => c.Id == complaintId);

        try
        {
            db.Departments.AddRange(roads, waste, inactive);
            await db.SaveChangesAsync();

            async Task CreateUserAsync(
                ApplicationUser user, string role)
            {
                var result = await users.CreateAsync(user);

                Assert.True(
                    result.Succeeded,
                    string.Join(", ",
                        result.Errors.Select(e => e.Description)));

                createdUsers.Add(user);

                Assert.True(
                    (await users.AddToRoleAsync(user, role)).Succeeded);
            }

            await CreateUserAsync(citizen, AppRoles.Citizen);
            await CreateUserAsync(staff, AppRoles.Staff);

            Complaint NewComplaint(Guid id, ComplaintStatus status) =>
                new()
                {
                    Id = id,
                    Title = "Department reassignment test",
                    Description = "Testing department assignment",
                    Category = "potholes",
                    Location = "Pokhara",
                    SubmittedByUserId = citizen.Id,
                    Status = status
                };

            db.Complaints.AddRange(
                NewComplaint(complaintId, ComplaintStatus.Submitted),
                NewComplaint(closedId, ComplaintStatus.Resolved));

            await db.SaveChangesAsync();

            var citizenToken = tokens.CreateToken(
                citizen, new[] { AppRoles.Citizen });

            var staffToken = tokens.CreateToken(
                staff, new[] { AppRoles.Staff });

            // Authentication and role authorization.
            await ExpectAsync(HttpStatusCode.Unauthorized,
                complaintId, null, roads.Id);

            await ExpectAsync(HttpStatusCode.Forbidden,
                complaintId, citizenToken, roads.Id);

            await ExpectAsync(HttpStatusCode.Forbidden,
                complaintId, staffToken, roads.Id);

            Assert.Null((await LoadAsync()).DepartmentId);

            // Invalid requests cannot change a complaint.
            await ExpectAsync(HttpStatusCode.BadRequest,
                complaintId, adminToken, null);

            await ExpectAsync(HttpStatusCode.BadRequest,
                complaintId, adminToken, Guid.Empty);

            await ExpectAsync(HttpStatusCode.NotFound,
                Guid.NewGuid(), adminToken, roads.Id);

            await ExpectAsync(HttpStatusCode.NotFound,
                complaintId, adminToken, Guid.NewGuid());

            await ExpectAsync(HttpStatusCode.BadRequest,
                complaintId, adminToken, inactive.Id);

            await ExpectAsync(HttpStatusCode.BadRequest,
                closedId, adminToken, roads.Id);

            Assert.Null((await LoadAsync()).DepartmentId);

            // Admin can assign an active department.
            await ExpectAsync(HttpStatusCode.OK,
                complaintId, adminToken, roads.Id);

            var assigned = await LoadAsync();
            Assert.Equal<Guid?>(roads.Id, assigned.DepartmentId);
            Assert.Equal("potholes", assigned.Category);
            Assert.Equal(ComplaintStatus.Submitted, assigned.Status);
            Assert.NotNull(assigned.UpdatedAt);

            // Verify the public complaint response includes
            // the actual saved department relationship.
            using (var request = new HttpRequestMessage(
                HttpMethod.Get,
                $"/api/complaints/{complaintId}"))
            {
                request.Headers.Authorization =
                    new AuthenticationHeaderValue(
                        "Bearer",
                        adminToken);

                using var response =
                    await client.SendAsync(request);

                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);

                using var json = JsonDocument.Parse(
                    await response.Content.ReadAsStringAsync());

                Assert.Equal(
                    roads.Id,
                    json.RootElement
                        .GetProperty("departmentId")
                        .GetGuid());

                Assert.Equal(
                    roads.Name,
                    json.RootElement
                        .GetProperty("departmentName")
                        .GetString());
            }

            // Duplicate assignment is rejected.
            await ExpectAsync(HttpStatusCode.BadRequest,
                complaintId, adminToken, roads.Id);

            // Unstaffed complaints may be moved between departments.
            await ExpectAsync(HttpStatusCode.OK,
                complaintId, adminToken, waste.Id);

            Assert.Equal<Guid?>(
                waste.Id, (await LoadAsync()).DepartmentId);

            await ExpectAsync(HttpStatusCode.OK,
                complaintId, adminToken, roads.Id);

            // Assign a staff member belonging to Roads.
            await db.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(c => c.AssignedToUserId, staff.Id));

            // Moving to Waste would leave a mismatched staff member.
            await ExpectAsync(HttpStatusCode.BadRequest,
                complaintId, adminToken, waste.Id);

            var unchanged = await LoadAsync();
            Assert.Equal<Guid?>(roads.Id, unchanged.DepartmentId);
            Assert.Equal<Guid?>(staff.Id, unchanged.AssignedToUserId);

            // Matching staff + department is a valid assignment.
            await db.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(c => c.DepartmentId, (Guid?)null));

            await ExpectAsync(HttpStatusCode.OK,
                complaintId, adminToken, roads.Id);

            var finalComplaint = await LoadAsync();

            Assert.Equal<Guid?>(roads.Id, finalComplaint.DepartmentId);
            Assert.Equal<Guid?>(staff.Id, finalComplaint.AssignedToUserId);
            Assert.Equal("potholes", finalComplaint.Category);
        }
        finally
        {
            // Clean up only the temporary records from this test.
            await db.Complaints
                .Where(c => c.Id == complaintId || c.Id == closedId)
                .ExecuteDeleteAsync();

            foreach (var user in createdUsers.AsEnumerable().Reverse())
            {
                await users.DeleteAsync(user);
            }

            await db.Departments
                .Where(d => departmentIds.Contains(d.Id))
                .ExecuteDeleteAsync();
        }
    }
}
