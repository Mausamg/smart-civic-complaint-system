using System.ComponentModel.DataAnnotations;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Api.Features.PublicMap;

[ApiController]
[Route("api/admin/public-map/complaints")]
[Authorize(Roles = AppRoles.Admin)]
public sealed class AdminPublicComplaintMapController(
    AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetReviewQueue(
        CancellationToken cancellationToken)
    {
        // Admin-only review data.
        // Never expose this response from an anonymous endpoint.
        var complaints = await context.Complaints
            .AsNoTracking()
            .OrderByDescending(c => c.CreatedAt)
            .ThenBy(c => c.Id)
            .Take(1000)
            .Select(c => new
            {
                c.Id,
                c.Title,
                c.Category,
                c.Status,
                c.Municipality,
                c.Ward,
                c.Latitude,
                c.Longitude,
                c.CreatedAt,
                c.IsPublicMapApproved
            })
            .ToListAsync(cancellationToken);

        Response.Headers.CacheControl = "no-store";

        return Ok(complaints.Select(c => new
        {
            c.Id,
            c.Title,
            c.Category,
            Status = c.Status.ToString(),
            c.Municipality,
            c.Ward,
            c.Latitude,
            c.Longitude,
            c.CreatedAt,
            c.IsPublicMapApproved
        }));
    }

    [HttpPatch("{id:guid}/approval")]
    public async Task<IActionResult> SetApproval(
        Guid id,
        SetPublicMapApprovalRequest request,
        CancellationToken cancellationToken)
    {
        if (!request.IsApproved.HasValue)
        {
            return BadRequest(new
            {
                message = "IsApproved is required."
            });
        }

        if (request.IsApproved.Value &&
            !request.PrivacyReviewed)
        {
            return BadRequest(new
            {
                message =
                    "Confirm that the complaint has been " +
                    "reviewed for safe public disclosure."
            });
        }

        var complaint = await context.Complaints
            .FirstOrDefaultAsync(
                c => c.Id == id,
                cancellationToken);

        if (complaint is null)
        {
            return NotFound(new
            {
                message = "Complaint not found."
            });
        }

        if (request.IsApproved.Value &&
            complaint.Status is
                ComplaintStatus.Rejected or
                ComplaintStatus.Withdrawn)
        {
            return BadRequest(new
            {
                message =
                    "Rejected or withdrawn complaints " +
                    "cannot appear on the public map."
            });
        }

        if (complaint.IsPublicMapApproved !=
            request.IsApproved.Value)
        {
            complaint.IsPublicMapApproved =
                request.IsApproved.Value;

            await context.SaveChangesAsync(
                cancellationToken);
        }

        Response.Headers.CacheControl = "no-store";

        return Ok(new
        {
            complaint.Id,
            complaint.IsPublicMapApproved,
            Status = complaint.Status.ToString()
        });
    }
}

public sealed class SetPublicMapApprovalRequest
{
    [Required]
    public bool? IsApproved { get; init; }

    public bool PrivacyReviewed { get; init; }
}
