
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Auth;
using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CivicComplaintSystem.Tests.Integration;

public class ScopedComplaintPaginationTests
{
    [Fact]
    public async Task MyPaged_ReturnsOnlyOwnMatchingComplaints()
    {
        // Arrange: Prepare our dedicated test database
        var options = PostgresTestDb.CreateOptions();

        await using (var setup = new AppDbContext(options))
        {
            await setup.Database.MigrateAsync();
        }

        using var factory = new TestApiFactory();

        using var client = factory.CreateClient(
            new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost")
            });

        using var scope = factory.Services.CreateScope();

        var context = scope.ServiceProvider
            .GetRequiredService<AppDbContext>();

        var userManager = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();

        var tokenService = scope.ServiceProvider
            .GetRequiredService<JwtTokenService>();

        var citizen = NewCitizen();
        var otherCitizen = NewCitizen();

        var citizenCreated = false;
        var otherCreated = false;

        try
        {
            var firstResult =
                await userManager.CreateAsync(citizen);

            Assert.True(firstResult.Succeeded);
            citizenCreated = true;

            var secondResult =
                await userManager.CreateAsync(otherCitizen);

            Assert.True(secondResult.Succeeded);
            otherCreated = true;

            var roleResult = await userManager.AddToRoleAsync(
                citizen, AppRoles.Citizen);

            Assert.True(roleResult.Succeeded);

            var older = NewComplaint(
                citizen.Id,
                "Old streetlight issue",
                ComplaintStatus.Submitted,
                DateTime.UtcNow.AddDays(-3));

            var newer = NewComplaint(
                citizen.Id,
                "New streetlight issue",
                ComplaintStatus.Submitted,
                DateTime.UtcNow.AddDays(-1));

            var resolved = NewComplaint(
                citizen.Id,
                "Resolved issue",
                ComplaintStatus.Resolved,
                DateTime.UtcNow.AddDays(-2));

            var other = NewComplaint(
                otherCitizen.Id,
                "Other citizen issue",
                ComplaintStatus.Submitted,
                DateTime.UtcNow);

            context.Complaints.AddRange(
                older, newer, resolved, other);

            await context.SaveChangesAsync();

            var token = tokenService.CreateToken(
                citizen,
                new[] { AppRoles.Citizen });

            using var request = new HttpRequestMessage(
                HttpMethod.Get,
                "/api/complaints/my/paged" +
                "?page=2&pageSize=1&status=Submitted");

            request.Headers.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            // Act
            using var response =
                await client.SendAsync(request);

            // Assert
            Assert.Equal(
                HttpStatusCode.OK,
                response.StatusCode);

            var result = await response.Content
                .ReadFromJsonAsync<
                    PaginatedResponse<ComplaintResponse>>();

            Assert.NotNull(result);

            Assert.Equal(2, result.TotalCount);
            Assert.Equal(2, result.TotalPages);
            Assert.Equal(2, result.Page);
            Assert.Equal(1, result.PageSize);

            var complaint = Assert.Single(result.Items);

            Assert.Equal(older.Id, complaint.Id);
            Assert.Equal(citizen.Id,
                complaint.SubmittedByUserId);
        }
        finally
        {
            // Remove records created for this test
            await context.Complaints
                .Where(c =>
                    c.SubmittedByUserId == citizen.Id ||
                    c.SubmittedByUserId == otherCitizen.Id)
                .ExecuteDeleteAsync();

            if (otherCreated)
                await userManager.DeleteAsync(otherCitizen);

            if (citizenCreated)
                await userManager.DeleteAsync(citizen);
        }
    }
    
    [Theory]
    [InlineData("?page=0")]
    [InlineData("?page=-1")]
    [InlineData("?pageSize=0")]
    [InlineData("?pageSize=101")]
    public async Task MyPaged_InvalidPagination_Return400(
        string queryString)
    {
        // Arrange: Prepare PostgreSQL database
        var options = PostgresTestDb.CreateOptions();

        await using (var setup = new AppDbContext(options))
        {
            await setup.Database.MigrateAsync();
        }

        using var factory = new TestApiFactory();

        using var client = factory.CreateClient(
            new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost")
            });

        using var scope = factory.Services.CreateScope();

        var userManager = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();

        var tokenService = scope.ServiceProvider
            .GetRequiredService<JwtTokenService>();

        var citizen = NewCitizen();

        var createResult =
            await userManager.CreateAsync(citizen);

        Assert.True(createResult.Succeeded);

        try
        {
            var roleResult = await userManager.AddToRoleAsync(
                citizen,
                AppRoles.Citizen);

            Assert.True(roleResult.Succeeded);

            var token = tokenService.CreateToken(
                citizen,
                new[] { AppRoles.Citizen });

            using var request = new HttpRequestMessage(
                HttpMethod.Get,
                "/api/complaints/my/paged" + queryString);

            request.Headers.Authorization =
                new AuthenticationHeaderValue(
                    "Bearer",
                    token);

            // Act
            using var response =
                await client.SendAsync(request);

            // Assert
            Assert.Equal(
                HttpStatusCode.BadRequest,
                response.StatusCode);
        }
        finally
        {
            await userManager.DeleteAsync(citizen);
        }
    }
    
    
[Theory]
[InlineData(
    "Citizen",
    "/api/complaints/assigned-to-me/paged")]
[InlineData(
    "Staff",
    "/api/complaints/my/paged")]
public async Task PagedEndpoints_WrongRole_Return403(
    string role,
    string endpoint)
{
    // Arrange: Prepare the test database
    var options = PostgresTestDb.CreateOptions();

    await using (var setup = new AppDbContext(options))
    {
        await setup.Database.MigrateAsync();
    }

    using var factory = new TestApiFactory();

    using var client = factory.CreateClient(
        new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

    using var scope = factory.Services.CreateScope();

    var userManager = scope.ServiceProvider
        .GetRequiredService<UserManager<ApplicationUser>>();

    var tokenService = scope.ServiceProvider
        .GetRequiredService<JwtTokenService>();

    // Create a user for the given role
    var user = role == AppRoles.Citizen
        ? NewCitizen()
        : NewStaff();

    var createResult =
        await userManager.CreateAsync(user);

    Assert.True(
        createResult.Succeeded,
        string.Join(", ",
            createResult.Errors.Select(e => e.Description)));

    try
    {
        // Assign the role
        var roleResult = await userManager.AddToRoleAsync(
            user,
            role);

        Assert.True(roleResult.Succeeded);

        // Generate a valid JWT for that role
        var token = tokenService.CreateToken(
            user,
            new[] { role });

        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            endpoint);

        request.Headers.Authorization =
            new AuthenticationHeaderValue(
                "Bearer",
                token);

        // Act
        using var response =
            await client.SendAsync(request);

        // Assert
        Assert.Equal(
            HttpStatusCode.Forbidden,
            response.StatusCode);
    }
    finally
    {
        // Clean up the test user
        await userManager.DeleteAsync(user);
    }
}


    private static ApplicationUser NewStaff()
    {
        var id = Guid.NewGuid();
        var email = $"staff-{id}@test.local";

        return new ApplicationUser
        {
            Id = id,
            UserName = email,
            Email = email,
            FirstName = "Test",
            LastName = "Staff",
            IsActive = true
        };
    }
    
    
    [Theory]
    [InlineData("/api/complaints/my/paged")]
    [InlineData("/api/complaints/assigned-to-me/paged")]
    public async Task PagedEndpoints_WithoutToken_Return401(
        string endpoint)
    {
        // Arrange: Prepare the test database
        var options = PostgresTestDb.CreateOptions();

        await using (var setup = new AppDbContext(options))
        {
            await setup.Database.MigrateAsync();
        }

        using var factory = new TestApiFactory();

        using var client = factory.CreateClient(
            new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost")
            });

        // Act: Send request without JWT authentication
        using var response = await client.GetAsync(endpoint);

        // Assert: Authentication is required
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            response.StatusCode);
    }
    
    private static ApplicationUser NewCitizen()
    {
        var id = Guid.NewGuid();
        var email = $"citizen-{id}@test.local";

        return new ApplicationUser
        {
            Id = id,
            UserName = email,
            Email = email,
            FirstName = "Test",
            LastName = "Citizen",
            IsActive = true
        };
    }
    
[Fact]
public async Task AssignedPaged_ReturnsOnlyEligibleAssignedComplaints()
{
    // Arrange
    var options = PostgresTestDb.CreateOptions();

    await using (var setup = new AppDbContext(options))
    {
        await setup.Database.MigrateAsync();
    }

    using var factory = new TestApiFactory();

    using var client = factory.CreateClient(
        new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

    using var scope = factory.Services.CreateScope();

    var context = scope.ServiceProvider
        .GetRequiredService<AppDbContext>();

    var userManager = scope.ServiceProvider
        .GetRequiredService<UserManager<ApplicationUser>>();

    var tokenService = scope.ServiceProvider
        .GetRequiredService<JwtTokenService>();

    var citizen = NewCitizen();
    var staff = NewStaff();
    var otherStaff = NewStaff();

    var createdUsers = new List<ApplicationUser>();

    try
    {
        
        foreach (var user in new[] { citizen, staff, otherStaff })
        {
            var createResult = await userManager.CreateAsync(user);

            Assert.True(
                createResult.Succeeded,
                string.Join(", ",
                    createResult.Errors.Select(e => e.Description)));

            createdUsers.Add(user);
        }

        var roleResult = await userManager.AddToRoleAsync(
            staff, AppRoles.Staff);

        Assert.True(roleResult.Succeeded);

        var older = NewComplaint(
            citizen.Id,
            "Older assigned issue",
            ComplaintStatus.UnderReview,
            DateTime.UtcNow.AddDays(-3));

        older.AssignedToUserId = staff.Id;
        older.Priority = ComplaintPriority.High;

        var newer = NewComplaint(
            citizen.Id,
            "Newer assigned issue",
            ComplaintStatus.InProgress,
            DateTime.UtcNow.AddDays(-1));

        newer.AssignedToUserId = staff.Id;
        newer.Priority = ComplaintPriority.High;

        var resolved = NewComplaint(
            citizen.Id,
            "Resolved assigned issue",
            ComplaintStatus.Resolved,
            DateTime.UtcNow.AddDays(-2));

        resolved.AssignedToUserId = staff.Id;
        resolved.Priority = ComplaintPriority.High;

        var unrelated = NewComplaint(
            citizen.Id,
            "Other staff issue",
            ComplaintStatus.UnderReview,
            DateTime.UtcNow);

        unrelated.AssignedToUserId = otherStaff.Id;
        unrelated.Priority = ComplaintPriority.High;

        var lowPriority = NewComplaint(
            citizen.Id,
            "Low priority issue",
            ComplaintStatus.UnderReview,
            DateTime.UtcNow.AddDays(-4));

        lowPriority.AssignedToUserId = staff.Id;
        lowPriority.Priority = ComplaintPriority.Low;

        context.Complaints.AddRange(
            older, newer, resolved, unrelated, lowPriority);

        await context.SaveChangesAsync();

        var token = tokenService.CreateToken(
            staff,
            new[] { AppRoles.Staff });

        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            "/api/complaints/assigned-to-me/paged" +
            "?page=2&pageSize=1&priority=High");

        request.Headers.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadFromJsonAsync<
            PaginatedResponse<ComplaintResponse>>();

        Assert.NotNull(result);
        Assert.Equal(2, result.TotalCount);
        Assert.Equal(2, result.TotalPages);
        Assert.Equal(2, result.Page);
        Assert.Equal(1, result.PageSize);

        var complaint = Assert.Single(result.Items);

        Assert.Equal(older.Id, complaint.Id);
        Assert.Equal(staff.Id, complaint.AssignedToUserId);
    }
    finally
    {
        // Clean up only records belonging to this test
        await context.Complaints
            .Where(c => c.SubmittedByUserId == citizen.Id)
            .ExecuteDeleteAsync();

        context.ChangeTracker.Clear();

        foreach (var user in createdUsers.AsEnumerable().Reverse())
        {
            await userManager.DeleteAsync(user);
        }
    }
}

    private static Complaint NewComplaint(
        Guid citizenId,
        string title,
        ComplaintStatus status,
        DateTime createdAt)
    {
        return new Complaint
        {
            Id = Guid.NewGuid(),
            Title = title,
            Description = "Integration test complaint",
            Category = "Streetlight",
            Location = "Test location",
            Status = status,
            Priority = ComplaintPriority.Medium,
            SubmittedByUserId = citizenId,
            CreatedAt = createdAt
        };
    }
}
