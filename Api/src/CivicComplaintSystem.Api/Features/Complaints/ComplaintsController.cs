using System.Security.Claims;
using CivicComplaintSystem.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CivicComplaintSystem.Api.Features.Users;
using Microsoft.AspNetCore.Identity;

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
                complaint.Status,
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
            .Where(c => c.SubmittedByUserId == userId)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new
            {
                c.Id,
                c.Title,
                c.Description,
                c.Category,
                c.Location,
                Status = c.Status.ToString(),
                c.CreatedAt,
                c.UpdatedAt
            })
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
            .Select(c => new
            {
                c.Id,
                c.Title,
                c.Description,
                c.Category,
                c.Location,
                Status = c.Status.ToString(),
                c.CreatedAt,
                c.UpdatedAt
            })
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
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAll()
    {
        var complaints = await context.Complaints
            .AsNoTracking()
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new
            {
                c.Id,
                c.Title,
                c.Description,
                c.Category,
                c.Location,
                Status = c.Status.ToString(),
                c.CreatedAt,
                c.UpdatedAt,
                c.SubmittedByUserId,
                SubmittedBy = new
                {
                    c.SubmittedByUser.FirstName,
                    c.SubmittedByUser.LastName,
                    c.SubmittedByUser.Email
                }
            })
            .ToListAsync();

        return Ok(complaints);
    }
    
   
    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Staff}")]
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
            .FirstOrDefaultAsync(c => c.Id == id);

        if (complaint is null)
        {
            return NotFound(new
            {
                message = "Complaint not found."
            });
        }

        var currentUserIdValue =
            User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(currentUserIdValue, out var currentUserId))
        {
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });
        }

        var isAdmin = User.IsInRole(AppRoles.Admin);

        if (!isAdmin &&
            complaint.AssignedToUserId != currentUserId)
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
                    $"{complaint.Status} to {request.Status}."
            });
        }

        complaint.Status = request.Status;
        complaint.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();

        return Ok(new
        {
            complaint.Id,
            Status = complaint.Status.ToString(),
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
                newStatus is ComplaintStatus.UnderReview
                    or ComplaintStatus.Rejected,

            ComplaintStatus.UnderReview =>
                newStatus is ComplaintStatus.Rejected,

            ComplaintStatus.Assigned =>
                newStatus is ComplaintStatus.InProgress,

            ComplaintStatus.InProgress =>
                newStatus is ComplaintStatus.Resolved,

            _ => false
        };
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
            .FirstOrDefaultAsync(c => c.Id == id);

        if (complaint is null)
        {
            return NotFound(new
            {
                message = "Complaint not found."
            });
        }

        if (complaint.Status != ComplaintStatus.UnderReview)
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

        var isStaff = await userManager.IsInRoleAsync(
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

        complaint.AssignedToUserId = staff.Id;
        complaint.Status = ComplaintStatus.Assigned;
        complaint.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();

        return Ok(new
        {
            complaint.Id,
            Status = complaint.Status.ToString(),
            AssignedTo = new
            {
                staff.Id,
                staff.FirstName,
                staff.LastName,
                staff.Email
            },
            complaint.UpdatedAt
        });
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
            .Where(c => c.AssignedToUserId == userId)
            .OrderByDescending(c => c.UpdatedAt ?? c.CreatedAt)
            .Select(c => new
            {
                c.Id,
                c.Title,
                c.Description,
                c.Category,
                c.Location,
                Status = c.Status.ToString(),
                c.CreatedAt,
                c.UpdatedAt
            })
            .ToListAsync();

        return Ok(complaints);
    }
}