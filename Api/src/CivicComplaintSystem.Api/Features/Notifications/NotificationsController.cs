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
}