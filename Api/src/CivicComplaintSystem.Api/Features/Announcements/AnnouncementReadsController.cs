using System.Security.Claims;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Api.Features.Announcements;

[ApiController]
[Route("api/announcements")]
[Authorize(Roles = AppRoles.Citizen)]
public sealed class AnnouncementReadsController(
    AppDbContext context) : ControllerBase
{
    private bool TryGetCitizenId(out Guid userId)
    {
        return Guid.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out userId);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount(
        CancellationToken cancellationToken)
    {
        if (!TryGetCitizenId(out var citizenId))
        {
            return Unauthorized(new
            {
                message = "Invalid citizen identity."
            });
        }

        var now = DateTime.UtcNow;

        var count = await context.Announcements
            .AsNoTracking()
            .Where(a =>
                a.IsPublished &&
                a.PublishedAtUtc.HasValue &&
                a.PublishedAtUtc <= now &&
                (!a.ExpiresAtUtc.HasValue ||
                 a.ExpiresAtUtc > now))
            .CountAsync(
                a => !context.AnnouncementReads.Any(
                    r => r.UserId == citizenId &&
                         r.AnnouncementId == a.Id),
                cancellationToken);

        return Ok(new
        {
            unreadCount = count
        });
    }

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkAsRead(
        Guid id,
        CancellationToken cancellationToken)
    {
        if (!TryGetCitizenId(out var citizenId))
        {
            return Unauthorized(new
            {
                message = "Invalid citizen identity."
            });
        }

        var now = DateTime.UtcNow;

        var visible = await context.Announcements
            .AsNoTracking()
            .AnyAsync(
                a =>
                    a.Id == id &&
                    a.IsPublished &&
                    a.PublishedAtUtc.HasValue &&
                    a.PublishedAtUtc <= now &&
                    (!a.ExpiresAtUtc.HasValue ||
                     a.ExpiresAtUtc > now),
                cancellationToken);

        if (!visible)
        {
            // Do not reveal unpublished or expired notices.
            return NotFound(new
            {
                message = "Announcement not found."
            });
        }

        // Concurrent clicks or multiple devices cannot
        // create duplicate read receipts.
        await context.Database.ExecuteSqlInterpolatedAsync(
            $"""
            INSERT INTO "AnnouncementReads"
                ("UserId", "AnnouncementId", "ReadAtUtc")
            VALUES ({citizenId}, {id}, {now})
            ON CONFLICT ("UserId", "AnnouncementId")
            DO NOTHING
            """,
            cancellationToken);

        return Ok(new
        {
            id,
            isRead = true
        });
    }
}
