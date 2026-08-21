using CivicComplaintSystem.Api.Data;

namespace CivicComplaintSystem.Api.Features.Notifications;

public sealed class NotificationService(
    AppDbContext context)
{
    public async Task<Notification> CreateAsync(
        Guid userId,
        string title,
        string message,
        Guid? complaintId = null,
        CancellationToken cancellationToken = default)
    {
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = title.Trim(),
            Message = message.Trim(),
            ComplaintId = complaintId,
            IsRead = false,
            CreatedAtUtc = DateTime.UtcNow
        };

        context.Notifications.Add(notification);

        await context.SaveChangesAsync(
            cancellationToken);

        return notification;
    }
}