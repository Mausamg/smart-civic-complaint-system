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
    
    
public async Task<PaginatedResponse<ComplaintResponse>>
    GetMyComplaintsPagedAsync(
        Guid userId,
        GetScopedComplaintsRequest request,
        CancellationToken cancellationToken = default)
{
    // 1. Only retrieve complaints owned by this citizen
    var query = context.Complaints
        .AsNoTracking()
        .Where(c => c.SubmittedByUserId == userId);

    // 2. Filter by status
    if (request.Status.HasValue)
    {
        query = query.Where(c =>
            c.Status == request.Status.Value);
    }

    // 3. Filter by priority
    if (request.Priority.HasValue)
    {
        query = query.Where(c =>
            c.Priority == request.Priority.Value);
    }

    // 4. Search complaint information
    if (!string.IsNullOrWhiteSpace(request.Search))
    {
        var search = $"%{request.Search.Trim()}%";

        query = query.Where(c =>
            EF.Functions.ILike(c.Title, search) ||
            EF.Functions.ILike(c.Description, search) ||
            EF.Functions.ILike(c.Category, search) ||
            EF.Functions.ILike(c.Location, search));
    }

    // 5. Count matching records before pagination
    var totalCount = await query.CountAsync(
        cancellationToken);

    // 6. Apply sorting
    var sortBy = request.SortBy.Trim().ToLowerInvariant();
    var direction = request.SortDirection
        .Trim().ToLowerInvariant();

    query = (sortBy, direction) switch
    {
        ("createdat", "asc") =>
            query.OrderBy(c => c.CreatedAt),

        ("title", "asc") =>
            query.OrderBy(c => c.Title),

        ("title", "desc") =>
            query.OrderByDescending(c => c.Title),

        ("priority", "asc") =>
            query.OrderBy(c => c.Priority),

        ("priority", "desc") =>
            query.OrderByDescending(c => c.Priority),

        ("status", "asc") =>
            query.OrderBy(c => c.Status),

        ("status", "desc") =>
            query.OrderByDescending(c => c.Status),

        _ => query.OrderByDescending(c => c.CreatedAt)
    };

    // Stable ordering for complaints with equal sort values
    query = ((IOrderedQueryable<Complaint>)query)
        .ThenBy(c => c.Id);

    // 7. Calculate how many records to skip
    var offset = (long)(request.Page - 1) * request.PageSize;

    var complaints = offset > int.MaxValue
        ? new List<ComplaintResponse>()
        : await query
            .Skip((int)offset)
            .Take(request.PageSize)
            .Select(ComplaintProjections.ToResponse)
            .ToListAsync(cancellationToken);

    // 8. Return pagination information and results
    return new PaginatedResponse<ComplaintResponse>
    {
        Page = request.Page,
        PageSize = request.PageSize,
        TotalCount = totalCount,
        TotalPages = (int)Math.Ceiling(
            totalCount / (double)request.PageSize),
        Items = complaints
    };
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
    
    
public async Task<PaginatedResponse<ComplaintResponse>>
    GetAssignedToMePagedAsync(
        Guid userId,
        GetScopedComplaintsRequest request,
        CancellationToken cancellationToken = default)
{
    // 1. Only complaints assigned to the logged-in staff member
    var query = context.Complaints
        .AsNoTracking()
        .Where(c =>
            c.AssignedToUserId == userId &&
            c.Status != ComplaintStatus.Resolved &&
            c.Status != ComplaintStatus.Rejected);

    // 2. Filter by status
    if (request.Status.HasValue)
    {
        query = query.Where(c =>
            c.Status == request.Status.Value);
    }

    // 3. Filter by priority
    if (request.Priority.HasValue)
    {
        query = query.Where(c =>
            c.Priority == request.Priority.Value);
    }

    // 4. Search assigned complaints
    if (!string.IsNullOrWhiteSpace(request.Search))
    {
        var search = $"%{request.Search.Trim()}%";

        query = query.Where(c =>
            EF.Functions.ILike(c.Title, search) ||
            EF.Functions.ILike(c.Description, search) ||
            EF.Functions.ILike(c.Category, search) ||
            EF.Functions.ILike(c.Location, search));
    }

    // 5. Count all matching complaints before pagination
    var totalCount = await query.CountAsync(
        cancellationToken);

    // 6. Apply sorting
    var sortBy = request.SortBy?.Trim().ToLowerInvariant()
                 ?? "createdat";

    var direction = request.SortDirection?.Trim().ToLowerInvariant()
                    ?? "desc";

    IOrderedQueryable<Complaint> orderedQuery =
        (sortBy, direction) switch
        {
            ("createdat", "asc") =>
                query.OrderBy(c => c.CreatedAt),

            ("title", "asc") =>
                query.OrderBy(c => c.Title),

            ("title", "desc") =>
                query.OrderByDescending(c => c.Title),

            ("priority", "asc") =>
                query.OrderBy(c => c.Priority),

            ("priority", "desc") =>
                query.OrderByDescending(c => c.Priority),

            ("status", "asc") =>
                query.OrderBy(c => c.Status),

            ("status", "desc") =>
                query.OrderByDescending(c => c.Status),

            _ =>
                query.OrderByDescending(c => c.CreatedAt)
        };

    // Stable ordering when sort values are identical
    orderedQuery = orderedQuery.ThenBy(c => c.Id);

    // 7. Calculate pagination offset safely
    var offset =
        ((long)request.Page - 1) * request.PageSize;

    var complaints = offset > int.MaxValue
        ? new List<ComplaintResponse>()
        : await orderedQuery
            .Skip((int)offset)
            .Take(request.PageSize)
            .Select(ComplaintProjections.ToResponse)
            .ToListAsync(cancellationToken);

    // 8. Return paginated response
    return new PaginatedResponse<ComplaintResponse>
    {
        Page = request.Page,
        PageSize = request.PageSize,
        TotalCount = totalCount,
        TotalPages = (int)Math.Ceiling(
            totalCount / (double)request.PageSize),
        Items = complaints
    };
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
    
    
    public async Task<List<ComplaintCommentResponse>> GetCommentsAsync(
        Guid complaintId,
        CancellationToken cancellationToken = default)
    {
        return await context.ComplaintComments
            .AsNoTracking()
            .Where(c =>
                c.ComplaintId == complaintId)
            .OrderBy(c =>
                c.CreatedAtUtc)
            .Select(c =>
                new ComplaintCommentResponse
                {
                    Id = c.Id,
                    ComplaintId = c.ComplaintId,
                    Message = c.Message,

                    CreatedBy =
                        new UserSummaryResponse
                        {
                            Id = c.CreatedByUser.Id,
                            FirstName = c.CreatedByUser.FirstName,
                            LastName = c.CreatedByUser.LastName,
                            Email = c.CreatedByUser.Email
                        },

                    CreatedAtUtc = c.CreatedAtUtc
                })
            .ToListAsync(cancellationToken);
    }
}