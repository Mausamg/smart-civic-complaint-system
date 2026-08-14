using CivicComplaintSystem.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Api.Features.Complaints.Services;

public sealed class ComplaintQueryService(
    AppDbContext context)
{
    public async Task<PaginatedResponse<ComplaintResponse>> GetAllAsync(
        GetComplaintsRequest request,
        CancellationToken cancellationToken = default)
    {
        var query = context.Complaints
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search =
                $"%{request.Search.Trim()}%";

            query = query.Where(c =>
                EF.Functions.ILike(c.Title, search) ||
                EF.Functions.ILike(c.Description, search) ||
                EF.Functions.ILike(c.Category, search) ||
                EF.Functions.ILike(c.Location, search));
        }

        if (request.Status.HasValue)
        {
            query = query.Where(c =>
                c.Status == request.Status.Value);
        }
        
        if (request.Priority.HasValue)
        {
            query = query.Where(c =>
                c.Priority == request.Priority.Value);
        }
        
        if (!string.IsNullOrWhiteSpace(
                request.Category))
        {
            var category =
                request.Category.Trim();

            query = query.Where(c =>
                EF.Functions.ILike(
                    c.Category,
                    category));
        }

        if (!string.IsNullOrWhiteSpace(
                request.Location))
        {
            var location =
                request.Location.Trim();

            query = query.Where(c =>
                EF.Functions.ILike(
                    c.Location,
                    $"%{location}%"));
        }

        if (request.AssignedToUserId.HasValue)
        {
            query = query.Where(c =>
                c.AssignedToUserId ==
                request.AssignedToUserId.Value);
        }

        if (request.CreatedFrom.HasValue)
        {
            var createdFrom =
                DateTime.SpecifyKind(
                    request.CreatedFrom.Value.Date,
                    DateTimeKind.Utc);

            query = query.Where(c =>
                c.CreatedAt >= createdFrom);
        }

        if (request.CreatedTo.HasValue)
        {
            var createdToExclusive =
                DateTime.SpecifyKind(
                    request.CreatedTo.Value.Date.AddDays(1),
                    DateTimeKind.Utc);

            query = query.Where(c =>
                c.CreatedAt < createdToExclusive);
        }

        var totalCount =
            await query.CountAsync(
                cancellationToken);

        var sortBy =
            request.SortBy?
                .Trim()
                .ToLowerInvariant()
            ?? "createdat";

        var sortDirection =
            request.SortDirection?
                .Trim()
                .ToLowerInvariant()
            ?? "desc";

        query = (sortBy, sortDirection) switch
        {
            ("createdat", "asc") =>
                query.OrderBy(c => c.CreatedAt),

            ("createdat", "desc") =>
                query.OrderByDescending(c => c.CreatedAt),

            ("title", "asc") =>
                query.OrderBy(c => c.Title),

            ("title", "desc") =>
                query.OrderByDescending(c => c.Title),

            ("category", "asc") =>
                query.OrderBy(c => c.Category),

            ("category", "desc") =>
                query.OrderByDescending(c => c.Category),

            ("status", "asc") =>
                query.OrderBy(c => c.Status),

            ("status", "desc") =>
                query.OrderByDescending(c => c.Status),
            
            ("priority", "asc") =>
                query.OrderBy(c => c.Priority),

            ("priority", "desc") =>
                query.OrderByDescending(c => c.Priority),

            _ =>
                query.OrderByDescending(c =>
                    c.CreatedAt)
        };

        var complaints =
            await query
                .Skip(
                    (request.Page - 1) *
                    request.PageSize)
                .Take(request.PageSize)
                .Select(
                    ComplaintProjections.ToResponse)
                .ToListAsync(
                    cancellationToken);

        return new PaginatedResponse<ComplaintResponse>
        {
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = totalCount,

            TotalPages =
                (int)Math.Ceiling(
                    totalCount /
                    (double)request.PageSize),

            Items = complaints
        };
    }
    
    public async Task<List<ComplaintResponse>> GetMyComplaintsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        return await context.Complaints
            .AsNoTracking()
            .Where(c =>
                c.SubmittedByUserId == userId)
            .OrderByDescending(c =>
                c.CreatedAt)
            .Select(ComplaintProjections.ToResponse)
            .ToListAsync(cancellationToken);
    }
    
    
    public async Task<List<ComplaintResponse>> GetAssignedToMeAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        return await context.Complaints
            .AsNoTracking()
            .Where(c =>
                c.AssignedToUserId == userId &&
                c.Status != ComplaintStatus.Resolved &&
                c.Status != ComplaintStatus.Rejected)
            .OrderByDescending(c =>
                c.Priority)
            .ThenByDescending(c =>
                c.UpdatedAt ?? c.CreatedAt)
            .Select(ComplaintProjections.ToResponse)
            .ToListAsync(cancellationToken);
    }
    
    
    public async Task<ComplaintResponse?> GetByIdAsync(
        Guid complaintId,
        CancellationToken cancellationToken = default)
    {
        return await context.Complaints
            .AsNoTracking()
            .Where(c => c.Id == complaintId)
            .Select(ComplaintProjections.ToResponse)
            .FirstOrDefaultAsync(cancellationToken);
    }
    
    
    public async Task<List<ComplaintStatusHistoryResponse>> GetStatusHistoryAsync(
        Guid complaintId,
        CancellationToken cancellationToken = default)
    {
        return await context.ComplaintStatusHistories
            .AsNoTracking()
            .Where(h =>
                h.ComplaintId == complaintId)
            .OrderByDescending(h =>
                h.ChangedAtUtc)
            .Select(h =>
                new ComplaintStatusHistoryResponse
                {
                    Id = h.Id,

                    OldStatus =
                        h.OldStatus.ToString(),

                    NewStatus =
                        h.NewStatus.ToString(),

                    ChangedByUserId =
                        h.ChangedByUserId,

                    ChangedByName =
                        h.ChangedByUser.FirstName +
                        " " +
                        h.ChangedByUser.LastName,

                    ChangedAtUtc =
                        h.ChangedAtUtc,

                    Note =
                        h.Note
                })
            .ToListAsync(cancellationToken);
    }
    
    public async Task<List<ComplaintAssignmentHistoryResponse>>
        GetAssignmentHistoryAsync(
            Guid complaintId,
            CancellationToken cancellationToken = default)
    {
        return await context.ComplaintAssignmentHistories
            .AsNoTracking()
            .Where(h =>
                h.ComplaintId == complaintId)
            .OrderByDescending(h =>
                h.ChangedAtUtc)
            .Select(h =>
                new ComplaintAssignmentHistoryResponse
                {
                    Id = h.Id,

                    OldAssignedToUserId =
                        h.OldAssignedToUserId,

                    OldAssignedToName =
                        h.OldAssignedToUser == null
                            ? null
                            : h.OldAssignedToUser.FirstName +
                              " " +
                              h.OldAssignedToUser.LastName,

                    NewAssignedToUserId =
                        h.NewAssignedToUserId,

                    NewAssignedToName =
                        h.NewAssignedToUser.FirstName +
                        " " +
                        h.NewAssignedToUser.LastName,

                    ChangedByUserId =
                        h.ChangedByUserId,

                    ChangedByName =
                        h.ChangedByUser.FirstName +
                        " " +
                        h.ChangedByUser.LastName,

                    ChangedAtUtc =
                        h.ChangedAtUtc,

                    Note =
                        h.Note
                })
            .ToListAsync(cancellationToken);
    }
    
}