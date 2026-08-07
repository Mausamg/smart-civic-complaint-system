using CivicComplaintSystem.Api.Features.Users;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace CivicComplaintSystem.Api.Features.Auth;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    UserManager<ApplicationUser> userManager)
    : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(
        RegisterRequest request)
    {
        var existingUser =
            await userManager.FindByEmailAsync(request.Email);

        if (existingUser is not null)
        {
            return Conflict(new
            {
                message = "A user with this email already exists."
            });
        }

        var user = new ApplicationUser
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = request.Email.Trim(),
            UserName = request.Email.Trim()
        };

        var result = await userManager.CreateAsync(
            user,
            request.Password);

        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(
                    error.Code,
                    error.Description);
            }

            return ValidationProblem(ModelState);
        }

        await userManager.AddToRoleAsync(
            user,
            AppRoles.Citizen);

        return StatusCode(
            StatusCodes.Status201Created,
            new
            {
                user.Id,
                user.FirstName,
                user.LastName,
                user.Email,
                Role = AppRoles.Citizen
            });
    }
}