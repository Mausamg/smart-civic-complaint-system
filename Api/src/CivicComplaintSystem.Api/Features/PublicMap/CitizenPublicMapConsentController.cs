using System.Security.Claims;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Api.Features.PublicMap;

public sealed class SetCitizenPublicMapConsentRequest
{
    public bool? IsPublicMapOptedIn { get; init; }
}

[ApiController]
[Route("api/complaints")]
[Authorize(Roles = AppRoles.Citizen)]
public sealed class CitizenPublicMapConsentController(
    AppDbContext context) : ControllerBase
{
    [HttpPatch("{id:guid}/public-map-consent")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetConsent(
        Guid id,
        SetCitizenPublicMapConsentRequest request,
        CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-store";

        if (!request.IsPublicMapOptedIn.HasValue)
        {
            return BadRequest(new
            {
                message = "IsPublicMapOptedIn is required."
            });
        }

        var userIdValue = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });
        }

        var complaint = await context.Complaints
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new
            {
                c.SubmittedByUserId
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (complaint is null)
        {
            return NotFound(new
            {
                message = "Complaint not found."
            });
        }

        if (complaint.SubmittedByUserId != userId)
            return Forbid();

        var optedIn = request.IsPublicMapOptedIn.Value;

        // Update both flags in one SQL statement.
        // Any consent change invalidates prior admin approval.
        var affected = await context.Complaints
            .Where(c =>
                c.Id == id &&
                c.SubmittedByUserId == userId)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(
                        c => c.IsPublicMapOptedIn,
                        optedIn)
                    .SetProperty(
                        c => c.IsPublicMapApproved,
                        false)
                    .SetProperty(
                        c => c.UpdatedAt,
                        DateTime.UtcNow),
                cancellationToken);

        if (affected != 1)
        {
            return NotFound(new
            {
                message = "Complaint not found."
            });
        }

        return Ok(new
        {
            Id = id,
            IsPublicMapOptedIn = optedIn,
            IsPublicMapApproved = false
        });
    }
}
