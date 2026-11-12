using System.ComponentModel.DataAnnotations;
using CivicComplaintSystem.Api.Features.Departments.Requests;
using CivicComplaintSystem.Api.Features.Departments.Responses;
using CivicComplaintSystem.Api.Features.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CivicComplaintSystem.Api.Features.Departments;

[ApiController]
[Route("api/departments")]
[Authorize(Roles = AppRoles.Admin)]
public sealed class DepartmentsController(
    DepartmentService departmentService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<DepartmentResponse>>> GetAll(
        CancellationToken cancellationToken)
    {
        var departments = await departmentService.GetAllAsync(
            cancellationToken);

        return Ok(departments);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DepartmentResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var department = await departmentService.GetByIdAsync(
            id,
            cancellationToken);

        if (department is null)
        {
            return NotFound(new
            {
                message = "Department not found."
            });
        }

        return Ok(department);
    }

    [HttpPost]
    public async Task<ActionResult<DepartmentResponse>> Create(
        [FromBody] CreateDepartmentRequest request,
        CancellationToken cancellationToken)
    {
        var result = await departmentService.CreateAsync(
            request,
            cancellationToken);

        if (result.Conflict)
        {
            return Conflict(new { message = result.Error });
        }

        if (result.Error is not null)
        {
            return BadRequest(new { message = result.Error });
        }

        if (result.Department is null)
        {
            return Problem(
                "Department creation did not return a record.");
        }

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.Department.Id },
            result.Department);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DepartmentResponse>> Update(
        Guid id,
        [FromBody] CreateDepartmentRequest request,
        CancellationToken cancellationToken)
    {
        var result = await departmentService.UpdateAsync(
            id,
            request,
            cancellationToken);

        if (result.NotFound)
        {
            return NotFound(new { message = result.Error });
        }

        if (result.Conflict)
        {
            return Conflict(new { message = result.Error });
        }

        if (result.Error is not null)
        {
            return BadRequest(new { message = result.Error });
        }

        if (result.Department is null)
        {
            return Problem(
                "Department update did not return a record.");
        }

        return Ok(result.Department);
    }

    [HttpPatch("{id:guid}/active")]
    public async Task<ActionResult<DepartmentResponse>> SetActive(
        Guid id,
        [FromBody] SetDepartmentActiveRequest request,
        CancellationToken cancellationToken)
    {
        var result = await departmentService.SetActiveAsync(
            id,
            request.IsActive!.Value,
            cancellationToken);

        if (result.NotFound)
        {
            return NotFound(new { message = result.Error });
        }

        if (result.Conflict)
        {
            return Conflict(new { message = result.Error });
        }

        if (result.Error is not null)
        {
            return BadRequest(new { message = result.Error });
        }

        if (result.Department is null)
        {
            return Problem(
                "Department status update did not return a record.");
        }

        return Ok(result.Department);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await departmentService.DeleteAsync(
            id,
            cancellationToken);

        if (result.NotFound)
        {
            return NotFound(new { message = result.Error });
        }

        if (result.Conflict)
        {
            return Conflict(new { message = result.Error });
        }

        if (result.Error is not null)
        {
            return BadRequest(new { message = result.Error });
        }

        if (!result.Deleted)
        {
            return Problem(
                "Department deletion could not be confirmed.");
        }

        return NoContent();
    }
}

public sealed class SetDepartmentActiveRequest
{
    [Required]
    public bool? IsActive { get; init; }
}
