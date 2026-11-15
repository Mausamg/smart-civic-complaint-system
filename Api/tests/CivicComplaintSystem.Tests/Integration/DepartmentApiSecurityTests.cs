using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Auth;
using CivicComplaintSystem.Api.Features.Departments.Responses;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CivicComplaintSystem.Tests.Integration;

public sealed class DepartmentApiSecurityTests
{
    [Fact]
    public async Task DepartmentEndpoints_EnforceRolesAndHttpStatuses()
    {
        var options = PostgresTestDb.CreateOptions();

        await using (var setup = new AppDbContext(options))
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

        var db = scope.ServiceProvider
            .GetRequiredService<AppDbContext>();

        var users = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();

        var tokens = scope.ServiceProvider
            .GetRequiredService<JwtTokenService>();

        var configuration = scope.ServiceProvider
            .GetRequiredService<IConfiguration>();

        var adminEmail = configuration["SeedAdmin:Email"];
        Assert.NotNull(adminEmail);

        var admin = await users.FindByEmailAsync(adminEmail);
        Assert.NotNull(admin);

        var adminRoles = await users.GetRolesAsync(admin);
        Assert.Contains(AppRoles.Admin, adminRoles);

        var adminToken = tokens.CreateToken(admin, adminRoles);

        // Match the API's string-enum JSON configuration.
        var jsonOptions = new JsonSerializerOptions(
            JsonSerializerDefaults.Web);

        jsonOptions.Converters.Add(
            new JsonStringEnumConverter());

        var suffix = Guid.NewGuid().ToString("N");
        var originalName = $"API Department {suffix}";
        var updatedName = $"API Updated {suffix}";

        var cleanupNames = new[]
        {
            originalName.ToUpperInvariant(),
            updatedName.ToUpperInvariant()
        };

        var createdUsers = new List<ApplicationUser>();

        async Task<string> CreateRoleTokenAsync(string role)
        {
            var id = Guid.NewGuid();
            var email = $"department-api-{id}@test.local";

            var user = new ApplicationUser
            {
                Id = id,
                UserName = email,
                Email = email,
                FirstName = "Department",
                LastName = role,
                IsActive = true
            };

            Assert.True((await users.CreateAsync(user)).Succeeded);
            createdUsers.Add(user);

            Assert.True(
                (await users.AddToRoleAsync(user, role)).Succeeded);

            return tokens.CreateToken(user, new[] { role });
        }

        async Task<HttpResponseMessage> SendAsync(
            HttpMethod method,
            string url,
            string? token,
            object? body = null)
        {
            using var request = new HttpRequestMessage(
                method, url);

            if (token is not null)
            {
                request.Headers.Authorization =
                    new AuthenticationHeaderValue(
                        "Bearer", token);
            }

            if (body is not null)
            {
                request.Content = JsonContent.Create(body);
            }

            return await client.SendAsync(request);
        }

        try
        {
            var citizenToken = await CreateRoleTokenAsync(
                AppRoles.Citizen);

            var staffToken = await CreateRoleTokenAsync(
                AppRoles.Staff);

            var unknownId = Guid.NewGuid();

            var requests = new[]
            {
                (
                    Method: HttpMethod.Get,
                    Url: "/api/departments",
                    Body: (object?)null
                ),
                (
                    Method: HttpMethod.Get,
                    Url: $"/api/departments/{unknownId}",
                    Body: (object?)null
                ),
                (
                    Method: HttpMethod.Post,
                    Url: "/api/departments",
                    Body: (object)new
                    {
                        name = originalName
                    }
                ),
                (
                    Method: HttpMethod.Put,
                    Url: $"/api/departments/{unknownId}",
                    Body: (object)new
                    {
                        name = originalName
                    }
                ),
                (
                    Method: HttpMethod.Patch,
                    Url: $"/api/departments/{unknownId}/active",
                    Body: (object)new
                    {
                        isActive = false
                    }
                ),
                (
                    Method: HttpMethod.Delete,
                    Url: $"/api/departments/{unknownId}",
                    Body: (object?)null
                )
            };

            // All six routes reject anonymous and non-admin users.
            foreach (var endpoint in requests)
            {
                using var anonymous = await SendAsync(
                    endpoint.Method,
                    endpoint.Url,
                    null,
                    endpoint.Body);

                Assert.Equal(
                    HttpStatusCode.Unauthorized,
                    anonymous.StatusCode);

                foreach (var token in new[]
                {
                    citizenToken,
                    staffToken
                })
                {
                    using var forbidden = await SendAsync(
                        endpoint.Method,
                        endpoint.Url,
                        token,
                        endpoint.Body);

                    Assert.Equal(
                        HttpStatusCode.Forbidden,
                        forbidden.StatusCode);
                }
            }

            // Administrators can list departments.
            using (var list = await SendAsync(
                HttpMethod.Get,
                "/api/departments",
                adminToken))
            {
                Assert.Equal(HttpStatusCode.OK, list.StatusCode);
            }

            Guid departmentId;

            // Valid creation returns 201 and a department record.
            using (var created = await SendAsync(
                HttpMethod.Post,
                "/api/departments",
                adminToken,
                new
                {
                    name = originalName,
                    categoryKeys = new[] { "water" }
                }))
            {
                Assert.Equal(
                    HttpStatusCode.Created,
                    created.StatusCode);

                var department = await created.Content
                    .ReadFromJsonAsync<DepartmentResponse>(jsonOptions);

                Assert.NotNull(department);
                Assert.Equal(originalName, department.Name);
                departmentId = department.Id;
            }

            // Duplicate department names return 409.
            using (var duplicate = await SendAsync(
                HttpMethod.Post,
                "/api/departments",
                adminToken,
                new
                {
                    name = originalName.ToLowerInvariant()
                }))
            {
                Assert.Equal(
                    HttpStatusCode.Conflict,
                    duplicate.StatusCode);
            }

            // Unsupported categories return 400.
            using (var invalid = await SendAsync(
                HttpMethod.Post,
                "/api/departments",
                adminToken,
                new
                {
                    name = $"Invalid {suffix}",
                    categoryKeys = new[] { "not_a_category" }
                }))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    invalid.StatusCode);
            }

            // Existing department lookup returns 200.
            using (var found = await SendAsync(
                HttpMethod.Get,
                $"/api/departments/{departmentId}",
                adminToken))
            {
                Assert.Equal(HttpStatusCode.OK, found.StatusCode);
            }

            // Administrators can edit departments.
            using (var edited = await SendAsync(
                HttpMethod.Put,
                $"/api/departments/{departmentId}",
                adminToken,
                new
                {
                    name = updatedName,
                    categoryKeys = new[] { "streetlights" }
                }))
            {
                Assert.Equal(HttpStatusCode.OK, edited.StatusCode);

                var department = await edited.Content
                    .ReadFromJsonAsync<DepartmentResponse>(jsonOptions);

                Assert.NotNull(department);
                Assert.Equal(updatedName, department.Name);
                Assert.Equal(departmentId, department.Id);
            }

            // Active department deletion must be refused.
            using (var activeDelete = await SendAsync(
                HttpMethod.Delete,
                $"/api/departments/{departmentId}",
                adminToken))
            {
                Assert.Equal(
                    HttpStatusCode.Conflict,
                    activeDelete.StatusCode);
            }

            // Missing status flag returns 400.
            using (var invalidStatus = await SendAsync(
                HttpMethod.Patch,
                $"/api/departments/{departmentId}/active",
                adminToken,
                new { }))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    invalidStatus.StatusCode);
            }

            // Valid deactivation returns 200.
            using (var disabled = await SendAsync(
                HttpMethod.Patch,
                $"/api/departments/{departmentId}/active",
                adminToken,
                new { isActive = false }))
            {
                Assert.Equal(HttpStatusCode.OK, disabled.StatusCode);

                var department = await disabled.Content
                    .ReadFromJsonAsync<DepartmentResponse>(jsonOptions);

                Assert.NotNull(department);
                Assert.False(department.IsActive);
            }

            // Empty, inactive department can be deleted.
            using (var deleted = await SendAsync(
                HttpMethod.Delete,
                $"/api/departments/{departmentId}",
                adminToken))
            {
                Assert.Equal(
                    HttpStatusCode.NoContent,
                    deleted.StatusCode);
            }

            // Deleted and unknown departments return 404.
            using (var missing = await SendAsync(
                HttpMethod.Get,
                $"/api/departments/{departmentId}",
                adminToken))
            {
                Assert.Equal(
                    HttpStatusCode.NotFound,
                    missing.StatusCode);
            }
        }
        finally
        {
            db.ChangeTracker.Clear();

            // Remove only this test's temporary departments.
            await db.Departments
                .Where(d => cleanupNames.Contains(d.NormalizedName))
                .ExecuteDeleteAsync();

            // Remove only this test's non-admin users.
            foreach (var user in createdUsers
                .AsEnumerable().Reverse())
            {
                var result = await users.DeleteAsync(user);
                Assert.True(result.Succeeded);
            }
        }
    }
}
