using System.Linq.Expressions;
using System.ComponentModel.DataAnnotations;
using CivicComplaintSystem.Api.Features.Departments.Requests;
using CivicComplaintSystem.Api.Features.Users;
using Npgsql;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Departments.Responses;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Api.Features.Departments;

public sealed class DepartmentService(AppDbContext db)
{
    private static readonly Expression<Func<Department, DepartmentResponse>>
        ToResponse = department => new DepartmentResponse
        {
            Id = department.Id,

            Name = department.Name,

            Description = department.Description,

            IsActive = department.IsActive,

            HeadStaffUserId = department.HeadStaffUserId,

            HeadStaffName = department.HeadStaffUser == null
                ? null
                : department.HeadStaffUser.FirstName
                    + " "
                    + department.HeadStaffUser.LastName,

            ExpectedResolutionDays = department.ExpectedResolutionDays,

            DefaultPriority = department.DefaultPriority,

            CategoryKeys = department.Categories
                .Select(category => category.CategoryKey)
                .OrderBy(key => key)
                .ToList(),

            StaffCount = department.StaffMembers.Count(),

            ActiveComplaints = department.Complaints.Count(
                complaint =>
                    complaint.Status != ComplaintStatus.Resolved
                    && complaint.Status != ComplaintStatus.Rejected
                    && complaint.Status != ComplaintStatus.Withdrawn
            ),

            // Will be calculated from historical resolution events
            // in a subsequent implementation step.
            AverageResolutionDays = null,

            CreatedAtUtc = department.CreatedAtUtc,

            UpdatedAtUtc = department.UpdatedAtUtc
        };

    public async Task<List<DepartmentResponse>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await db.Departments
            .AsNoTracking()
            .OrderBy(department => department.Name)
            .Select(ToResponse)
            .ToListAsync(cancellationToken);
    }

    public async Task<DepartmentResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await db.Departments
            .AsNoTracking()
            .Where(department => department.Id == id)
            .Select(ToResponse)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static readonly HashSet<string> SupportedCategories =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "potholes",
            "garbage",
            "streetlights",
            "water",
            "drainage",
            "traffic_signals",
            "property_damage",
            "noise",
            "illegal_construction",
            "public_safety",
            "other"
        };

    public async Task<(
        bool Deleted,
        string? Error,
        bool Conflict,
        bool NotFound)> DeleteAsync(
            Guid id,
            CancellationToken cancellationToken = default)
    {
        var department = await db.Departments
            .FirstOrDefaultAsync(
                d => d.Id == id,
                cancellationToken
            );

        if (department is null)
        {
            return (
                false,
                "Department not found.",
                false,
                true
            );
        }

        // Active departments cannot be deleted.
        if (department.IsActive)
        {
            return (
                false,
                "Deactivate the department before deleting it.",
                true,
                false
            );
        }

        // Preserve explicit department-head relationships.
        if (department.HeadStaffUserId.HasValue)
        {
            return (
                false,
                "Remove the department head before deletion.",
                true,
                false
            );
        }

        // A department with assigned users must be retained.
        var hasStaff = await db.Users.AnyAsync(
            user => user.DepartmentId == id,
            cancellationToken
        );

        if (hasStaff)
        {
            return (
                false,
                "Reassign department staff before deletion.",
                true,
                false
            );
        }

        // Preserve historical complaint relationships,
        // including resolved, rejected, and withdrawn cases.
        var hasComplaints = await db.Complaints.AnyAsync(
            complaint => complaint.DepartmentId == id,
            cancellationToken
        );

        if (hasComplaints)
        {
            return (
                false,
                "Departments linked to complaints cannot be deleted. "
                    + "Deactivate and retain the department instead.",
                true,
                false
            );
        }

        db.Departments.Remove(department);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException pg
            && pg.SqlState ==
                PostgresErrorCodes.ForeignKeyViolation)
        {
            // Protect against a relationship added concurrently.
            db.ChangeTracker.Clear();

            return (
                false,
                "Department deletion was blocked by a related record.",
                true,
                false
            );
        }
        catch (DbUpdateConcurrencyException)
        {
            db.ChangeTracker.Clear();

            return (
                false,
                "The department was modified or removed concurrently.",
                true,
                false
            );
        }

        return (true, null, false, false);
    }

    public async Task<(
        DepartmentResponse? Department,
        string? Error,
        bool Conflict,
        bool NotFound)> SetActiveAsync(
            Guid id,
            bool isActive,
            CancellationToken cancellationToken = default)
    {
        var department = await db.Departments
            .FirstOrDefaultAsync(
                d => d.Id == id,
                cancellationToken
            );

        if (department is null)
        {
            return (
                null,
                "Department not found.",
                false,
                true
            );
        }

        // Repeating the current state is safe.
        if (department.IsActive == isActive)
        {
            var unchanged = await GetByIdAsync(
                id,
                cancellationToken
            );

            return (unchanged, null, false, false);
        }

        if (!isActive)
        {
            // Do not deactivate departments that still
            // contain assigned staff members.
            var hasAssignedStaff = await db.Users
                .AnyAsync(
                    user => user.DepartmentId == id,
                    cancellationToken
                );

            if (hasAssignedStaff)
            {
                return (
                    null,
                    "Reassign department staff before deactivation.",
                    true,
                    false
                );
            }

            // Unresolved complaints must be reassigned
            // before the department can be deactivated.
            var hasUnresolvedComplaints = await db.Complaints
                .AnyAsync(
                    complaint =>
                        complaint.DepartmentId == id
                        && complaint.Status != ComplaintStatus.Resolved
                        && complaint.Status != ComplaintStatus.Rejected
                        && complaint.Status != ComplaintStatus.Withdrawn,
                    cancellationToken
                );

            if (hasUnresolvedComplaints)
            {
                return (
                    null,
                    "Reassign or resolve active complaints before deactivation.",
                    true,
                    false
                );
            }
        }

        department.IsActive = isActive;
        department.UpdatedAtUtc = DateTime.UtcNow;

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            db.ChangeTracker.Clear();

            return (
                null,
                "The department was changed or removed concurrently.",
                true,
                false
            );
        }

        var updated = await GetByIdAsync(
            id,
            cancellationToken
        );

        return (updated, null, false, false);
    }

    public async Task<(
        DepartmentResponse? Department,
        string? Error,
        bool Conflict,
        bool NotFound)> UpdateAsync(
            Guid id,
            CreateDepartmentRequest request,
            CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            return (
                null,
                "Department details are required.",
                false,
                false
            );
        }

        var validationResults = new List<ValidationResult>();

        if (!Validator.TryValidateObject(
            request,
            new ValidationContext(request),
            validationResults,
            validateAllProperties: true))
        {
            return (
                null,
                validationResults.FirstOrDefault()?.ErrorMessage
                    ?? "Invalid department details.",
                false,
                false
            );
        }

        var name = request.Name.Trim();

        if (name.Length < 2 || name.Length > 120)
        {
            return (
                null,
                "Department name must contain 2 to 120 characters.",
                false,
                false
            );
        }

        var normalizedName = name.ToUpperInvariant();

        if (normalizedName.Length > 120)
        {
            return (null, "Department name is too long.", false, false);
        }

        var department = await db.Departments
            .Include(d => d.Categories)
            .FirstOrDefaultAsync(
                d => d.Id == id,
                cancellationToken
            );

        if (department is null)
        {
            return (null, "Department not found.", false, true);
        }

        var duplicate = await db.Departments
            .AnyAsync(
                d => d.Id != id
                    && d.NormalizedName == normalizedName,
                cancellationToken
            );

        if (duplicate)
        {
            return (
                null,
                "A department with this name already exists.",
                true,
                false
            );
        }

        var categoryKeys = request.CategoryKeys
            .Select(key => key.Trim().ToLowerInvariant())
            .ToList();

        if (
            categoryKeys.Count > SupportedCategories.Count
            || categoryKeys.Any(
                key => !SupportedCategories.Contains(key))
        )
        {
            return (
                null,
                "One or more complaint categories are unsupported.",
                false,
                false
            );
        }

        if (request.HeadStaffUserId.HasValue)
        {
            var headId = request.HeadStaffUserId.Value;
            var normalizedRole = AppRoles.Staff.ToUpperInvariant();

            var validHead = await (
                from user in db.Users
                join userRole in db.UserRoles
                    on user.Id equals userRole.UserId
                join role in db.Roles
                    on userRole.RoleId equals role.Id
                where user.Id == headId
                    && user.IsActive
                    && role.NormalizedName == normalizedRole
                select user.Id
            ).AnyAsync(cancellationToken);

            if (!validHead)
            {
                return (
                    null,
                    "Department head must be an active staff member.",
                    false,
                    false
                );
            }
        }

        // Update editable department properties.
        department.Name = name;
        department.NormalizedName = normalizedName;
        department.Description = string.IsNullOrWhiteSpace(
            request.Description)
                ? null
                : request.Description.Trim();

        department.HeadStaffUserId = request.HeadStaffUserId;
        department.ExpectedResolutionDays =
            request.ExpectedResolutionDays;
        department.DefaultPriority = request.DefaultPriority;
        department.UpdatedAtUtc = DateTime.UtcNow;

        // Synchronize categories while preserving unchanged rows.
        var requestedKeys = categoryKeys.ToHashSet(
            StringComparer.OrdinalIgnoreCase
        );

        var existingKeys = department.Categories
            .Select(c => c.CategoryKey)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var existing in department.Categories.ToList())
        {
            if (!requestedKeys.Contains(existing.CategoryKey))
            {
                db.DepartmentCategories.Remove(existing);
            }
        }

        foreach (var categoryKey in categoryKeys)
        {
            if (!existingKeys.Contains(categoryKey))
            {
                department.Categories.Add(
                    new DepartmentCategory
                    {
                        DepartmentId = department.Id,
                        CategoryKey = categoryKey
                    }
                );
            }
        }

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException pg
            && pg.SqlState == PostgresErrorCodes.UniqueViolation
            && pg.ConstraintName == "IX_Departments_NormalizedName")
        {
            // Avoid retaining invalid tracked changes after failure.
            db.ChangeTracker.Clear();

            return (
                null,
                "A department with this name already exists.",
                true,
                false
            );
        }
        catch (DbUpdateConcurrencyException)
        {
            db.ChangeTracker.Clear();

            return (
                null,
                "The department was modified or removed concurrently.",
                true,
                false
            );
        }

        var updated = await GetByIdAsync(
            id,
            cancellationToken
        );

        return (updated, null, false, false);
    }

    public async Task<(
        DepartmentResponse? Department,
        string? Error,
        bool Conflict)> CreateAsync(
            CreateDepartmentRequest request,
            CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            return (null, "Department details are required.", false);
        }

        var validationResults = new List<ValidationResult>();

        if (!Validator.TryValidateObject(
            request,
            new ValidationContext(request),
            validationResults,
            validateAllProperties: true))
        {
            return (
                null,
                validationResults.FirstOrDefault()?.ErrorMessage
                    ?? "Invalid department details.",
                false
            );
        }

        var name = request.Name.Trim();

        if (name.Length < 2 || name.Length > 120)
        {
            return (
                null,
                "Department name must contain 2 to 120 characters.",
                false
            );
        }

        var normalizedName = name.ToUpperInvariant();

        if (normalizedName.Length > 120)
        {
            return (null, "Department name is too long.", false);
        }

        var nameExists = await db.Departments
            .AnyAsync(
                department =>
                    department.NormalizedName == normalizedName,
                cancellationToken
            );

        if (nameExists)
        {
            return (
                null,
                "A department with this name already exists.",
                true
            );
        }

        var categoryKeys = request.CategoryKeys
            .Select(key => key.Trim().ToLowerInvariant())
            .ToList();

        if (
            categoryKeys.Count > SupportedCategories.Count
            || categoryKeys.Any(
                key => !SupportedCategories.Contains(key))
        )
        {
            return (
                null,
                "One or more complaint categories are unsupported.",
                false
            );
        }

        if (request.HeadStaffUserId.HasValue)
        {
            var headId = request.HeadStaffUserId.Value;
            var normalizedRole =
                AppRoles.Staff.ToUpperInvariant();

            var validHead = await (
                from user in db.Users
                join userRole in db.UserRoles
                    on user.Id equals userRole.UserId
                join role in db.Roles
                    on userRole.RoleId equals role.Id
                where user.Id == headId
                    && user.IsActive
                    && role.NormalizedName == normalizedRole
                select user.Id
            ).AnyAsync(cancellationToken);

            if (!validHead)
            {
                return (
                    null,
                    "Department head must be an active staff member.",
                    false
                );
            }
        }

        var department = new Department
        {
            Name = name,
            NormalizedName = normalizedName,
            Description = string.IsNullOrWhiteSpace(
                request.Description)
                    ? null
                    : request.Description.Trim(),
            HeadStaffUserId = request.HeadStaffUserId,
            ExpectedResolutionDays =
                request.ExpectedResolutionDays,
            DefaultPriority = request.DefaultPriority,
            IsActive = true,
            Categories = categoryKeys
                .Select(key => new DepartmentCategory
                {
                    CategoryKey = key
                })
                .ToList()
        };

        db.Departments.Add(department);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException pg
            && pg.SqlState == PostgresErrorCodes.UniqueViolation
            && pg.ConstraintName == "IX_Departments_NormalizedName")
        {
            return (
                null,
                "A department with this name already exists.",
                true
            );
        }

        var created = await GetByIdAsync(
            department.Id,
            cancellationToken
        );

        return (created, null, false);
    }

}
