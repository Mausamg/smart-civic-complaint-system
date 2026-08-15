using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CivicComplaintSystem.Api.Data;

namespace CivicComplaintSystem.Api.Features.Notifications;

[ApiController]
[Route("api/notifications")]
[Authorize]
public sealed class NotificationsController(
    AppDbContext context)
    : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<List<NotificationResponse>>> GetMyNotifications(
        CancellationToken cancellationToken)
    {
        var userIdValue =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(
                userIdValue,
                out var userId))
        {
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });
        }

        var notifications =
            await context.Notifications
                .AsNoTracking()
                .Where(n =>
                    n.UserId == userId)
                .OrderByDescending(n =>
                    n.CreatedAtUtc)
                .Select(n =>
                    new NotificationResponse
                    {
                        Id = n.Id,
                        Title = n.Title,
                        Message = n.Message,
                        ComplaintId = n.ComplaintId,
                        IsRead = n.IsRead,
                        CreatedAtUtc = n.CreatedAtUtc
                    })
                .ToListAsync(
                    cancellationToken);

        return Ok(notifications);
    }
    
    
    [HttpPatch("{id:guid}/read")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MarkAsRead(
        Guid id,
        CancellationToken cancellationToken)
    {
        var userIdValue =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(
                userIdValue,
                out var userId))
        {
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });
        }

        var notification =
            await context.Notifications
                .FirstOrDefaultAsync(
                    n => n.Id == id &&
                         n.UserId == userId,
                    cancellationToken);

        if (notification is null)
        {
            return NotFound(new
            {
                message = "Notification not found."
            });
        }

        notification.IsRead = true;

        await context.SaveChangesAsync(
            cancellationToken);

        return Ok(new
        {
            notification.Id,
            notification.IsRead
        });
    }
    
    
    [HttpGet("unread-count")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetUnreadCount(
        CancellationToken cancellationToken)
    {
        var userIdValue =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(
                userIdValue,
                out var userId))
        {
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });
        }

        var count =
            await context.Notifications
                .AsNoTracking()
                .CountAsync(
                    n => n.UserId == userId &&
                         !n.IsRead,
                    cancellationToken);

        return Ok(new
        {
            unreadCount = count
        });
    }
}