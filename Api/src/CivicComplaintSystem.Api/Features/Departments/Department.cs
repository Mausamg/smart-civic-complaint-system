using System.ComponentModel.DataAnnotations;
using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Users;

namespace CivicComplaintSystem.Api.Features.Departments;

public sealed class Department
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [StringLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(120)]
    public string NormalizedName { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public Guid? HeadStaffUserId { get; set; }

    public ApplicationUser? HeadStaffUser { get; set; }

    [Range(1, 365)]
    public int ExpectedResolutionDays { get; set; } = 7;

    public ComplaintPriority DefaultPriority { get; set; }
        = ComplaintPriority.Medium;

    public DateTime CreatedAtUtc { get; set; }
        = DateTime.UtcNow;

    public DateTime? UpdatedAtUtc { get; set; }

    public ICollection<ApplicationUser> StaffMembers { get; set; }
        = new List<ApplicationUser>();

    public ICollection<Complaint> Complaints { get; set; }
        = new List<Complaint>();

    public ICollection<DepartmentCategory> Categories { get; set; }
        = new List<DepartmentCategory>();
}
