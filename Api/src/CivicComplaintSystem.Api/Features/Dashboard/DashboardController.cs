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
    
    

    [HttpGet("yearly-trend")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<DashboardYearlyTrendResponse>>>
        GetYearlyTrend(
            CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var userId))
        {
            return Unauthorized(new
            {
                message = "Invalid user identity."
            });
        }

        var isAdmin = User.IsInRole(AppRoles.Admin);

        var trend = await dashboardService.GetYearlyTrendAsync(
            userId,
            isAdmin,
            cancellationToken);

        return Ok(trend);
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
    
    
    [HttpGet("resolution-metrics")]
    [Authorize(Roles = AppRoles.Admin)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<DashboardResolutionMetricsResponse>>
        GetResolutionMetrics(
            CancellationToken cancellationToken)
    {
        var metrics =
            await dashboardService.GetResolutionMetricsAsync(
                cancellationToken);

        return Ok(metrics);
    }
    
    
    [HttpGet("status-breakdown")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<DashboardStatusResponse>>>
        GetStatusBreakdown(
            [FromQuery] string? period,
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

        var selectedPeriod = period?.Trim().ToLowerInvariant();

        if (!string.IsNullOrEmpty(selectedPeriod) &&
            selectedPeriod != "weekly" &&
            selectedPeriod != "monthly" &&
            selectedPeriod != "yearly")
        {
            return BadRequest(new
            {
                message = "Period must be weekly, monthly, or yearly."
            });
        }

        var now = DateTime.UtcNow;

        DateTime? createdFromUtc = selectedPeriod switch
        {
            "weekly" => now.AddDays(-7),
            "monthly" => now.AddDays(-30),
            "yearly" => now.AddDays(-365),
            _ => null
        };

        var breakdown =
            await dashboardService.GetStatusBreakdownAsync(
                userId,
                isAdmin,
                cancellationToken,
                createdFromUtc);

        return Ok(breakdown);
    }
}