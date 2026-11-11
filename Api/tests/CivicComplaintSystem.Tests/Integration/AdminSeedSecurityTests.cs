using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Auth;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CivicComplaintSystem.Tests.Integration;

public sealed class AdminSeedSecurityTests
{
    [Fact]
    public async Task Seeder_MustNotPromoteExistingCitizen()
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

        var users = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();

        var roles = scope.ServiceProvider
            .GetRequiredService<RoleManager<IdentityRole<Guid>>>();

        var citizen = NewCitizen();
        var created = false;

        try
        {
            var result = await users.CreateAsync(citizen);
            Assert.True(result.Succeeded);
            created = true;

            Assert.True((await users.AddToRoleAsync(
                citizen, AppRoles.Citizen)).Succeeded);

            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(
                    new Dictionary<string, string?>
                    {
                        ["SeedAdmin:Email"] = citizen.Email
                    })
                .Build();

            // Use the actual database-backed identity managers
            // with a deliberately conflicting seed email.
            using var services = new ServiceCollection()
                .AddSingleton(users)
                .AddSingleton(roles)
                .AddSingleton<IConfiguration>(config)
                .BuildServiceProvider();

            var exception = await Assert.ThrowsAsync<
                InvalidOperationException>(
                    () => IdentitySeeder.SeedIdentity(services));

            Assert.Contains(
                "existing non-admin account",
                exception.Message);

            Assert.False(await users.IsInRoleAsync(
                citizen, AppRoles.Admin));

            Assert.True(await users.IsInRoleAsync(
                citizen, AppRoles.Citizen));
        }
        finally
        {
            if (created)
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

    [Fact]
    public async Task Registration_MustRejectReservedAdminEmail()
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

        var users = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();

        var tokens = scope.ServiceProvider
            .GetRequiredService<JwtTokenService>();

        // Use a reserved email that does not already exist.
        // This ensures the new guard is actually tested,
        // rather than ordinary duplicate-email validation.
        var reservedEmail =
            $"reserved-{Guid.NewGuid():N}@test.local";

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["SeedAdmin:Email"] = reservedEmail
                })
            .Build();

        var controller = new AuthController(
            users, tokens, config);

        var request = new RegisterRequest
        {
            FirstName = "Security",
            LastName = "Tester",
            Email = $"  {reservedEmail.ToUpperInvariant()}  ",
            Password = "TestCitizen!234"
        };

        Assert.Null(await users.FindByEmailAsync(
            reservedEmail));

        var response = await controller.Register(request);

        var conflict = Assert.IsType<ConflictObjectResult>(
            response);

        Assert.Equal(409, conflict.StatusCode);

        // Rejected registration must not create an account.
        Assert.Null(await users.FindByEmailAsync(
            reservedEmail));
    }

    private static ApplicationUser NewCitizen()
    {
        var id = Guid.NewGuid();
        var email =
            $"admin-seed-security-{id:N}@test.local";

        return new ApplicationUser
        {
            Id = id,
            UserName = email,
            Email = email,
            FirstName = "Security",
            LastName = "Citizen",
            IsActive = true
        };
    }
}
