using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Users.Staff.Responses;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Api.Features.Users.Staff;

public sealed class StaffPerformanceService(AppDbContext context)
{
    public async Task<StaffPerformanceResponse> GetAsync(
        Guid staffId,
        CancellationToken cancellationToken = default)
    {
        var staffAssignments = await context
            .ComplaintAssignmentHistories
            .AsNoTracking()
            .Where(h => h.NewAssignedToUserId == staffId)
            .ToListAsync(cancellationToken);

        var currentlyAssignedIds = await context.Complaints
            .AsNoTracking()
            .Where(c => c.AssignedToUserId == staffId)
            .Select(c => c.Id)
            .ToListAsync(cancellationToken);

        var complaintIds = staffAssignments
            .Select(h => h.ComplaintId)
            .Concat(currentlyAssignedIds)
            .Distinct()
            .ToList();

        if (complaintIds.Count == 0)
        {
            return new StaffPerformanceResponse
            {
                StaffId = staffId
            };
        }

        var complaints = await context.Complaints
            .AsNoTracking()
            .Where(c => complaintIds.Contains(c.Id))
            .Select(c => new
            {
                c.Id,
                c.Title,
                c.Status,
                c.AssignedToUserId
            })
            .ToListAsync(cancellationToken);

        var complaintLookup = complaints.ToDictionary(
            c => c.Id);

        var allAssignments = await context
            .ComplaintAssignmentHistories
            .AsNoTracking()
            .Where(h => complaintIds.Contains(h.ComplaintId))
            .OrderBy(h => h.ChangedAtUtc)
            .ThenBy(h => h.Id)
            .ToListAsync(cancellationToken);

        var staffStatusEvents = await context
            .ComplaintStatusHistories
            .AsNoTracking()
            .Where(h =>
                complaintIds.Contains(h.ComplaintId) &&
                h.ChangedByUserId == staffId)
            .ToListAsync(cancellationToken);

        var staffComments = await context
            .ComplaintComments
            .AsNoTracking()
            .Where(c =>
                complaintIds.Contains(c.ComplaintId) &&
                c.CreatedByUserId == staffId)
            .Select(c => new
            {
                c.ComplaintId,
                c.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        var activities =
            new List<StaffAssignmentActivityResponse>();

        foreach (var group in allAssignments
            .GroupBy(h => h.ComplaintId))
        {
            if (!complaintLookup.TryGetValue(
                group.Key, out var complaint))
                continue;

            var periods = group
                .OrderBy(h => h.ChangedAtUtc)
                .ThenBy(h => h.Id)
                .ToList();

            for (var i = 0; i < periods.Count; i++)
            {
                var assignment = periods[i];

                if (assignment.NewAssignedToUserId != staffId)
                    continue;

                var start = assignment.ChangedAtUtc;

                DateTime? end = i + 1 < periods.Count
                    ? periods[i + 1].ChangedAtUtc
                    : null;

                bool InPeriod(DateTime time) =>
                    time >= start &&
                    (!end.HasValue || time < end.Value);

                var firstStatus = staffStatusEvents
                    .Where(h =>
                        h.ComplaintId == complaint.Id &&
                        InPeriod(h.ChangedAtUtc))
                    .Select(h => (DateTime?)h.ChangedAtUtc)
                    .Min();

                var firstComment = staffComments
                    .Where(c =>
                        c.ComplaintId == complaint.Id &&
                        InPeriod(c.CreatedAtUtc))
                    .Select(c => (DateTime?)c.CreatedAtUtc)
                    .Min();

                DateTime? firstAction = null;

                if (firstStatus.HasValue)
                    firstAction = firstStatus;

                if (firstComment.HasValue &&
                    (!firstAction.HasValue ||
                     firstComment.Value < firstAction.Value))
                {
                    firstAction = firstComment;
                }

                var resolvedAt = staffStatusEvents
                    .Where(h =>
                        h.ComplaintId == complaint.Id &&
                        h.NewStatus == ComplaintStatus.Resolved &&
                        InPeriod(h.ChangedAtUtc))
                    .Select(h => (DateTime?)h.ChangedAtUtc)
                    .Min();

                activities.Add(
                    new StaffAssignmentActivityResponse
                    {
                        AssignmentId = assignment.Id,
                        ComplaintId = complaint.Id,
                        ComplaintTitle = complaint.Title,
                        CurrentStatus = complaint.Status.ToString(),
                        AssignedAtUtc = start,
                        ReassignedAtUtc = end,
                        FirstActionAtUtc = firstAction,
                        ResolvedAtUtc = resolvedAt,
                        FirstActionMinutes = firstAction.HasValue
                            ? (firstAction.Value - start).TotalMinutes
                            : null,
                        ResolutionMinutes = resolvedAt.HasValue
                            ? (resolvedAt.Value - start).TotalMinutes
                            : null,
                        ResolvedByStaff = resolvedAt.HasValue,
                        IsCurrentlyAssigned =
                            i == periods.Count - 1 &&
                            complaint.AssignedToUserId == staffId
                    });
            }
        }

        var responseTimes = activities
            .Where(a => a.FirstActionMinutes.HasValue)
            .Select(a => a.FirstActionMinutes!.Value)
            .ToList();

        var resolutionTimes = activities
            .Where(a => a.ResolutionMinutes.HasValue)
            .Select(a => a.ResolutionMinutes!.Value)
            .ToList();

        return new StaffPerformanceResponse
        {
            StaffId = staffId,
            CurrentlyAssigned = currentlyAssignedIds.Count,
            LifetimeAssigned = complaintIds.Count,
            ResolvedByStaff = activities
                .Where(a => a.ResolvedByStaff)
                .Select(a => a.ComplaintId)
                .Distinct()
                .Count(),
            AverageFirstActionMinutes = responseTimes.Count > 0
                ? responseTimes.Average()
                : null,
            AverageResolutionMinutes = resolutionTimes.Count > 0
                ? resolutionTimes.Average()
                : null,
            Assignments = activities
                .OrderByDescending(a => a.AssignedAtUtc)
                .ToList()
        };
    }
}
