using CivicComplaintSystem.Api.Features.Users.Staff.Requests;
using CivicComplaintSystem.Api.Features.Users.Staff.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CivicComplaintSystem.Api.Features.Users.Staff;

[ApiController]
[Route("api/users/staff")]
[Authorize(Roles = AppRoles.Admin)]
public sealed class StaffController(
    StaffService staffService)
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
    public async Task<ActionResult<StaffResponse>>
        CreateStaff(
            CreateStaffRequest request)
    {
        var (staff, result) =
            await staffService.CreateStaffAsync(
                request);

        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                message =
                    "Staff account could not be created.",

                errors =
                    result.Errors
                        .Select(error =>
                            error.Description)
            });
        }

        return StatusCode(
            StatusCodes.Status201Created,
            staff);
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