using System.Net;
using System.Net.Http.Headers;
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

public class CitizenComplaintWithdrawalSecurityTests
{
    [Fact]
    public async Task Withdraw_EnforcesOwnershipAndStatusRules()
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
        var reviewId = Guid.NewGuid();

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

            Complaint MakeComplaint(
                Guid id,
                ComplaintStatus status) => new()
            {
                Id = id,
                Title = "Test complaint",
                Description = "Security integration test",
                Category = "Infrastructure",
                Location = "Pokhara",
                SubmittedByUserId = ownerId,
                Status = status
            };

            db.Complaints.AddRange(
                MakeComplaint(
                    complaintId,
                    ComplaintStatus.Submitted),
                MakeComplaint(
                    reviewId,
                    ComplaintStatus.UnderReview));

            await db.SaveChangesAsync();

            var ownerToken = tokens.CreateToken(
                owner, new[] { AppRoles.Citizen });

            var otherToken = tokens.CreateToken(
                other, new[] { AppRoles.Citizen });

            async Task<HttpResponseMessage> WithdrawAsync(
                Guid id,
                string? token)
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Patch,
                    $"/api/complaints/{id}/withdraw");

                if (token is not null)
                {
                    request.Headers.Authorization =
                        new AuthenticationHeaderValue(
                            "Bearer", token);
                }

                return await client.SendAsync(request);
            }

            async Task<ComplaintStatus> SavedStatusAsync(
                Guid id) =>
                await db.Complaints
                    .AsNoTracking()
                    .Where(c => c.Id == id)
                    .Select(c => c.Status)
                    .SingleAsync();

            // Anonymous withdrawal is rejected.
            using (var response = await WithdrawAsync(
                complaintId, null))
            {
                Assert.Equal(
                    HttpStatusCode.Unauthorized,
                    response.StatusCode);
            }

            // Another citizen cannot withdraw it.
            using (var response = await WithdrawAsync(
                complaintId, otherToken))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            Assert.Equal(
                ComplaintStatus.Submitted,
                await SavedStatusAsync(complaintId));

            // Owner can withdraw an eligible complaint.
            using (var response = await WithdrawAsync(
                complaintId, ownerToken))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);
            }

            Assert.Equal(
                ComplaintStatus.Withdrawn,
                await SavedStatusAsync(complaintId));

            // Withdrawal must create the correct history.
            var history = await db.ComplaintStatusHistories
                .AsNoTracking()
                .SingleAsync(
                    h => h.ComplaintId == complaintId);

            Assert.Equal(
                ComplaintStatus.Submitted,
                history.OldStatus);

            Assert.Equal(
                ComplaintStatus.Withdrawn,
                history.NewStatus);

            Assert.Equal(ownerId, history.ChangedByUserId);

            // A withdrawn complaint cannot be withdrawn twice.
            using (var response = await WithdrawAsync(
                complaintId, ownerToken))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            // A complaint under review cannot be withdrawn.
            using (var response = await WithdrawAsync(
                reviewId, ownerToken))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            Assert.Equal(
                ComplaintStatus.UnderReview,
                await SavedStatusAsync(reviewId));

            // Rejected requests must not create extra history.
            Assert.Equal(
                1,
                await db.ComplaintStatusHistories
                    .CountAsync(
                        h => h.ComplaintId == complaintId));

            Assert.Equal(
                0,
                await db.ComplaintStatusHistories
                    .CountAsync(
                        h => h.ComplaintId == reviewId));
        }
        finally
        {
            var ids = new[] { complaintId, reviewId };

            await db.ComplaintStatusHistories
                .Where(h => ids.Contains(h.ComplaintId))
                .ExecuteDeleteAsync();

            await db.Complaints
                .Where(c => ids.Contains(c.Id))
                .ExecuteDeleteAsync();

            if (otherCreated)
                await users.DeleteAsync(other);

            if (ownerCreated)
                await users.DeleteAsync(owner);
        }
    }
}
