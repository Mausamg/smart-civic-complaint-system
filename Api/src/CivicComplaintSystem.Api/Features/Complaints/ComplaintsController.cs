using System.Security.Claims;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Complaints.Attachments;
using CivicComplaintSystem.Api.Features.Complaints.Services;
using CivicComplaintSystem.Api.Features.Notifications;
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
    ComplaintAccessService complaintAccessService,
    NotificationService notificationService,
    ComplaintAttachmentService complaintAttachmentService)
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


    [HttpPatch("{id:guid}")]
    [Authorize(Roles = AppRoles.Citizen)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateComplaint(
        Guid id,
        UpdateComplaintRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(
                out var userId))
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });

        var complaint =
            await context.Complaints
                .FirstOrDefaultAsync(
                    c => c.Id == id,
                    cancellationToken);

        if (complaint is null)
            return NotFound(new
            {
                message = "Complaint not found."
            });

        if (complaint.SubmittedByUserId != userId)
            return Forbid();

        if (complaint.Status != ComplaintStatus.Submitted ||
            complaint.AssignedToUserId is not null)
            return BadRequest(new
            {
                message =
                    "Only submitted and unassigned complaints can be edited."
            });

        var hasChanges =
            request.Title is not null ||
            request.Description is not null ||
            request.Category is not null ||
            request.Location is not null;

        if (!hasChanges)
            return BadRequest(new
            {
                message =
                    "At least one field must be provided."
            });

        if (request.Title is not null &&
            string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new
            {
                message = "Title cannot be empty."
            });

        if (request.Description is not null &&
            string.IsNullOrWhiteSpace(request.Description))
            return BadRequest(new
            {
                message = "Description cannot be empty."
            });

        if (request.Category is not null &&
            string.IsNullOrWhiteSpace(request.Category))
            return BadRequest(new
            {
                message = "Category cannot be empty."
            });

        if (request.Location is not null &&
            string.IsNullOrWhiteSpace(request.Location))
            return BadRequest(new
            {
                message = "Location cannot be empty."
            });

        var hasActualChanges =
            request.Title is not null &&
            request.Title.Trim() != complaint.Title ||

            request.Description is not null &&
            request.Description.Trim() != complaint.Description ||

            request.Category is not null &&
            request.Category.Trim() != complaint.Category ||

            request.Location is not null &&
            request.Location.Trim() != complaint.Location;

        if (!hasActualChanges)
            return BadRequest(new
            {
                message =
                    "No changes detected."
            });

        await complaintCommandService.UpdateAsync(
            complaint,
            request,
            cancellationToken);

        return Ok(new
        {
            complaint.Id,
            complaint.Title,
            complaint.Description,
            complaint.Category,
            complaint.Location,

            Status =
                complaint.Status.ToString(),

            complaint.UpdatedAt
        });
    }


    [HttpPatch("{id:guid}/withdraw")]
    [Authorize(Roles = AppRoles.Citizen)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> WithdrawComplaint(
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
            await context.Complaints
                .FirstOrDefaultAsync(
                    c => c.Id == id,
                    cancellationToken);

        if (complaint is null)
            return NotFound(new
            {
                message = "Complaint not found."
            });

        if (complaint.SubmittedByUserId != userId)
            return Forbid();

        if (complaint.Status != ComplaintStatus.Submitted ||
            complaint.AssignedToUserId is not null)
            return BadRequest(new
            {
                message =
                    "Only submitted and unassigned complaints can be withdrawn."
            });

        await complaintCommandService.WithdrawAsync(
            complaint,
            userId,
            cancellationToken);

        return Ok(new
        {
            complaint.Id,

            Status =
                complaint.Status.ToString(),

            complaint.UpdatedAt
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
        var staffUserId =
            request.StaffUserId!.Value;

        if (staffUserId == Guid.Empty)
            return BadRequest(new
            {
                message = "StaffUserId must be a valid non-empty GUID."
            });

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
            complaint.Status != ComplaintStatus.UnderReview &&
            complaint.Status != ComplaintStatus.InProgress)
            return BadRequest(new
            {
                message =
                    "Only submitted, under review, or in progress complaints can be assigned."
            });

        var staff =
            await userManager.FindByIdAsync(
                staffUserId.ToString());

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

        if (!staff.IsActive)
            return BadRequest(new
            {
                message =
                    "The selected staff member is inactive."
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

        await notificationService.CreateAsync(
            staff.Id,
            "New complaint assigned",
            $"You have been assigned complaint: {complaint.Title}",
            complaint.Id,
            cancellationToken);

        await notificationService.CreateAsync(
            complaint.SubmittedByUserId,
            "Complaint assigned",
            $"Your complaint \"{complaint.Title}\" has been assigned to a staff member.",
            complaint.Id,
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
        var priority =
            request.Priority!.Value;

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
            complaint.Status == ComplaintStatus.Rejected ||
            complaint.Status == ComplaintStatus.Withdrawn)
            return BadRequest(new
            {
                message =
                    "Priority cannot be changed for resolved, rejected, or withdrawn complaints."
            });

        if (complaint.Priority == request.Priority)
            return BadRequest(new
            {
                message =
                    $"Complaint priority is already {priority}."
            });

        var updatedComplaint =
            await complaintCommandService.UpdatePriorityAsync(
                id,
                priority,
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
        var newStatus =
            request.Status!.Value;

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
                newStatus))
            return BadRequest(new
            {
                message =
                    $"Cannot change complaint status from " +
                    $"{complaint.Status} to " +
                    $"{newStatus}."
            });

        await complaintCommandService.UpdateStatusAsync(
            complaint,
            newStatus,
            currentUserId,
            cancellationToken);

        await notificationService.CreateAsync(
            complaint.SubmittedByUserId,
            "Complaint status updated",
            $"Your complaint \"{complaint.Title}\" status changed to {complaint.Status}.",
            complaint.Id,
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

        await notificationService.CreateAsync(
            complaint.SubmittedByUserId,
            "New complaint's update",
            $"A new update was added to your complaint \"{complaint.Title}\".",
            complaint.Id,
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

    [HttpPost("{id:guid}/attachments")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UploadAttachment(
        Guid id,
        [FromForm] UploadComplaintAttachmentRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized(new
            {
                message = "Invalid user identity."
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

        if (complaint.Status == ComplaintStatus.Withdrawn)
            return BadRequest(new
            {
                message =
                    "Attachments cannot be uploaded to a withdrawn complaint."
            });

        var canUpload =
            complaint.SubmittedByUserId == userId ||
            User.IsInRole(AppRoles.Admin) ||
            complaint.AssignedToUserId == userId;

        if (!canUpload)
            return Forbid();

        if (request.File is null ||
            request.File.Length == 0)
            return BadRequest(new
            {
                message = "File is required."
            });

        var allowedExtensions = new[]
        {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp"
        };

        var extension =
            Path.GetExtension(
                    request.File.FileName)
                .ToLowerInvariant();

        if (!allowedExtensions.Contains(extension))
            return BadRequest(new
            {
                message =
                    "Only JPEG, PNG and WebP images are allowed."
            });

        const long maxFileSize =
            5 * 1024 * 1024;

        if (request.File.Length > maxFileSize)
            return BadRequest(new
            {
                message =
                    "Image size cannot exceed 5 MB."
            });


        var result =
            await complaintAttachmentService.UploadAsync(
                id,
                userId,
                request.File,
                cancellationToken);

        if (result.Attachment is null)
            return BadRequest(new
            {
                message = result.Error
            });

        var attachment =
            result.Attachment;

        return StatusCode(
            StatusCodes.Status201Created,
            new ComplaintAttachmentResponse
            {
                Id = attachment.Id,
                ComplaintId = attachment.ComplaintId,
                FileName = attachment.FileName,
                ContentType = attachment.ContentType,
                FileSize = attachment.FileSize,
                CreatedAtUtc = attachment.CreatedAtUtc
            });
    }


    [HttpGet("{id:guid}/attachments")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<ComplaintAttachmentResponse>>> GetAttachments(
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

        var attachments =
            await complaintAttachmentService.GetByComplaintIdAsync(
                id,
                cancellationToken);

        return Ok(attachments);
    }


    [HttpGet("{id:guid}/attachments/{attachmentId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAttachmentFile(
        Guid id,
        Guid attachmentId,
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

        var attachment =
            await complaintAttachmentService.GetByIdAsync(
                id,
                attachmentId,
                cancellationToken);

        if (attachment is null)
            return NotFound(new
            {
                message = "Attachment not found."
            });

        var filePath = Path.Combine(
            "wwwroot",
            "uploads",
            "complaints",
            attachment.StoredFileName);

        if (!System.IO.File.Exists(filePath))
            return NotFound(new
            {
                message = "Attachment file not found."
            });

        var contentType =
            Path.GetExtension(attachment.StoredFileName)
                    .ToLowerInvariant() switch
                {
                    ".jpg" or ".jpeg" => "image/jpeg",
                    ".png" => "image/png",
                    ".webp" => "image/webp",
                    _ => "application/octet-stream"
                };

        return PhysicalFile(
            Path.GetFullPath(filePath),
            contentType,
            attachment.FileName);
    }
}