using System.Linq.Expressions;
using System.Security.Claims;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Announcements.Requests;
using CivicComplaintSystem.Api.Features.Announcements.Responses;
using CivicComplaintSystem.Api.Features.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Api.Features.Announcements;

[ApiController]
[Route("api/announcements")]
[Authorize(Roles = AppRoles.Admin)]
public sealed class AnnouncementsController(
    AppDbContext context) : ControllerBase
{
    private static readonly Expression<Func<Announcement, AnnouncementResponse>>
        ToResponse = a => new AnnouncementResponse
        {
            Id = a.Id,
            Title = a.Title,
            Body = a.Body,
            Category = a.Category,
            LocationScope = a.LocationScope,
            Country = a.Country,
            Province = a.Province,
            District = a.District,
            Municipality = a.Municipality,
            Ward = a.Ward,
            IsFeatured = a.IsFeatured,
            IsPublished = a.IsPublished,
            PublishedAtUtc = a.PublishedAtUtc,
            ExpiresAtUtc = a.ExpiresAtUtc,
            CreatedAtUtc = a.CreatedAtUtc,
            UpdatedAtUtc = a.UpdatedAtUtc,
            Author = a.CreatedByUser.FirstName + " " +
                     a.CreatedByUser.LastName
        };

    private Task<AnnouncementResponse> LoadResponse(
        Guid id,
        CancellationToken cancellationToken)
    {
        return context.Announcements
            .AsNoTracking()
            .Where(a => a.Id == id)
            .Select(ToResponse)
            .SingleAsync(cancellationToken);
    }

    // Public feed: drafts, future and expired notices are hidden.
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<AnnouncementResponse>>>
        GetPublished(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        var results = await context.Announcements
            .AsNoTracking()
            .Where(a =>
                a.IsPublished &&
                a.PublishedAtUtc.HasValue &&
                a.PublishedAtUtc <= now &&
                (!a.ExpiresAtUtc.HasValue ||
                 a.ExpiresAtUtc > now))
            .OrderByDescending(a => a.IsFeatured)
            .ThenByDescending(a => a.PublishedAtUtc)
            .Select(ToResponse)
            .ToListAsync(cancellationToken);

        return Ok(results);
    }

    [HttpGet("manage")]
    public async Task<ActionResult<List<AnnouncementResponse>>>
        GetManage(CancellationToken cancellationToken)
    {
        var results = await context.Announcements
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAtUtc)
            .Select(ToResponse)
            .ToListAsync(cancellationToken);

        return Ok(results);
    }

    [HttpGet("manage/{id:guid}")]
    public async Task<ActionResult<AnnouncementResponse>>
        GetManageById(Guid id, CancellationToken cancellationToken)
    {
        var result = await context.Announcements
            .AsNoTracking()
            .Where(a => a.Id == id)
            .Select(ToResponse)
            .SingleOrDefaultAsync(cancellationToken);

        return result is null
            ? NotFound(new { message = "Announcement not found." })
            : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<AnnouncementResponse>>
        Create(
            [FromBody] UpsertAnnouncementRequest request,
            CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out var adminId))
        {
            return Unauthorized(new
            {
                message = "Invalid administrator identity."
            });
        }

        if (request.ExpiresAtUtc.HasValue &&
            request.ExpiresAtUtc <= DateTime.UtcNow)
        {
            return BadRequest(new
            {
                message = "Expiration must be in the future."
            });
        }

        var announcement = new Announcement
        {
            Title = request.Title.Trim(),
            Body = request.Body.Trim(),
            Category = request.Category.Trim().ToLowerInvariant(),
            LocationScope = request.LocationScope.Trim().ToLowerInvariant(),
            Country = string.IsNullOrWhiteSpace(request.Country)
                ? null : request.Country.Trim(),
            Province = string.IsNullOrWhiteSpace(request.Province)
                ? null : request.Province.Trim(),
            District = string.IsNullOrWhiteSpace(request.District)
                ? null : request.District.Trim(),
            Municipality = string.IsNullOrWhiteSpace(request.Municipality)
                ? null : request.Municipality.Trim(),
            Ward = string.IsNullOrWhiteSpace(request.Ward)
                ? null : request.Ward.Trim(),
            IsFeatured = request.IsFeatured,
            ExpiresAtUtc = request.ExpiresAtUtc,
            CreatedByUserId = adminId
        };

        context.Announcements.Add(announcement);

        await context.SaveChangesAsync(cancellationToken);

        var result = await LoadResponse(
            announcement.Id, cancellationToken);

        return CreatedAtAction(
            nameof(GetManageById),
            new { id = announcement.Id },
            result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AnnouncementResponse>>
        Update(
            Guid id,
            [FromBody] UpsertAnnouncementRequest request,
            CancellationToken cancellationToken)
    {
        var announcement = await context.Announcements
            .FirstOrDefaultAsync(
                a => a.Id == id,
                cancellationToken);

        if (announcement is null)
            return NotFound(new
            {
                message = "Announcement not found."
            });

        if (request.ExpiresAtUtc.HasValue &&
            request.ExpiresAtUtc <= DateTime.UtcNow)
        {
            return BadRequest(new
            {
                message = "Expiration must be in the future."
            });
        }

        announcement.Title = request.Title.Trim();
        announcement.Body = request.Body.Trim();
        announcement.Category =
            request.Category.Trim().ToLowerInvariant();

        announcement.LocationScope =
            request.LocationScope.Trim().ToLowerInvariant();

        announcement.Country = string.IsNullOrWhiteSpace(request.Country)
            ? null : request.Country.Trim();

        announcement.Province = string.IsNullOrWhiteSpace(request.Province)
            ? null : request.Province.Trim();

        announcement.District = string.IsNullOrWhiteSpace(request.District)
            ? null : request.District.Trim();

        announcement.Municipality = string.IsNullOrWhiteSpace(request.Municipality)
            ? null : request.Municipality.Trim();

        announcement.Ward =
            string.IsNullOrWhiteSpace(request.Ward)
                ? null : request.Ward.Trim();
        announcement.IsFeatured = request.IsFeatured;
        announcement.ExpiresAtUtc = request.ExpiresAtUtc;
        announcement.UpdatedAtUtc = DateTime.UtcNow;

        await context.SaveChangesAsync(cancellationToken);

        return Ok(await LoadResponse(
            id, cancellationToken));
    }

    [HttpPatch("{id:guid}/publish")]
    public async Task<ActionResult<AnnouncementResponse>>
        SetPublished(
            Guid id,
            [FromBody] SetAnnouncementPublishedRequest request,
            CancellationToken cancellationToken)
    {
        var announcement = await context.Announcements
            .FirstOrDefaultAsync(
                a => a.Id == id,
                cancellationToken);

        if (announcement is null)
            return NotFound(new
            {
                message = "Announcement not found."
            });

        var publish = request.IsPublished!.Value;

        if (publish && announcement.ExpiresAtUtc.HasValue &&
            announcement.ExpiresAtUtc <= DateTime.UtcNow)
        {
            return BadRequest(new
            {
                message = "Cannot publish an expired announcement."
            });
        }

        if (announcement.IsPublished == publish)
        {
            return Ok(await LoadResponse(
                id, cancellationToken));
        }

        announcement.IsPublished = publish;
        announcement.PublishedAtUtc =
            publish ? DateTime.UtcNow : null;
        announcement.UpdatedAtUtc = DateTime.UtcNow;

        await context.SaveChangesAsync(cancellationToken);

        return Ok(await LoadResponse(
            id, cancellationToken));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var announcement = await context.Announcements
            .FirstOrDefaultAsync(
                a => a.Id == id,
                cancellationToken);

        if (announcement is null)
            return NotFound(new
            {
                message = "Announcement not found."
            });

        context.Announcements.Remove(announcement);

        await context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}
