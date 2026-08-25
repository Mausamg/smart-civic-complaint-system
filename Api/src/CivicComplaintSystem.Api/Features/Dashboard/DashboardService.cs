using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Complaints;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Api.Features.Dashboard;

public sealed class DashboardService(
    AppDbContext context)
{
    public async Task<DashboardStatsResponse> GetStatsAsync(
        Guid userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var query = context.Complaints
            .AsNoTracking()
            .AsQueryable();

        if (!isAdmin)
        {
            query = query.Where(
                complaint =>
                    complaint.AssignedToUserId == userId);
        }

        var stats = await query
            .GroupBy(_ => 1)
            .Select(group =>
                new DashboardStatsResponse
                {
                    TotalComplaints =
                        group.Count(),

                    Submitted =
                        group.Count(
                            complaint =>
                                complaint.Status ==
                                ComplaintStatus.Submitted),

                    UnderReview =
                        group.Count(
                            complaint =>
                                complaint.Status ==
                                ComplaintStatus.UnderReview),

                    InProgress =
                        group.Count(
                            complaint =>
                                complaint.Status ==
                                ComplaintStatus.InProgress),

                    Resolved =
                        group.Count(
                            complaint =>
                                complaint.Status ==
                                ComplaintStatus.Resolved),

                    Rejected =
                        group.Count(
                            complaint =>
                                complaint.Status ==
                                ComplaintStatus.Rejected),

                    HighPriority =
                        group.Count(
                            complaint =>
                                complaint.Priority ==
                                ComplaintPriority.High),

                    Unassigned =
                        isAdmin
                            ? group.Count(
                                complaint =>
                                    complaint.AssignedToUserId == null)
                            : 0
                })
            .FirstOrDefaultAsync(cancellationToken);

        return stats ?? new DashboardStatsResponse();
        
    }
    
    
    public async Task<List<DashboardCategoryResponse>> GetCategoryBreakdownAsync(
        Guid userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var query = context.Complaints
            .AsNoTracking()
            .AsQueryable();

        if (!isAdmin)
        {
            query = query.Where(
                complaint =>
                    complaint.AssignedToUserId == userId);
        }

        return await query
            .GroupBy(
                complaint =>
                    complaint.Category)
            .Select(group =>
                new DashboardCategoryResponse
                {
                    Category = group.Key,
                    Count = group.Count()
                })
            .OrderByDescending(
                item => item.Count)
            .ToListAsync(cancellationToken);
    }
}