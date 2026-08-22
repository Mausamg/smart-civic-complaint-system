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
        
        
        var staff1Email = "staff1@civic.local";

        var staff1 = await userManager.FindByEmailAsync(staff1Email);

        if (staff1 is null)
        {
            staff1 = new ApplicationUser
            {
                FirstName = "Civic",
                LastName = "Staff",
                Email = staff1Email,
                UserName = staff1Email,
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(
                staff1,
                "Staff1@12345");

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
        
        
        if (!await userManager.CheckPasswordAsync(
                staff1,
                "Staff1@12345"))
        {
            var removeResult =
                await userManager.RemovePasswordAsync(staff1);

            if (!removeResult.Succeeded)
            {
                var errors = string.Join(
                    ", ",
                    removeResult.Errors.Select(error =>
                        error.Description));

                throw new InvalidOperationException(
                    $"Failed to remove Staff 1 password: {errors}");
            }

            var addResult =
                await userManager.AddPasswordAsync(
                    staff1,
                    "Staff1@12345");

            if (!addResult.Succeeded)
            {
                var errors = string.Join(
                    ", ",
                    addResult.Errors.Select(error =>
                        error.Description));

                throw new InvalidOperationException(
                    $"Failed to set Staff 1 password: {errors}");
            }
        }
        

        if (!await userManager.IsInRoleAsync(
                staff1,
                AppRoles.Staff))
        {
            var roleResult = await userManager.AddToRoleAsync(
                staff1,
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
        
        var staff2Email = "staff2@civic.local";

        var staff2 =
            await userManager.FindByEmailAsync(staff2Email);

        if (staff2 is null)
        {
            staff2 = new ApplicationUser
            {
                FirstName = "Civic",
                LastName = "Staff Two",
                Email = staff2Email,
                UserName = staff2Email,
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(
                staff2,
                "Staff2@12345");

            if (!result.Succeeded)
            {
                var errors = string.Join(
                    ", ",
                    result.Errors.Select(error =>
                        error.Description));

                throw new InvalidOperationException(
                    $"Failed to create second staff user: {errors}");
            }
        }

        if (!await userManager.IsInRoleAsync(
                staff2,
                AppRoles.Staff))
        {
            var roleResult =
                await userManager.AddToRoleAsync(
                    staff2,
                    AppRoles.Staff);

            if (!roleResult.Succeeded)
            {
                var errors = string.Join(
                    ", ",
                    roleResult.Errors.Select(error =>
                        error.Description));

                throw new InvalidOperationException(
                    $"Failed to assign Staff role to second staff: {errors}");
            }
        }
    }
    
}