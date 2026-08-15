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
    ComplaintQueryService complaintQueryService,
    ComplaintCommandService complaintCommandService,
    ComplaintAccessService complaintAccessService)
    : ControllerBase
{
    private bool TryGetCurrentUserId(
        out Guid userId)
    {
        var userIdValue =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        return Guid.TryParse(
            userIdValue,
            out userId);
    }


    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Create(
        CreateComplaintRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(
                out var userId))
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });

        var complaint =
            await complaintCommandService.CreateAsync(
                userId,
                request,
                cancellationToken);

        return StatusCode(
            StatusCodes.Status201Created,
            new
            {
                complaint.Id,
                complaint.Title,
                complaint.Description,
                complaint.Category,
                complaint.Location,

                Status =
                    complaint.Status.ToString(),

                Priority =
                    complaint.Priority.ToString(),

                complaint.CreatedAt
            });
    }


    [HttpGet("my")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMyComplaints(
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(
                out var userId))
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });

        var complaints =
            await complaintQueryService.GetMyComplaintsAsync(
                userId,
                cancellationToken);

        return Ok(complaints);
    }


    [HttpGet("assigned-to-me")]
    [Authorize(Roles = AppRoles.Staff)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAssignedToMe(
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(
                out var userId))
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });

        var complaints =
            await complaintQueryService.GetAssignedToMeAsync(
                userId,
                cancellationToken);

        return Ok(complaints);
    }


    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(
                out var userId))
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });

        var complaint =
            await complaintQueryService.GetByIdAsync(
                id,
                cancellationToken);

        if (complaint is null)
            return NotFound(new
            {
                message = "Complaint not found."
            });

        var canView =
            complaintAccessService.CanViewComplaint(
                userId,
                User.IsInRole(AppRoles.Admin),
                User.IsInRole(AppRoles.Staff),
                complaint.SubmittedByUserId,
                complaint.AssignedToUserId);

        if (!canView)
            return Forbid();

        return Ok(complaint);
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
        AssignComplaintRequest request,
        CancellationToken cancellationToken)
    {
        var complaint = await context.Complaints
            .FirstOrDefaultAsync(
                c => c.Id == id,
                cancellationToken);

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

        var staff =
            await userManager.FindByIdAsync(
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

        if (!TryGetCurrentUserId(
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

        await complaintCommandService.AssignAsync(
            complaint,
            staff.Id,
            currentUserId,
            cancellationToken);

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
        UpdateComplaintPriorityRequest request,
        CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(
                typeof(ComplaintPriority),
                request.Priority))
            return BadRequest(new
            {
                message = "Invalid complaint priority."
            });

        var complaint = await context.Complaints
            .AsNoTracking()
            .FirstOrDefaultAsync(
                c => c.Id == id,
                cancellationToken);

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

        var updatedComplaint =
            await complaintCommandService.UpdatePriorityAsync(
                id,
                request.Priority,
                cancellationToken);

        return Ok(new
        {
            updatedComplaint!.Id,

            Priority =
                updatedComplaint.Priority.ToString(),

            updatedComplaint.UpdatedAt
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
        UpdateComplaintStatusRequest request,
        CancellationToken cancellationToken)
    {
        var complaint = await context.Complaints
            .FirstOrDefaultAsync(
                c => c.Id == id,
                cancellationToken);

        if (complaint is null)
            return NotFound(new
            {
                message = "Complaint not found."
            });

        if (!TryGetCurrentUserId(
                out var currentUserId))
            return Unauthorized(new
            {
                message = "Invalid user identity."
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

        await complaintCommandService.UpdateStatusAsync(
            complaint,
            request.Status,
            currentUserId,
            cancellationToken);

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
    public async Task<ActionResult<List<ComplaintStatusHistoryResponse>>>
        GetHistory(
            Guid id,
            CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(
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
            .FirstOrDefaultAsync(
                cancellationToken);

        if (complaint is null)
            return NotFound(new
            {
                message = "Complaint not found."
            });

        var canView =
            complaintAccessService.CanViewComplaint(
                userId,
                User.IsInRole(AppRoles.Admin),
                User.IsInRole(AppRoles.Staff),
                complaint.SubmittedByUserId,
                complaint.AssignedToUserId);

        if (!canView)
            return Forbid();

        var history =
            await complaintQueryService.GetStatusHistoryAsync(
                id,
                cancellationToken);

        return Ok(history);
    }


    [HttpGet("{id:guid}/assignment-history")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<ComplaintAssignmentHistoryResponse>>>
        GetAssignmentHistory(
            Guid id,
            CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(
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
            .FirstOrDefaultAsync(
                cancellationToken);

        if (complaint is null)
            return NotFound(new
            {
                message = "Complaint not found."
            });

        var canView =
            complaintAccessService.CanViewComplaint(
                userId,
                User.IsInRole(AppRoles.Admin),
                User.IsInRole(AppRoles.Staff),
                complaint.SubmittedByUserId,
                complaint.AssignedToUserId);

        if (!canView)
            return Forbid();

        var history =
            await complaintQueryService.GetAssignmentHistoryAsync(
                id,
                cancellationToken);

        return Ok(history);
    }
    
    
    [HttpPost("{id:guid}/comments")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Staff}")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddComment(
        Guid id,
        AddComplaintCommentRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new
            {
                message = "Comment message is required."
            });

        var complaint = await context.Complaints
            .AsNoTracking()
            .FirstOrDefaultAsync(
                c => c.Id == id,
                cancellationToken);

        if (complaint is null)
            return NotFound(new
            {
                message = "Complaint not found."
            });

        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });

        var isAdmin =
            User.IsInRole(AppRoles.Admin);

        if (!isAdmin &&
            complaint.AssignedToUserId != userId)
            return Forbid();

        var comment =
            await complaintCommandService.AddCommentAsync(
                id,
                userId,
                request.Message,
                cancellationToken);

        return StatusCode(
            StatusCodes.Status201Created,
            new
            {
                comment.Id,
                comment.ComplaintId,
                comment.Message,
                comment.CreatedByUserId,
                comment.CreatedAtUtc
            });
    }
    
    
    [HttpGet("{id:guid}/comments")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<ComplaintCommentResponse>>> GetComments(
        Guid id,
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var userId))
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
            .FirstOrDefaultAsync(cancellationToken);

        if (complaint is null)
            return NotFound(new
            {
                message = "Complaint not found."
            });

        var canView =
            complaintAccessService.CanViewComplaint(
                userId,
                User.IsInRole(AppRoles.Admin),
                User.IsInRole(AppRoles.Staff),
                complaint.SubmittedByUserId,
                complaint.AssignedToUserId);

        if (!canView)
            return Forbid();

        var comments =
            await complaintQueryService.GetCommentsAsync(
                id,
                cancellationToken);

        return Ok(comments);
    }
}