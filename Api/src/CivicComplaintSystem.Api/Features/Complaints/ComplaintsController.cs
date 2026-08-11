using System.Security.Claims;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Complaints.Services;
using CivicComplaintSystem.Api.Features.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Api.Features.Complaints;

[ApiController]
[Route("api/complaints")]
[Authorize]
public sealed class ComplaintsController(
    AppDbContext context,
    UserManager<ApplicationUser> userManager,
    ComplaintQueryService complaintQueryService)
    : ControllerBase
{
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Create(
        CreateComplaintRequest request)
    {
        var userIdValue =
            User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(userIdValue, out var userId))
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });

        var complaint = new Complaint
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Category = request.Category.Trim(),
            Location = request.Location.Trim(),
            Status = ComplaintStatus.Submitted,
            CreatedAt = DateTime.UtcNow,
            SubmittedByUserId = userId
        };

        context.Complaints.Add(complaint);

        await context.SaveChangesAsync();

        return StatusCode(
            StatusCodes.Status201Created,
            new
            {
                complaint.Id,
                complaint.Title,
                complaint.Description,
                complaint.Category,
                complaint.Location,
                Status = complaint.Status.ToString(),
                Priority = complaint.Priority.ToString(),
                complaint.CreatedAt
            });
    }


    [HttpGet("my")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMyComplaints()
    {
        var userIdValue =
            User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(userIdValue, out var userId))
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });

        var complaints = await context.Complaints
            .AsNoTracking()
            .Where(c =>
                c.SubmittedByUserId == userId)
            .OrderByDescending(c =>
                c.CreatedAt)
            .Select(ComplaintProjections.ToResponse)
            .ToListAsync();

        return Ok(complaints);
    }


    [HttpGet("assigned-to-me")]
    [Authorize(Roles = AppRoles.Staff)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAssignedToMe()
    {
        var userIdValue =
            User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(userIdValue, out var userId))
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });

        var complaints = await context.Complaints
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
            .ToListAsync();

        return Ok(complaints);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var userIdValue =
            User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(userIdValue, out var userId))
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });

        var complaint = await context.Complaints
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new
            {
                Response = new ComplaintResponse
                {
                    Id = c.Id,
                    Title = c.Title,
                    Description = c.Description,
                    Category = c.Category,
                    Location = c.Location,

                    Status = c.Status.ToString(),

                    Priority =
                        c.Priority.ToString(),

                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt,

                    SubmittedByUserId =
                        c.SubmittedByUserId,

                    AssignedToUserId =
                        c.AssignedToUserId,

                    SubmittedBy =
                        new UserSummaryResponse
                        {
                            Id = c.SubmittedByUser.Id,
                            FirstName = c.SubmittedByUser.FirstName,
                            LastName = c.SubmittedByUser.LastName,
                            Email = c.SubmittedByUser.Email
                        },

                    AssignedTo =
                        c.AssignedToUser == null
                            ? null
                            : new UserSummaryResponse
                            {
                                Id = c.AssignedToUser.Id,
                                FirstName = c.AssignedToUser.FirstName,
                                LastName = c.AssignedToUser.LastName,
                                Email = c.AssignedToUser.Email
                            }
                },

                c.SubmittedByUserId,
                c.AssignedToUserId
            })
            .FirstOrDefaultAsync();

        if (complaint is null)
            return NotFound(new
            {
                message = "Complaint not found."
            });

        var isAdmin =
            User.IsInRole(AppRoles.Admin);

        var isStaff =
            User.IsInRole(AppRoles.Staff);

        var isOwner =
            complaint.SubmittedByUserId == userId;

        var isAssignedStaff =
            isStaff &&
            complaint.AssignedToUserId == userId;

        if (!isAdmin &&
            !isOwner &&
            !isAssignedStaff)
            return Forbid();

        return Ok(complaint.Response);
    }


    [HttpGet]
    [Authorize(Roles = AppRoles.Admin)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PaginatedResponse<ComplaintResponse>>> GetAll(
        [FromQuery] GetComplaintsRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Page < 1)
            return BadRequest(new
            {
                message =
                    "Page must be greater than or equal to 1."
            });

        if (request.PageSize < 1 ||
            request.PageSize > 100)
            return BadRequest(new
            {
                message =
                    "PageSize must be between 1 and 100."
            });

        if (request.CreatedFrom.HasValue &&
            request.CreatedTo.HasValue &&
            request.CreatedFrom.Value.Date >
            request.CreatedTo.Value.Date)
            return BadRequest(new
            {
                message =
                    "CreatedFrom cannot be later than CreatedTo."
            });

        var allowedSortFields = new[]
        {
            "createdat",
            "title",
            "category",
            "status",
            "priority"
        };

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

        if (!allowedSortFields.Contains(sortBy))
            return BadRequest(new
            {
                message =
                    "SortBy must be one of: createdAt, title, category, status, priority."
            });

        if (sortDirection is not ("asc" or "desc"))
            return BadRequest(new
            {
                message =
                    "SortDirection must be either asc or desc."
            });

        var result =
            await complaintQueryService.GetAllAsync(
                request,
                cancellationToken);

        return Ok(result);
    }


    [HttpPatch("{id:guid}/assign")]
[Authorize(Roles = AppRoles.Admin)]
[ProducesResponseType(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status400BadRequest)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
public async Task<IActionResult> AssignComplaint(
    Guid id,
    AssignComplaintRequest request)
{
    var complaint = await context.Complaints
        .FirstOrDefaultAsync(c =>
            c.Id == id);

    if (complaint is null)
        return NotFound(new
        {
            message = "Complaint not found."
        });

    if (complaint.Status != ComplaintStatus.Submitted &&
        complaint.Status != ComplaintStatus.UnderReview)
        return BadRequest(new
        {
            message =
                "Only submitted or under review complaints can be assigned."
        });

    var staff = await userManager.FindByIdAsync(
        request.StaffUserId.ToString());

    if (staff is null)
        return NotFound(new
        {
            message = "Staff user not found."
        });

    var isStaff =
        await userManager.IsInRoleAsync(
            staff,
            AppRoles.Staff);

    if (!isStaff)
        return BadRequest(new
        {
            message =
                "The selected user does not have the Staff role."
        });

    var currentUserIdValue =
        User.FindFirstValue(
            ClaimTypes.NameIdentifier);

    if (!Guid.TryParse(
            currentUserIdValue,
            out var currentUserId))
        return Unauthorized(new
        {
            message = "Invalid user identity."
        });

    if (complaint.AssignedToUserId == staff.Id)
        return BadRequest(new
        {
            message =
                "Complaint is already assigned to this staff member."
        });

    var now = DateTime.UtcNow;

    var oldAssignedToUserId =
        complaint.AssignedToUserId;

    var assignmentHistory =
        new ComplaintAssignmentHistory
        {
            Id = Guid.NewGuid(),
            ComplaintId = complaint.Id,

            OldAssignedToUserId =
                oldAssignedToUserId,

            NewAssignedToUserId =
                staff.Id,

            ChangedByUserId =
                currentUserId,

            ChangedAtUtc =
                now,

            Note =
                oldAssignedToUserId.HasValue
                    ? "Complaint reassigned to another staff member."
                    : "Complaint assigned to staff."
        };

    context.ComplaintAssignmentHistories.Add(
        assignmentHistory);

    complaint.AssignedToUserId =
        staff.Id;

    if (complaint.Status ==
        ComplaintStatus.Submitted)
    {
        var oldStatus =
            complaint.Status;

        complaint.Status =
            ComplaintStatus.UnderReview;

        var statusHistory =
            new ComplaintStatusHistory
            {
                Id = Guid.NewGuid(),
                ComplaintId = complaint.Id,
                OldStatus = oldStatus,
                NewStatus =
                    ComplaintStatus.UnderReview,
                ChangedByUserId =
                    currentUserId,
                ChangedAtUtc = now,
                Note =
                    "Status automatically changed when complaint was assigned."
            };

        context.ComplaintStatusHistories.Add(
            statusHistory);
    }

    complaint.UpdatedAt =
        now;

    await context.SaveChangesAsync();

    return Ok(new
    {
        complaint.Id,

        Status =
            complaint.Status.ToString(),

        AssignedTo =
            new UserSummaryResponse
            {
                Id = staff.Id,
                FirstName = staff.FirstName,
                LastName = staff.LastName,
                Email = staff.Email
            },

        complaint.UpdatedAt
    });
}


    [HttpPatch("{id:guid}/priority")]
    [Authorize(Roles = AppRoles.Admin)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdatePriority(
        Guid id,
        UpdateComplaintPriorityRequest request)
    {
        if (!Enum.IsDefined(
                typeof(ComplaintPriority),
                request.Priority))
            return BadRequest(new
            {
                message = "Invalid complaint priority."
            });

        var complaint = await context.Complaints
            .FirstOrDefaultAsync(c =>
                c.Id == id);

        if (complaint is null)
            return NotFound(new
            {
                message = "Complaint not found."
            });

        if (complaint.Status == ComplaintStatus.Resolved ||
            complaint.Status == ComplaintStatus.Rejected)
            return BadRequest(new
            {
                message =
                    "Priority cannot be changed for resolved or rejected complaints."
            });
        
        if (complaint.Priority == request.Priority)
            return BadRequest(new
            {
                message =
                    $"Complaint priority is already {request.Priority}."
            });

        complaint.Priority =
            request.Priority;

        complaint.UpdatedAt =
            DateTime.UtcNow;

        await context.SaveChangesAsync();

        return Ok(new
        {
            complaint.Id,

            Priority =
                complaint.Priority.ToString(),

            complaint.UpdatedAt
        });
    }


    [HttpPatch("{id:guid}/status")]
    [Authorize(
        Roles = $"{AppRoles.Admin},{AppRoles.Staff}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(
        Guid id,
        UpdateComplaintStatusRequest request)
    {
        var complaint = await context.Complaints
            .FirstOrDefaultAsync(c =>
                c.Id == id);

        if (complaint is null)
            return NotFound(new
            {
                message = "Complaint not found."
            });

        var currentUserIdValue =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(
                currentUserIdValue,
                out var currentUserId))
            return Unauthorized(new
            {
                message =
                    "Invalid user identity."
            });

        var isAdmin =
            User.IsInRole(AppRoles.Admin);

        if (!isAdmin &&
            complaint.AssignedToUserId != currentUserId)
            return Forbid();

        if (!ComplaintStatusRules.CanTransition(
                complaint.Status,
                request.Status))
            return BadRequest(new
            {
                message =
                    $"Cannot change complaint status from " +
                    $"{complaint.Status} to " +
                    $"{request.Status}."
            });

        var oldStatus = complaint.Status;
        var now = DateTime.UtcNow;

        complaint.Status = request.Status;
        complaint.UpdatedAt = now;

        var history = new ComplaintStatusHistory
        {
            Id = Guid.NewGuid(),
            ComplaintId = complaint.Id,
            OldStatus = oldStatus,
            NewStatus = request.Status,
            ChangedByUserId = currentUserId,
            ChangedAtUtc = now,
            Note = null
        };

        context.ComplaintStatusHistories.Add(history);

        await context.SaveChangesAsync();

        return Ok(new
        {
            complaint.Id,

            Status =
                complaint.Status.ToString(),

            complaint.UpdatedAt
        });
    }


    [HttpGet("{id:guid}/history")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<ComplaintStatusHistoryResponse>>> GetHistory(
        Guid id)
    {
        var userIdValue =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(
                userIdValue,
                out var userId))
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });

        var complaint = await context.Complaints
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new
            {
                c.SubmittedByUserId,
                c.AssignedToUserId
            })
            .FirstOrDefaultAsync();

        if (complaint is null)
            return NotFound(new
            {
                message = "Complaint not found."
            });

        var isAdmin =
            User.IsInRole(AppRoles.Admin);

        var isStaff =
            User.IsInRole(AppRoles.Staff);

        var isOwner =
            complaint.SubmittedByUserId == userId;

        var isAssignedStaff =
            isStaff &&
            complaint.AssignedToUserId == userId;

        if (!isAdmin &&
            !isOwner &&
            !isAssignedStaff)
            return Forbid();

        var history = await context.ComplaintStatusHistories
            .AsNoTracking()
            .Where(h =>
                h.ComplaintId == id)
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
            .ToListAsync();

        return Ok(history);
    }
    
    [HttpGet("{id:guid}/assignment-history")]
[ProducesResponseType(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
public async Task<ActionResult<List<ComplaintAssignmentHistoryResponse>>> GetAssignmentHistory(
    Guid id)
{
    var userIdValue =
        User.FindFirstValue(
            ClaimTypes.NameIdentifier);

    if (!Guid.TryParse(
            userIdValue,
            out var userId))
        return Unauthorized(new
        {
            message = "Invalid user identity."
        });

    var complaint = await context.Complaints
        .AsNoTracking()
        .Where(c => c.Id == id)
        .Select(c => new
        {
            c.SubmittedByUserId,
            c.AssignedToUserId
        })
        .FirstOrDefaultAsync();

    if (complaint is null)
        return NotFound(new
        {
            message = "Complaint not found."
        });

    var isAdmin =
        User.IsInRole(AppRoles.Admin);

    var isStaff =
        User.IsInRole(AppRoles.Staff);

    var isOwner =
        complaint.SubmittedByUserId == userId;

    var isAssignedStaff =
        isStaff &&
        complaint.AssignedToUserId == userId;

    if (!isAdmin &&
        !isOwner &&
        !isAssignedStaff)
        return Forbid();

    var history = await context.ComplaintAssignmentHistories
        .AsNoTracking()
        .Where(h =>
            h.ComplaintId == id)
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
        .ToListAsync();

    return Ok(history);
}

}