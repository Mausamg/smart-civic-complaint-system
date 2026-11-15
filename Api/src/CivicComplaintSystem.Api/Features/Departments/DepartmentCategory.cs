using System.ComponentModel.DataAnnotations;

namespace CivicComplaintSystem.Api.Features.Departments;

public sealed class DepartmentCategory
{
    public Guid DepartmentId { get; set; }

    public Department Department { get; set; } = null!;

    [Required]
    [StringLength(80)]
    public string CategoryKey { get; set; } = string.Empty;
}
