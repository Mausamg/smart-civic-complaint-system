using CivicComplaintSystem.Api.Features.Users;

namespace CivicComplaintSystem.Api.Features.Announcements;

/// <summary>
/// Records that a particular citizen has read an announcement.
/// The composite primary key prevents duplicate receipts.
/// </summary>
public sealed class AnnouncementRead
{
    public Guid UserId { get; set; }

    public Guid AnnouncementId { get; set; }

    public DateTime ReadAtUtc { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;

    public Announcement Announcement { get; set; } = null!;
}
