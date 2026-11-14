using System.ComponentModel.DataAnnotations;

namespace CivicComplaintSystem.Api.Features.Announcements.Requests;

public sealed class SetAnnouncementPublishedRequest
{
    [Required]
    public bool? IsPublished { get; set; }
}
