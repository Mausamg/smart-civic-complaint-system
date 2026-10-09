
using System.Net;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Net.Http.Headers;
using CivicComplaintSystem.Api.Features.Auth;
using CivicComplaintSystem.Api.Features.Users;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace CivicComplaintSystem.Tests.Integration;

public class ComplaintApiAuthorizationTests
{
    [Fact]
    public async Task GetAll_WithoutAuthentication_ShouldReturn401()
    {
        // Arrange: Prepare test database schema
        var options = PostgresTestDb.CreateOptions();

        await using (var context = new AppDbContext(options))
        {
            await context.Database.MigrateAsync();
        }

        // Start our test application
        using var factory = new TestApiFactory();

        using var client = factory.CreateClient(
            new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost"),
                AllowAutoRedirect = false
            });

        // Act: Request without a JWT token
        var response = await client.GetAsync("/api/complaints");

        // Assert: Anonymous users must receive 401
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            response.StatusCode);
    }

    
[Fact]
public async Task GetAll_WithCitizenToken_ShouldReturn403()
{
    // Arrange: Prepare the PostgreSQL test database
    var options = PostgresTestDb.CreateOptions();

    await using (var context = new AppDbContext(options))
    {
        await context.Database.MigrateAsync();
    }

    using var factory = new TestApiFactory();

    using var client = factory.CreateClient(
        new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

    // Get services from our test application
    using var scope = factory.Services.CreateScope();

    var userManager = scope.ServiceProvider
        .GetRequiredService<UserManager<ApplicationUser>>();

    var tokenService = scope.ServiceProvider
        .GetRequiredService<JwtTokenService>();

    // Create a unique test citizen
    var citizenId = Guid.NewGuid();

    var citizen = new ApplicationUser
    {
        Id = citizenId,
        UserName = $"citizen-{citizenId}@test.local",
        Email = $"citizen-{citizenId}@test.local",
        FirstName = "Test",
        LastName = "Citizen",
        IsActive = true
    };

    var createResult = await userManager.CreateAsync(citizen);

    Assert.True(createResult.Succeeded,
        string.Join(", ",
            createResult.Errors.Select(e => e.Description)));

    try
    {
        // Assign Citizen role
        var roleResult = await userManager.AddToRoleAsync(
            citizen, AppRoles.Citizen);

        Assert.True(roleResult.Succeeded);

        // Generate a valid Citizen JWT token
        var token = tokenService.CreateToken(
            citizen,
            new[] { AppRoles.Citizen });

        // Act: Send authenticated HTTP request
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            "/api/complaints");

        request.Headers.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        using var response = await client.SendAsync(request);

        // Assert: Citizen must not access admin endpoint
        Assert.Equal(
            HttpStatusCode.Forbidden,
            response.StatusCode);
    }
    finally
    {
        // Clean up test user
        await userManager.DeleteAsync(citizen);
    }
}


[Fact]
public async Task GetAll_WithAdminToken_ShouldReturn200()
{
    // Arrange: Prepare the test database
    var options = PostgresTestDb.CreateOptions();

    await using (var context = new AppDbContext(options))
    {
        await context.Database.MigrateAsync();
    }

    using var factory = new TestApiFactory();

    using var client = factory.CreateClient(
        new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

    using var scope = factory.Services.CreateScope();

    var userManager = scope.ServiceProvider
        .GetRequiredService<UserManager<ApplicationUser>>();

    var tokenService = scope.ServiceProvider
        .GetRequiredService<JwtTokenService>();

    var configuration = scope.ServiceProvider
        .GetRequiredService<IConfiguration>();

    // Use the admin created by IdentitySeeder
    var adminEmail = configuration["SeedAdmin:Email"];

    Assert.NotNull(adminEmail);

    var admin = await userManager.FindByEmailAsync(adminEmail);

    Assert.NotNull(admin);

    // Confirm this user actually has the Admin role
    var roles = await userManager.GetRolesAsync(admin);

    Assert.Contains(AppRoles.Admin, roles);

    // Generate a valid JWT token
    var token = tokenService.CreateToken(admin, roles);

    // Act: Send an authenticated admin request
    using var request = new HttpRequestMessage(
        HttpMethod.Get,
        "/api/complaints");

    request.Headers.Authorization =
        new AuthenticationHeaderValue("Bearer", token);

    using var response = await client.SendAsync(request);

    // Assert: Admin should have access
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
}

}

