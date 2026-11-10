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

public class CitizenComplaintEditSecurityTests
{
    [Fact]
    public async Task CitizenEdit_RequiresOwnershipAndEligibleStatus()
    {
        var options = PostgresTestDb.CreateOptions();

        await using (var setup = new AppDbContext(options))
            await setup.Database.MigrateAsync();

        using var factory = new TestApiFactory();

        using var client = factory.CreateClient(
            new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost"),
                AllowAutoRedirect = false
            });

        using var scope = factory.Services.CreateScope();

        var db = scope.ServiceProvider
            .GetRequiredService<AppDbContext>();

        var users = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();

        var tokens = scope.ServiceProvider
            .GetRequiredService<JwtTokenService>();

        var ownerId = Guid.NewGuid();
        var otherId = Guid.NewGuid();
        var complaintId = Guid.NewGuid();

        ApplicationUser MakeCitizen(Guid id) => new()
        {
            Id = id,
            UserName = $"citizen-{id}@test.local",
            Email = $"citizen-{id}@test.local",
            FirstName = "Test",
            LastName = "Citizen",
            IsActive = true
        };

        var owner = MakeCitizen(ownerId);
        var other = MakeCitizen(otherId);

        var ownerCreated = false;
        var otherCreated = false;

        try
        {
            Assert.True((await users.CreateAsync(owner)).Succeeded);
            ownerCreated = true;

            Assert.True((await users.AddToRoleAsync(
                owner, AppRoles.Citizen)).Succeeded);

            Assert.True((await users.CreateAsync(other)).Succeeded);
            otherCreated = true;

            Assert.True((await users.AddToRoleAsync(
                other, AppRoles.Citizen)).Succeeded);

            db.Complaints.Add(new Complaint
            {
                Id = complaintId,
                Title = "Original title",
                Description = "Original description",
                Category = "Infrastructure",
                Location = "Pokhara",
                SubmittedByUserId = ownerId,
                Status = ComplaintStatus.Submitted
            });

            await db.SaveChangesAsync();

            var ownerToken = tokens.CreateToken(
                owner, new[] { AppRoles.Citizen });

            var otherToken = tokens.CreateToken(
                other, new[] { AppRoles.Citizen });

            async Task<HttpResponseMessage> EditAsync(
                string? token,
                string title)
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Patch,
                    $"/api/complaints/{complaintId}")
                {
                    Content = JsonContent.Create(new { title })
                };

                if (token is not null)
                {
                    request.Headers.Authorization =
                        new AuthenticationHeaderValue(
                            "Bearer", token);
                }

                return await client.SendAsync(request);
            }

            async Task<string> SavedTitleAsync() =>
                await db.Complaints
                    .AsNoTracking()
                    .Where(c => c.Id == complaintId)
                    .Select(c => c.Title)
                    .SingleAsync();

            // Anonymous users must not edit complaints.
            using (var response = await EditAsync(
                null, "Anonymous edit"))
            {
                Assert.Equal(
                    HttpStatusCode.Unauthorized,
                    response.StatusCode);
            }

            // A different citizen must not edit this complaint.
            using (var response = await EditAsync(
                otherToken, "Unauthorized edit"))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            Assert.Equal(
                "Original title",
                await SavedTitleAsync());

            // The owner may edit a submitted, unassigned complaint.
            using (var response = await EditAsync(
                ownerToken, "Updated by owner"))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);
            }

            Assert.Equal(
                "Updated by owner",
                await SavedTitleAsync());

            // Move the complaint into review.
            await db.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(
                        c => c.Status,
                        ComplaintStatus.UnderReview));

            // Even the owner must not edit it after review begins.
            using (var response = await EditAsync(
                ownerToken, "Invalid late edit"))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            // Rejected requests must not change saved data.
            Assert.Equal(
                "Updated by owner",
                await SavedTitleAsync());
        }
        finally
        {
            await db.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteDeleteAsync();

            if (otherCreated)
                await users.DeleteAsync(other);

            if (ownerCreated)
                await users.DeleteAsync(owner);
        }
    }
}
