using CivicComplaintSystem.Api.Features.Users;
using Microsoft.AspNetCore.Identity;

namespace CivicComplaintSystem.Api.Data;

public static class IdentitySeeder
{
    public static async Task SeedIdentity(
        IServiceProvider serviceProvider)
    {
        var roleManager =
            serviceProvider.GetRequiredService<
                RoleManager<IdentityRole<Guid>>>();

        var userManager =
            serviceProvider.GetRequiredService<
                UserManager<ApplicationUser>>();

        var configuration =
            serviceProvider.GetRequiredService<
                IConfiguration>();

        string[] roles =
        [
            AppRoles.Citizen,
            AppRoles.Staff,
            AppRoles.Admin
        ];

        foreach (var roleName in roles)
        {
            if (await roleManager.RoleExistsAsync(
                    roleName))
            {
                continue;
            }

            var roleResult =
                await roleManager.CreateAsync(
                    new IdentityRole<Guid>(
                        roleName));

            if (!roleResult.Succeeded)
            {
                var errors =
                    string.Join(
                        ", ",
                        roleResult.Errors.Select(
                            error =>
                                error.Description));

                throw new InvalidOperationException(
                    $"Failed to create role '{roleName}': {errors}");
            }
        }

        var adminEmail =
            configuration["SeedAdmin:Email"];

        if (string.IsNullOrWhiteSpace(adminEmail))
        {
            throw new InvalidOperationException(
                "Seed admin email is not configured.");
        }

        adminEmail = adminEmail.Trim();

        var admin =
            await userManager.FindByEmailAsync(
                adminEmail);

        if (admin is null)
        {
            var adminPassword =
                configuration["SeedAdmin:Password"];

            if (string.IsNullOrWhiteSpace(
                    adminPassword))
            {
                throw new InvalidOperationException(
                    "Seed admin password is not configured.");
            }

            admin =
                new ApplicationUser
                {
                    FirstName = "System",
                    LastName = "Admin",
                    Email = adminEmail,
                    UserName = adminEmail,
                    EmailConfirmed = true,
                    IsActive = true
                };

            var createResult =
                await userManager.CreateAsync(
                    admin,
                    adminPassword);

            if (!createResult.Succeeded)
            {
                var errors =
                    string.Join(
                        ", ",
                        createResult.Errors.Select(
                            error =>
                                error.Description));

                throw new InvalidOperationException(
                    $"Failed to create admin user: {errors}");
            }
        }

        if (!await userManager.IsInRoleAsync(
                admin,
                AppRoles.Admin))
        {
            var roleResult =
                await userManager.AddToRoleAsync(
                    admin,
                    AppRoles.Admin);

            if (!roleResult.Succeeded)
            {
                var errors =
                    string.Join(
                        ", ",
                        roleResult.Errors.Select(
                            error =>
                                error.Description));

                throw new InvalidOperationException(
                    $"Failed to assign Admin role: {errors}");
                
            }
        }
    }
}
