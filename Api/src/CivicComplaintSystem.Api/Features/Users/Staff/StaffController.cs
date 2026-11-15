using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Api.Features.Users.Staff.Requests;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using CivicComplaintSystem.Api.Features.Users.Staff.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CivicComplaintSystem.Api.Features.Users.Staff;

[ApiController]
[Route("api/users/staff")]
[Authorize(Roles = AppRoles.Admin)]
public sealed class StaffController(
    StaffService staffService,
    StaffPerformanceService performanceService,
    AppDbContext context,
    UserManager<ApplicationUser> userManager)
    : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(
        typeof(List<StaffResponse>),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(
        StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<StaffResponse>>>
        GetStaff(
            [FromQuery] bool? isActive)
    {
        var staff =
            await staffService.GetStaffAsync(
                isActive);

        return Ok(staff);
    }

    [HttpGet("{id:guid}/performance")]
    [ProducesResponseType(
        typeof(StaffPerformanceResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StaffPerformanceResponse>>
        GetPerformance(
            Guid id,
            CancellationToken cancellationToken)
    {
        var staff = await staffService.FindStaffAsync(id);

        if (staff is null)
        {
            return NotFound(new
            {
                message = "Staff user not found."
            });
        }

        var performance =
            await performanceService.GetAsync(
                id,
                cancellationToken);

        return Ok(performance);
    }

    [HttpPost]
    [ProducesResponseType(
        typeof(StaffResponse),
        StatusCodes.Status201Created)]
    [ProducesResponseType(
        StatusCodes.Status400BadRequest)]
    [ProducesResponseType(
        StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(
        StatusCodes.Status403Forbidden)]
    [ProducesResponseType(
        StatusCodes.Status409Conflict)]
    public async Task<ActionResult<StaffResponse>>
        CreateStaff(
            CreateStaffRequest request)
    {
        var (staff, result) =
            await staffService.CreateStaffAsync(
                request);

        if (!result.Succeeded)
        {
            var errors =
                result.Errors.ToList();

            var isDuplicateAccount =
                errors.Any(error =>
                    error.Code is
                        "DuplicateEmail" or
                        "DuplicateUserName");

            if (isDuplicateAccount)
            {
                return Conflict(new
                {
                    message =
                        "A user with this email already exists."
                });
            }

            return BadRequest(new
            {
                message =
                    "Staff account could not be created.",

                errors =
                    errors.Select(error =>
                        error.Description)
            });
        }

        return StatusCode(
            StatusCodes.Status201Created,
            staff);
    }


    [HttpPatch("{id:guid}/department")]
    [ProducesResponseType(typeof(StaffResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<StaffResponse>>
        UpdateStaffDepartment(
            Guid id,
            UpdateStaffDepartmentRequest request,
            CancellationToken cancellationToken)
    {
        var staff = await staffService.FindStaffAsync(id);

        if (staff is null)
            return NotFound(new
            {
                message = "Staff user not found."
            });

        if (request.DepartmentId == Guid.Empty)
            return BadRequest(new
            {
                message = "DepartmentId cannot be an empty GUID."
            });

        if (staff.DepartmentId == request.DepartmentId)
            return Ok(StaffService.ToResponse(staff));

        if (request.DepartmentId.HasValue)
        {
            var department = await context.Departments
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    d => d.Id == request.DepartmentId.Value,
                    cancellationToken);

            if (department is null)
                return NotFound(new
                {
                    message = "Department not found."
                });

            if (!department.IsActive)
                return BadRequest(new
                {
                    message = "Cannot assign an inactive department."
                });
        }

        // Handle null explicitly when clearing membership.
        var clearingDepartment = !request.DepartmentId.HasValue;

        // A department head must be replaced first.
        var isHeadElsewhere = await context.Departments
            .AnyAsync(
                d => d.HeadStaffUserId == staff.Id &&
                     (clearingDepartment ||
                      d.Id != request.DepartmentId),
                cancellationToken);

        if (isHeadElsewhere)
            return Conflict(new
            {
                message =
                    "Replace this staff member as department head " +
                    "before changing their department."
            });

        // Preserve department consistency for unresolved complaints.
        var hasIncompatibleComplaints =
            await context.Complaints.AnyAsync(
                c => c.AssignedToUserId == staff.Id &&
                     c.DepartmentId.HasValue &&
                     (clearingDepartment ||
                      c.DepartmentId != request.DepartmentId) &&
                     c.Status != ComplaintStatus.Resolved &&
                     c.Status != ComplaintStatus.Rejected &&
                     c.Status != ComplaintStatus.Withdrawn,
                cancellationToken);

        if (hasIncompatibleComplaints)
            return Conflict(new
            {
                message =
                    "Staff has active complaints in another department. " +
                    "Reassign those complaints before moving staff."
            });

        staff.DepartmentId = request.DepartmentId;

        var result = await userManager.UpdateAsync(staff);

        if (!result.Succeeded)
            return BadRequest(new
            {
                message = "Staff department update failed.",
                errors = result.Errors.Select(e => e.Description)
            });

        return Ok(StaffService.ToResponse(staff));
    }

    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(
        typeof(StaffResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status400BadRequest)]
    [ProducesResponseType(
        StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(
        StatusCodes.Status403Forbidden)]
    [ProducesResponseType(
        StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StaffResponse>>
        UpdateStaffStatus(
            Guid id,
            UpdateStaffStatusRequest request)
    {
        var staff =
            await staffService.FindStaffAsync(id);

        if (staff is null)
        {
            return NotFound(new
            {
                message = "Staff user not found."
            });
        }

        if (staff.IsActive == request.IsActive)
        {
            return Ok(
                StaffService.ToResponse(staff));
        }

        var result =
            await staffService.UpdateStaffStatusAsync(
                staff,
                request.IsActive);

        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                message =
                    "Staff status could not be updated.",

                errors =
                    result.Errors
                        .Select(error =>
                            error.Description)
            });
        }

        return Ok(
            StaffService.ToResponse(staff));
    }
}