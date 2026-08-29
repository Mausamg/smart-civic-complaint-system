using CivicComplaintSystem.Api.Features.Users.Staff.Requests;
using CivicComplaintSystem.Api.Features.Users.Staff.Responses;
using Microsoft.AspNetCore.Identity;

namespace CivicComplaintSystem.Api.Features.Users.Staff;

public sealed class StaffService(
    UserManager<ApplicationUser> userManager)
{
    public async Task<List<StaffResponse>> GetStaffAsync(
        bool? isActive)
    {
        var staffUsers =
            await userManager.GetUsersInRoleAsync(
                AppRoles.Staff);

        var query =
            staffUsers.AsEnumerable();

        if (isActive.HasValue)
        {
            query = query.Where(
                user =>
                    user.IsActive == isActive.Value);
        }

        return query
            .OrderBy(user => user.FirstName)
            .ThenBy(user => user.LastName)
            .Select(ToResponse)
            .ToList();
    }

    public async Task<(StaffResponse? Staff, IdentityResult Result)>
        CreateStaffAsync(
            CreateStaffRequest request)
    {
        var email =
            request.Email.Trim();

        var existingUser =
            await userManager.FindByEmailAsync(email);

        if (existingUser is not null)
        {
            return (
                null,
                IdentityResult.Failed(
                    new IdentityError
                    {
                        Code = "DuplicateEmail",
                        Description =
                            "A user with this email already exists."
                    }));
        }

        var staff =
            new ApplicationUser
            {
                FirstName =
                    request.FirstName.Trim(),

                LastName =
                    request.LastName.Trim(),

                Email = email,

                UserName = email,

                EmailConfirmed = true,

                IsActive = true
            };

        var createResult =
            await userManager.CreateAsync(
                staff,
                request.Password);

        if (!createResult.Succeeded)
        {
            return (null, createResult);
        }

        var roleResult =
            await userManager.AddToRoleAsync(
                staff,
                AppRoles.Staff);

        if (!roleResult.Succeeded)
        {
            var deleteResult =
                await userManager.DeleteAsync(staff);

            if (!deleteResult.Succeeded)
            {
                throw new InvalidOperationException(
                    "Staff creation failed and the incomplete user could not be removed.");
            }

            return (null, roleResult);
        }

        return (
            ToResponse(staff),
            IdentityResult.Success);
    }

    public async Task<ApplicationUser?> FindStaffAsync(
        Guid staffId)
    {
        var user =
            await userManager.FindByIdAsync(
                staffId.ToString());

        if (user is null)
        {
            return null;
        }

        var isStaff =
            await userManager.IsInRoleAsync(
                user,
                AppRoles.Staff);

        return isStaff
            ? user
            : null;
    }

    public async Task<IdentityResult> UpdateStaffStatusAsync(
        ApplicationUser staff,
        bool isActive)
    {
        staff.IsActive = isActive;

        return await userManager.UpdateAsync(staff);
    }

    public static StaffResponse ToResponse(
        ApplicationUser user)
    {
        return new StaffResponse
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email ?? string.Empty,
            IsActive = user.IsActive,
            CreatedAtUtc = user.CreateAtUtc
        };
    }
}