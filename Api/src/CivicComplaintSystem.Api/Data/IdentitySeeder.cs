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

        string[] roles =
        [
            AppRoles.Citizen,
            AppRoles.Staff,
            AppRoles.Admin
        ];

        foreach (var roleName in roles)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                var result = await roleManager.CreateAsync(
                    new IdentityRole<Guid>(roleName));

                if (!result.Succeeded)
                {
                    var errors = string.Join(
                        ", ",
                        result.Errors.Select(error =>
                            error.Description));

                    throw new InvalidOperationException(
                        $"Failed to create role '{roleName}': {errors}");
                }
            }
        }

        
        var adminEmail = "mausamshrestha1200@gmail.com";

        var admin =
            await userManager.FindByEmailAsync(adminEmail);

        if (admin is null)
        {
            admin = new ApplicationUser
            {
                FirstName = "System",
                LastName = "Admin",
                Email = adminEmail,
                UserName = adminEmail,
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(
                admin,
                "Admin@12345");

            if (!result.Succeeded)
            {
                var errors = string.Join(
                    ", ",
                    result.Errors.Select(error =>
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
                var errors = string.Join(
                    ", ",
                    roleResult.Errors.Select(error =>
                        error.Description));

                throw new InvalidOperationException(
                    $"Failed to assign Admin role: {errors}");
            }
        }
        
        
        var staffEmail = "staff@civic.local";

        var staff = await userManager.FindByEmailAsync(staffEmail);

        if (staff is null)
        {
            staff = new ApplicationUser
            {
                FirstName = "Civic",
                LastName = "Staff",
                Email = staffEmail,
                UserName = staffEmail,
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(
                staff,
                "Staff@12345");

            if (!result.Succeeded)
            {
                var errors = string.Join(
                    ", ",
                    result.Errors.Select(error =>
                        error.Description));

                throw new InvalidOperationException(
                    $"Failed to create staff user: {errors}");
            }
        }

        if (!await userManager.IsInRoleAsync(
                staff,
                AppRoles.Staff))
        {
            var roleResult = await userManager.AddToRoleAsync(
                staff,
                AppRoles.Staff);

            if (!roleResult.Succeeded)
            {
                var errors = string.Join(
                    ", ",
                    roleResult.Errors.Select(error =>
                        error.Description));

                throw new InvalidOperationException(
                    $"Failed to assign Staff role: {errors}");
            }
        }
    }
    
}