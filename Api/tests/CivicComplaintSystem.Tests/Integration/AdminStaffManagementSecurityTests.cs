using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Auth;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Api.Features.Users.Staff.Responses;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CivicComplaintSystem.Tests.Integration;

public sealed class AdminStaffManagementSecurityTests
{
    [Fact]
    public async Task StaffManagement_EnforcesAuthorization_AndPersistsValidChanges()
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

        var citizen = NewUser("citizen");
        var staff = NewUser("staff");

        var citizenCreated = false;
        var staffCreated = false;

        var newEmail =
            $"staff-management-{Guid.NewGuid():N}@test.local";

        var payload = new
        {
            firstName = "Security",
            lastName = "Tester",
            email = newEmail,
            password = "TestStaff!234"
        };

        const string url = "/api/users/staff";

        try
        {
            var result = await users.CreateAsync(citizen);
            Assert.True(result.Succeeded);
            citizenCreated = true;

            Assert.True((await users.AddToRoleAsync(
                citizen, AppRoles.Citizen)).Succeeded);

            result = await users.CreateAsync(staff);
            Assert.True(result.Succeeded);
            staffCreated = true;

            Assert.True((await users.AddToRoleAsync(
                staff, AppRoles.Staff)).Succeeded);

            var admin = await users.FindByEmailAsync(
                config["SeedAdmin:Email"]!);

            Assert.NotNull(admin);

            var adminRoles = await users.GetRolesAsync(admin);
            Assert.Contains(AppRoles.Admin, adminRoles);

            var adminToken = tokens.CreateToken(
                admin, adminRoles);

            var citizenToken = tokens.CreateToken(
                citizen, new[] { AppRoles.Citizen });

            var staffToken = tokens.CreateToken(
                staff, new[] { AppRoles.Staff });

            var statusUrl = $"{url}/{staff.Id}/status";

            // GET: only Admin may list staff.
            await ExpectAsync(
                HttpStatusCode.Unauthorized,
                client, HttpMethod.Get, url, null);

            await ExpectAsync(
                HttpStatusCode.Forbidden,
                client, HttpMethod.Get, url, citizenToken);

            await ExpectAsync(
                HttpStatusCode.Forbidden,
                client, HttpMethod.Get, url, staffToken);

            using (var response = await SendAsync(
                client, HttpMethod.Get, url, adminToken))
            {
                Assert.Equal(
                    HttpStatusCode.OK, response.StatusCode);

                var list = await response.Content
                    .ReadFromJsonAsync<List<StaffResponse>>();

                Assert.NotNull(list);
                Assert.Contains(list, x => x.Id == staff.Id);
            }

            // POST: unauthorized users cannot create staff.
            await ExpectAsync(
                HttpStatusCode.Unauthorized,
                client, HttpMethod.Post, url, null, payload);

            await ExpectAsync(
                HttpStatusCode.Forbidden,
                client, HttpMethod.Post, url,
                citizenToken, payload);

            await ExpectAsync(
                HttpStatusCode.Forbidden,
                client, HttpMethod.Post, url,
                staffToken, payload);

            Assert.False(await db.Users.AsNoTracking()
                .AnyAsync(u => u.Email == newEmail));

            // PATCH: unauthorized users cannot alter staff.
            var deactivate = new { isActive = false };

            await ExpectAsync(
                HttpStatusCode.Unauthorized,
                client, HttpMethod.Patch,
                statusUrl, null, deactivate);

            await ExpectAsync(
                HttpStatusCode.Forbidden,
                client, HttpMethod.Patch,
                statusUrl, citizenToken, deactivate);

            await ExpectAsync(
                HttpStatusCode.Forbidden,
                client, HttpMethod.Patch,
                statusUrl, staffToken, deactivate);

            Assert.True(await db.Users.AsNoTracking()
                .Where(u => u.Id == staff.Id)
                .Select(u => u.IsActive)
                .SingleAsync());

            // Admin successfully creates a staff account.
            Guid newStaffId;

            using (var response = await SendAsync(
                client, HttpMethod.Post,
                url, adminToken, payload))
            {
                Assert.Equal(
                    HttpStatusCode.Created,
                    response.StatusCode);

                var created = await response.Content
                    .ReadFromJsonAsync<StaffResponse>();

                Assert.NotNull(created);
                Assert.Equal(newEmail, created.Email);
                Assert.True(created.IsActive);

                newStaffId = created.Id;
            }

            var newStaff = await users.FindByEmailAsync(
                newEmail);

            Assert.NotNull(newStaff);
            Assert.Equal(newStaffId, newStaff.Id);

            Assert.True(await users.IsInRoleAsync(
                newStaff, AppRoles.Staff));

            // Duplicate email must not create another user.
            await ExpectAsync(
                HttpStatusCode.Conflict,
                client, HttpMethod.Post,
                url, adminToken, payload);

            Assert.Equal(1, await db.Users.AsNoTracking()
                .CountAsync(u => u.Email == newEmail));

            var newStatusUrl =
                $"{url}/{newStaffId}/status";

            // Missing required IsActive must return 400.
            await ExpectAsync(
                HttpStatusCode.BadRequest,
                client, HttpMethod.Patch,
                newStatusUrl, adminToken, new { });

            Assert.True(await db.Users.AsNoTracking()
                .Where(u => u.Id == newStaffId)
                .Select(u => u.IsActive)
                .SingleAsync());

            // Unknown staff account must return 404.
            await ExpectAsync(
                HttpStatusCode.NotFound,
                client, HttpMethod.Patch,
                $"{url}/{Guid.NewGuid()}/status",
                adminToken, deactivate);

            // Admin deactivates the new staff account.
            await ExpectAsync(
                HttpStatusCode.OK,
                client, HttpMethod.Patch,
                newStatusUrl, adminToken, deactivate);

            Assert.False(await db.Users.AsNoTracking()
                .Where(u => u.Id == newStaffId)
                .Select(u => u.IsActive)
                .SingleAsync());

            // Inactive staff appear in the filtered list.
            using (var response = await SendAsync(
                client, HttpMethod.Get,
                $"{url}?isActive=false", adminToken))
            {
                Assert.Equal(
                    HttpStatusCode.OK, response.StatusCode);

                var inactive = await response.Content
                    .ReadFromJsonAsync<List<StaffResponse>>();

                Assert.NotNull(inactive);
                Assert.Contains(inactive,
                    x => x.Id == newStaffId && !x.IsActive);
            }

            // Admin can reactivate the same account.
            await ExpectAsync(
                HttpStatusCode.OK,
                client, HttpMethod.Patch,
                newStatusUrl, adminToken,
                new { isActive = true });

            Assert.True(await db.Users.AsNoTracking()
                .Where(u => u.Id == newStaffId)
                .Select(u => u.IsActive)
                .SingleAsync());
        }
        finally
        {
            // Clear tracked entities before deleting users.
            db.ChangeTracker.Clear();

            var apiCreated = await users.FindByEmailAsync(
                newEmail);

            if (apiCreated is not null)
            {
                var deleted = await users.DeleteAsync(apiCreated);
                Assert.True(deleted.Succeeded);
            }

            if (staffCreated)
            {
                var existing = await users.FindByIdAsync(
                    staff.Id.ToString());

                if (existing is not null)
                {
                    var deleted = await users.DeleteAsync(existing);
                    Assert.True(deleted.Succeeded);
                }
            }

            if (citizenCreated)
            {
                var existing = await users.FindByIdAsync(
                    citizen.Id.ToString());

                if (existing is not null)
                {
                    var deleted = await users.DeleteAsync(existing);
                    Assert.True(deleted.Succeeded);
                }
            }
        }
    }

    private static ApplicationUser NewUser(string kind)
    {
        var id = Guid.NewGuid();
        var email = $"{kind}-staff-security-{id:N}@test.local";

        return new ApplicationUser
        {
            Id = id,
            UserName = email,
            Email = email,
            FirstName = "Security",
            LastName = kind,
            IsActive = true
        };
    }

    private static async Task<HttpResponseMessage> SendAsync(
        HttpClient client,
        HttpMethod method,
        string url,
        string? token,
        object? body = null)
    {
        using var request = new HttpRequestMessage(
            method, url);

        if (token is not null)
            request.Headers.Authorization =
                new AuthenticationHeaderValue(
                    "Bearer", token);

        if (body is not null)
            request.Content = JsonContent.Create(body);

        return await client.SendAsync(request);
    }

    private static async Task ExpectAsync(
        HttpStatusCode expected,
        HttpClient client,
        HttpMethod method,
        string url,
        string? token,
        object? body = null)
    {
        using var response = await SendAsync(
            client, method, url, token, body);

        Assert.Equal(expected, response.StatusCode);
    }
}
