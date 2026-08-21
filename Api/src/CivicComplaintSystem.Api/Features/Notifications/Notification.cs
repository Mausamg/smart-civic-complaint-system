using CivicComplaintSystem.Api.Features.Users;

namespace CivicComplaintSystem.Api.Features.Notifications;

public sealed class Notification
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public Guid? ComplaintId { get; set; }

    public bool IsRead { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    
    public ApplicationUser User { get; set; } = null!;
}