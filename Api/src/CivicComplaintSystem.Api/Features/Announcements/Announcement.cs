using System.ComponentModel.DataAnnotations;
using CivicComplaintSystem.Api.Features.Users;

namespace CivicComplaintSystem.Api.Features.Announcements;

public sealed class Announcement
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [StringLength(160)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [StringLength(5000)]
    public string Body { get; set; } = string.Empty;

    [Required]
    [StringLength(30)]
    public string Category { get; set; } = "general";


    [Required]
    [StringLength(12)]
    public string LocationScope { get; set; } = "all";

    [StringLength(100)]
    public string? Country { get; set; }

    [StringLength(100)]
    public string? Province { get; set; }

    [StringLength(100)]
    public string? District { get; set; }

    [StringLength(120)]
    public string? Municipality { get; set; }

    [StringLength(100)]
    public string? Ward { get; set; }

    public bool IsFeatured { get; set; }

    public bool IsPublished { get; set; }

    public DateTime? PublishedAtUtc { get; set; }

    public DateTime? ExpiresAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; }
        = DateTime.UtcNow;

    public DateTime? UpdatedAtUtc { get; set; }

    public Guid CreatedByUserId { get; set; }

    public ApplicationUser CreatedByUser { get; set; } = null!;
}
