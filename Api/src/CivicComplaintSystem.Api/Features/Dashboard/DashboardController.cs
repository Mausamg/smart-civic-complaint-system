using System.Security.Claims;
using CivicComplaintSystem.Api.Features.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CivicComplaintSystem.Api.Features.Dashboard;

[ApiController]
[Route("api/dashboard")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Staff}")]
public sealed class DashboardController(
    DashboardService dashboardService)
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

    [HttpGet("stats")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<DashboardStatsResponse>> GetStats(
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(
                out var userId))
        {
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });
        }

        var isAdmin =
            User.IsInRole(AppRoles.Admin);

        var stats =
            await dashboardService.GetStatsAsync(
                userId,
                isAdmin,
                cancellationToken);

        return Ok(stats);
    }
    
    
    [HttpGet("category-breakdown")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<DashboardCategoryResponse>>>
        GetCategoryBreakdown(
            CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(
                out var userId))
        {
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });
        }

        var isAdmin =
            User.IsInRole(AppRoles.Admin);

        var breakdown =
            await dashboardService.GetCategoryBreakdownAsync(
                userId,
                isAdmin,
                cancellationToken);

        return Ok(breakdown);
    }
    
    
    [HttpGet("priority-breakdown")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<DashboardPriorityResponse>>>
        GetPriorityBreakdown(
            CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(
                out var userId))
        {
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });
        }

        var isAdmin =
            User.IsInRole(AppRoles.Admin);

        var breakdown =
            await dashboardService.GetPriorityBreakdownAsync(
                userId,
                isAdmin,
                cancellationToken);

        return Ok(breakdown);
    }
    
    
    [HttpGet("recent-complaints")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<DashboardRecentComplaintResponse>>>
        GetRecentComplaints(
            CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(
                out var userId))
        {
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });
        }

        var isAdmin =
            User.IsInRole(AppRoles.Admin);

        var complaints =
            await dashboardService.GetRecentComplaintsAsync(
                userId,
                isAdmin,
                cancellationToken);

        return Ok(complaints);
    }
    
    
    [HttpGet("monthly-trend")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<DashboardMonthlyTrendResponse>>>
        GetMonthlyTrend(
            CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(
                out var userId))
        {
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });
        }

        var isAdmin =
            User.IsInRole(AppRoles.Admin);

        var trend =
            await dashboardService.GetMonthlyTrendAsync(
                userId,
                isAdmin,
                cancellationToken);

        return Ok(trend);
    }
    
    
    [HttpGet("weekly-trend")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<DashboardWeeklyTrendResponse>>>
        GetWeeklyTrend(
            CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(
                out var userId))
        {
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });
        }

        var isAdmin =
            User.IsInRole(AppRoles.Admin);

        var trend =
            await dashboardService.GetWeeklyTrendAsync(
                userId,
                isAdmin,
                cancellationToken);

        return Ok(trend);
    }
}