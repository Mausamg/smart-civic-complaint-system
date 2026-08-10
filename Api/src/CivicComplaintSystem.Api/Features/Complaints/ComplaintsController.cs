using System.Linq.Expressions;
using System.Security.Claims;
using CivicComplaintSystem.Api.Data;
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
    UserManager<ApplicationUser> userManager)
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
        {
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });
        }

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
        {
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });
        }

        var complaints = await context.Complaints
            .AsNoTracking()
            .Where(c =>
                c.SubmittedByUserId == userId)
            .OrderByDescending(c =>
                c.CreatedAt)
            .Select(ComplaintResponseProjection)
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
        {
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });
        }

        var complaints = await context.Complaints
            .AsNoTracking()
            .Where(c =>
                c.AssignedToUserId == userId)
            .OrderByDescending(c =>
                c.UpdatedAt ?? c.CreatedAt)
            .Select(ComplaintResponseProjection)
            .ToListAsync();

        return Ok(complaints);
    }


    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var userIdValue =
            User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });
        }

        var complaint = await context.Complaints
            .AsNoTracking()
            .Where(c =>
                c.Id == id &&
                c.SubmittedByUserId == userId)
            .Select(ComplaintResponseProjection)
            .FirstOrDefaultAsync();

        if (complaint is null)
        {
            return NotFound(new
            {
                message = "Complaint not found."
            });
        }

        return Ok(complaint);
    }


    [HttpGet]
    [Authorize(Roles = AppRoles.Admin)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PaginatedResponse<ComplaintResponse>>> GetAll(
        [FromQuery] GetComplaintsRequest request)
    {
        if (request.Page < 1)
        {
            return BadRequest(new
            {
                message =
                    "Page must be greater than or equal to 1."
            });
        }

        if (request.PageSize < 1 ||
            request.PageSize > 100)
        {
            return BadRequest(new
            {
                message =
                    "PageSize must be between 1 and 100."
            });
        }
        
        if (request.CreatedFrom.HasValue &&
            request.CreatedTo.HasValue &&
            request.CreatedFrom.Value.Date >
            request.CreatedTo.Value.Date)
        {
            return BadRequest(new
            {
                message =
                    "CreatedFrom cannot be later than CreatedTo."
            });
        }
        

        var query = context.Complaints
            .AsNoTracking()
            .AsQueryable();
        
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = $"%{request.Search.Trim()}%";

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
                c.AssignedToUserId == request.AssignedToUserId.Value);
        }
        
        
        if (request.CreatedFrom.HasValue)
        {
            var createdFrom = DateTime.SpecifyKind(
                request.CreatedFrom.Value.Date,
                DateTimeKind.Utc);

            query = query.Where(c =>
                c.CreatedAt >= createdFrom);
        }

        if (request.CreatedTo.HasValue)
        {
            var createdToExclusive = DateTime.SpecifyKind(
                request.CreatedTo.Value.Date.AddDays(1),
                DateTimeKind.Utc);

            query = query.Where(c =>
                c.CreatedAt < createdToExclusive);
        }

        var totalCount =
            await query.CountAsync();

        var allowedSortFields = new[]
        {
            "createdat",
            "title",
            "category",
            "status"
        };

        var sortBy =
            request.SortBy?.Trim().ToLowerInvariant()
            ?? "createdat";

        var sortDirection =
            request.SortDirection?.Trim().ToLowerInvariant()
            ?? "desc";

        if (!allowedSortFields.Contains(sortBy))
        {
            return BadRequest(new
            {
                message =
                    "SortBy must be one of: createdAt, title, category, status."
            });
        }

        if (sortDirection is not ("asc" or "desc"))
        {
            return BadRequest(new
            {
                message =
                    "SortDirection must be either asc or desc."
            });
        }
        
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

            _ =>
                query.OrderByDescending(c => c.CreatedAt)
        };
        
        var complaints = await query
            .Skip(
                (request.Page - 1) *
                request.PageSize)
            .Take(request.PageSize)
            .Select(ComplaintResponseProjection)
            .ToListAsync();

        return Ok(
            new PaginatedResponse<ComplaintResponse>
            {
                Page = request.Page,
                PageSize = request.PageSize,
                TotalCount = totalCount,

                TotalPages =
                    (int)Math.Ceiling(
                        totalCount /
                        (double)request.PageSize),

                Items = complaints
            });
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
        {
            return NotFound(new
            {
                message = "Complaint not found."
            });
        }

        if (complaint.Status !=
            ComplaintStatus.UnderReview)
        {
            return BadRequest(new
            {
                message =
                    "Only complaints under review can be assigned."
            });
        }

        var staff = await userManager.FindByIdAsync(
            request.StaffUserId.ToString());

        if (staff is null)
        {
            return NotFound(new
            {
                message = "Staff user not found."
            });
        }

        var isStaff =
            await userManager.IsInRoleAsync(
                staff,
                AppRoles.Staff);

        if (!isStaff)
        {
            return BadRequest(new
            {
                message =
                    "The selected user does not have the Staff role."
            });
        }

        complaint.AssignedToUserId =
            staff.Id;

        complaint.Status =
            ComplaintStatus.Assigned;

        complaint.UpdatedAt =
            DateTime.UtcNow;

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
        {
            return NotFound(new
            {
                message = "Complaint not found."
            });
        }

        var currentUserIdValue =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(
                currentUserIdValue,
                out var currentUserId))
        {
            return Unauthorized(new
            {
                message =
                    "Invalid user identity."
            });
        }

        var isAdmin =
            User.IsInRole(AppRoles.Admin);

        if (!isAdmin &&
            complaint.AssignedToUserId !=
            currentUserId)
        {
            return Forbid();
        }

        if (!IsValidStatusTransition(
                complaint.Status,
                request.Status))
        {
            return BadRequest(new
            {
                message =
                    $"Cannot change complaint status from " +
                    $"{complaint.Status} to " +
                    $"{request.Status}."
            });
        }

        complaint.Status =
            request.Status;

        complaint.UpdatedAt =
            DateTime.UtcNow;

        await context.SaveChangesAsync();

        return Ok(new
        {
            complaint.Id,

            Status =
                complaint.Status.ToString(),

            complaint.UpdatedAt
        });
    }


    private static bool IsValidStatusTransition(
        ComplaintStatus currentStatus,
        ComplaintStatus newStatus)
    {
        return currentStatus switch
        {
            ComplaintStatus.Submitted =>
                newStatus is
                    ComplaintStatus.UnderReview
                    or ComplaintStatus.Rejected,

            ComplaintStatus.UnderReview =>
                newStatus is
                    ComplaintStatus.Rejected,

            ComplaintStatus.Assigned =>
                newStatus is
                    ComplaintStatus.InProgress,

            ComplaintStatus.InProgress =>
                newStatus is
                    ComplaintStatus.Resolved,

            _ => false
        };
    }


    private static readonly
        Expression<Func<Complaint, ComplaintResponse>>
        ComplaintResponseProjection =
            c => new ComplaintResponse
            {
                Id = c.Id,
                Title = c.Title,
                Description = c.Description,
                Category = c.Category,
                Location = c.Location,

                Status =
                    c.Status.ToString(),

                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,

                SubmittedByUserId =
                    c.SubmittedByUserId,

                AssignedToUserId =
                    c.AssignedToUserId,

                SubmittedBy =
                    new UserSummaryResponse
                    {
                        Id =
                            c.SubmittedByUser.Id,

                        FirstName =
                            c.SubmittedByUser.FirstName,

                        LastName =
                            c.SubmittedByUser.LastName,

                        Email =
                            c.SubmittedByUser.Email
                    },

                AssignedTo =
                    c.AssignedToUser == null
                        ? null
                        : new UserSummaryResponse
                        {
                            Id =
                                c.AssignedToUser.Id,

                            FirstName =
                                c.AssignedToUser.FirstName,

                            LastName =
                                c.AssignedToUser.LastName,

                            Email =
                                c.AssignedToUser.Email
                        }
            };
}