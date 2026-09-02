using System.ComponentModel.DataAnnotations;

namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class GetComplaintsRequest
{
    public ComplaintStatus? Status { get; init; }
    
    public ComplaintPriority? Priority { get; set; }
    
    public string? Search { get; init; }

    public string? Category { get; init; }

    public string? Location { get; init; }

    public Guid? AssignedToUserId { get; set; }
    
    public string SortBy { get; init; } = "createdAt";
    
    public string SortDirection { get; init; } = "desc";
    
    public DateTime? CreatedFrom { get; init; }
    
    public DateTime? CreatedTo { get; init; }
    

    [Range(1, int.MaxValue)]
    public int Page { get; init; } = 1;

    [Range(1, 100)]
    public int PageSize { get; init; } = 10;
}
