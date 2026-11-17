using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Complaints;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Api.Features.PublicMap;

[ApiController]
[Route("api/public/complaints/map")]
[AllowAnonymous]
public sealed class PublicComplaintMapController(
    AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(
        CancellationToken cancellationToken)
    {
        // The public feed deliberately excludes withdrawn
        // and rejected complaints.
        //
        // Never return ComplaintResponse here:
        // it contains personal and internal information.

        var records = await context.Complaints
            .AsNoTracking()
            .Where(c =>
                c.IsPublicMapOptedIn &&
                c.IsPublicMapApproved &&
                c.Status != ComplaintStatus.Withdrawn &&
                c.Status != ComplaintStatus.Rejected)
            .OrderByDescending(c => c.CreatedAt)
            .ThenBy(c => c.Id)
            .Select(c => new
            {
                c.Id,
                c.Category,
                c.Status,
                c.Municipality,
                c.Ward,
                c.Latitude,
                c.Longitude,
                c.CreatedAt
            })
            .Take(1000)
            .ToListAsync(cancellationToken);

        var result = records.Select(c =>
        {
            // Invalid, non-finite or out-of-Nepal
            // coordinates must not generate map pins.
            var hasValidCoordinates =
                c.Latitude.HasValue &&
                c.Longitude.HasValue &&
                double.IsFinite(c.Latitude.Value) &&
                double.IsFinite(c.Longitude.Value) &&
                c.Latitude.Value >= 26.0 &&
                c.Latitude.Value <= 31.0 &&
                c.Longitude.Value >= 80.0 &&
                c.Longitude.Value <= 89.0;

            double? latitude = hasValidCoordinates
                ? Math.Round(c.Latitude!.Value, 3)
                : null;

            double? longitude = hasValidCoordinates
                ? Math.Round(c.Longitude!.Value, 3)
                : null;

            return new PublicComplaintMapItem
            {
                Id = c.Id,
                Category = c.Category,
                Status = c.Status.ToString(),
                Municipality = c.Municipality,
                Ward = c.Ward,
                Latitude = latitude,
                Longitude = longitude,
                ReportedAtUtc = c.CreatedAt
            };
        }).ToList();

        Response.Headers.CacheControl = "no-store";

        return Ok(result);
    }
}

public sealed class PublicComplaintMapItem
{
    public Guid Id { get; init; }

    public string Category { get; init; } = string.Empty;

    public string Status { get; init; } = string.Empty;

    public string? Municipality { get; init; }

    public string? Ward { get; init; }

    public double? Latitude { get; init; }

    public double? Longitude { get; init; }

    public DateTime ReportedAtUtc { get; init; }
}
