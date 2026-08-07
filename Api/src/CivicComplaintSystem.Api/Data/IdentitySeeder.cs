using CivicComplaintSystem.Api.Features.Users;
using Microsoft.AspNetCore.Identity;

namespace CivicComplaintSystem.Api.Data;

public class IdentitySeeder
{
    public static async Task SeedIdentity(
        IServiceProvider serviceProvider)
    {
        var roleManager = serviceProvider.GetRequiredService<
            RoleManager<IdentityRole<Guid>>>();

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
    }
}