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
    
    public async Task<List<DashboardPriorityResponse>> GetPriorityBreakdownAsync(
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
                    complaint.Priority)
            .Select(group =>
                new DashboardPriorityResponse
                {
                    Priority = group.Key.ToString(),
                    Count = group.Count()
                })
            .OrderByDescending(
                item => item.Count)
            .ToListAsync(cancellationToken);
    }
    
    public async Task<List<DashboardStatusResponse>>
        GetStatusBreakdownAsync(
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
                    complaint.Status)
            .Select(
                group =>
                    new DashboardStatusResponse
                    {
                        Status = group.Key.ToString(),
                        Count = group.Count()
                    })
            .OrderByDescending(
                item => item.Count)
            .ToListAsync(cancellationToken);
    }
    
    
    public async Task<List<DashboardRecentComplaintResponse>>
        GetRecentComplaintsAsync(
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
            .OrderByDescending(
                complaint =>
                    complaint.CreatedAt)
            .Take(5)
            .Select(
                complaint =>
                    new DashboardRecentComplaintResponse
                    {
                        Id = complaint.Id,
                        Title = complaint.Title,
                        Category = complaint.Category,
                        Location = complaint.Location,
                        Status = complaint.Status.ToString(),
                        Priority = complaint.Priority.ToString(),
                        CreatedAt = complaint.CreatedAt
                    })
            .ToListAsync(cancellationToken);
    }
    
    
    public async Task<List<DashboardMonthlyTrendResponse>>
        GetMonthlyTrendAsync(
            Guid userId,
            bool isAdmin,
            CancellationToken cancellationToken)
    {
        var currentMonth =
            new DateTime(
                DateTime.UtcNow.Year,
                DateTime.UtcNow.Month,
                1,
                0,
                0,
                0,
                DateTimeKind.Utc);

        var startDate =
            currentMonth.AddMonths(-5);

        var query = context.Complaints
            .AsNoTracking()
            .Where(
                complaint =>
                    complaint.CreatedAt >= startDate);

        if (!isAdmin)
        {
            query = query.Where(
                complaint =>
                    complaint.AssignedToUserId == userId);
        }

        var groupedData =
            await query
                .GroupBy(
                    complaint =>
                        new
                        {
                            complaint.CreatedAt.Year,
                            complaint.CreatedAt.Month
                        })
                .Select(
                    group =>
                        new
                        {
                            group.Key.Year,
                            group.Key.Month,
                            Count = group.Count()
                        })
                .ToListAsync(cancellationToken);

        var result =
            new List<DashboardMonthlyTrendResponse>();

        for (var i = 0; i < 6; i++)
        {
            var month =
                startDate.AddMonths(i);

            var data =
                groupedData.FirstOrDefault(
                    item =>
                        item.Year == month.Year &&
                        item.Month == month.Month);

            result.Add(
                new DashboardMonthlyTrendResponse
                {
                    Year = month.Year,
                    Month = month.Month,
                    Count = data?.Count ?? 0
                });
        }

        return result;
    }
    
    
    public async Task<List<DashboardWeeklyTrendResponse>>
        GetWeeklyTrendAsync(
            Guid userId,
            bool isAdmin,
            CancellationToken cancellationToken)
    {
        var today = DateTime.UtcNow.Date;

        var daysSinceMonday =
            ((int)today.DayOfWeek + 6) % 7;

        var currentWeekStart =
            today.AddDays(-daysSinceMonday);

        var startDate =
            currentWeekStart.AddDays(-35);

        var query = context.Complaints
            .AsNoTracking()
            .Where(
                complaint =>
                    complaint.CreatedAt >= startDate);

        if (!isAdmin)
        {
            query = query.Where(
                complaint =>
                    complaint.AssignedToUserId == userId);
        }

        var complaintDates =
            await query
                .Select(
                    complaint =>
                        complaint.CreatedAt)
                .ToListAsync(cancellationToken);

        var result =
            new List<DashboardWeeklyTrendResponse>();

        for (var i = 0; i < 6; i++)
        {
            var weekStart =
                startDate.AddDays(i * 7);

            var weekEnd =
                weekStart.AddDays(7);

            var count =
                complaintDates.Count(
                    createdAt =>
                        createdAt >= weekStart &&
                        createdAt < weekEnd);

            result.Add(
                new DashboardWeeklyTrendResponse
                {
                    WeekStart = weekStart,
                    Count = count
                });
        }

        return result;
    }
    
    
    public async Task<DashboardResolutionMetricsResponse>
        GetResolutionMetricsAsync(
            CancellationToken cancellationToken)
    {
        var totalComplaints =
            await context.Complaints
                .AsNoTracking()
                .CountAsync(cancellationToken);

        var resolvedComplaints =
            await context.Complaints
                .AsNoTracking()
                .CountAsync(
                    complaint =>
                        complaint.Status == ComplaintStatus.Resolved,
                    cancellationToken);

        var resolvedComplaintTimes =
            await context
                .Set<ComplaintStatusHistory>()
                .AsNoTracking()
                .Where(
                    history =>
                        history.NewStatus == ComplaintStatus.Resolved)
                .Select(
                    history => new
                    {
                        history.Complaint.CreatedAt,
                        history.ChangedAtUtc
                    })
                .ToListAsync(cancellationToken);

        var resolutionRate =
            totalComplaints == 0
                ? 0
                : (double)resolvedComplaints /
                totalComplaints * 100;

        var averageResolutionTimeHours =
            resolvedComplaintTimes.Count == 0
                ? 0
                : resolvedComplaintTimes.Average(
                    item =>
                        (item.ChangedAtUtc - item.CreatedAt)
                        .TotalHours);

        return new DashboardResolutionMetricsResponse
        {
            TotalComplaints = totalComplaints,
            ResolvedComplaints = resolvedComplaints,
            ResolutionRate =
                Math.Round(resolutionRate, 2),
            AverageResolutionTimeHours =
                Math.Round(
                    averageResolutionTimeHours,
                    2)
        };
    }
}