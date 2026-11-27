using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Api.Features.InternalMap;

[ApiController]
[Route("api/admin/internal-map/complaints")]
[Authorize(Roles = AppRoles.Admin)]
public sealed class AdminInternalComplaintMapController(
    AppDbContext context) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<AdminInternalMapComplaintResponse>>>
        Get(CancellationToken cancellationToken)
    {
        // This is a private operational map, not a public
        // disclosure endpoint. Consent and public approval
        // must not restrict administrator visibility.
        //
        // Include complaints from every lifecycle status.
        // Exclude missing, out-of-range and placeholder
        // coordinates before creating map records.

        Response.Headers.CacheControl = "no-store";

        var records = await context.Complaints
            .AsNoTracking()
            .Where(c =>
                c.Latitude.HasValue &&
                c.Longitude.HasValue &&
                c.Latitude.Value >= -90.0 &&
                c.Latitude.Value <= 90.0 &&
                c.Longitude.Value >= -180.0 &&
                c.Longitude.Value <= 180.0 &&
                (c.Latitude.Value != 0.0 ||
                 c.Longitude.Value != 0.0))
            .OrderByDescending(c => c.CreatedAt)
            .ThenBy(c => c.Id)
            .Select(c => new AdminInternalMapComplaintResponse
            {
                Id = c.Id,
                Title = c.Title,
                Category = c.Category,
                Status = c.Status.ToString(),
                Priority = c.Priority.ToString(),
                Location = c.Location,
                Municipality = c.Municipality,
                Ward = c.Ward,

                DepartmentId = c.DepartmentId,

                DepartmentName = c.Department == null
                    ? null
                    : c.Department.Name,

                IsAssigned = c.AssignedToUserId.HasValue,

                // Preserve exact stored coordinates.
                // Never apply public-map rounding here.
                Latitude = c.Latitude!.Value,
                Longitude = c.Longitude!.Value,

                CreatedAt = c.CreatedAt
            })
            .ToListAsync(cancellationToken);

        // No arbitrary Take() limit: return every valid
        // map record using this lightweight projection.

        return Ok(records);
    }
}
