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
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CivicComplaintSystem.Tests.Integration;

public class StatusChangeNotesApiTests
{
    [Fact]
    public async Task StatusNotes_EnforceAuthorization_AndAppearInHistory()
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
        var config = scope.ServiceProvider
            .GetRequiredService<IConfiguration>();

        var ownerId = Guid.NewGuid();
        var complaintId = Guid.NewGuid();

        var owner = new ApplicationUser
        {
            Id = ownerId,
            UserName = $"owner-{ownerId}@test.local",
            Email = $"owner-{ownerId}@test.local",
            FirstName = "Test",
            LastName = "Owner",
            IsActive = true
        };

        var ownerCreated = false;

        try
        {
            var result = await users.CreateAsync(owner);
            Assert.True(result.Succeeded);
            ownerCreated = true;

            Assert.True((await users.AddToRoleAsync(
                owner, AppRoles.Citizen)).Succeeded);

            db.Complaints.Add(new Complaint
            {
                Id = complaintId,
                Title = "Damaged road",
                Description = "Road needs repair",
                Category = "Road",
                Location = "Kathmandu",
                SubmittedByUserId = ownerId,
                Status = ComplaintStatus.Submitted
            });

            await db.SaveChangesAsync();

            var admin = await users.FindByEmailAsync(
                config["SeedAdmin:Email"]!);
            Assert.NotNull(admin);

            var adminToken = tokens.CreateToken(
                admin, await users.GetRolesAsync(admin));

            var ownerToken = tokens.CreateToken(
                owner, new[] { AppRoles.Citizen });

            // No JWT: 401
            using (var response = await PatchAsync(
                client, complaintId, null,
                "UnderReview", "Test note"))
            {
                Assert.Equal(
                    HttpStatusCode.Unauthorized,
                    response.StatusCode);
            }

            // Citizen cannot change status: 403
            using (var response = await PatchAsync(
                client, complaintId, ownerToken,
                "UnderReview", "Test note"))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            // Reject oversized notes: 400
            using (var response = await PatchAsync(
                client, complaintId, adminToken,
                "UnderReview", new string('A', 501)))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            // Admin changes status with a valid note.
            using (var response = await PatchAsync(
                client, complaintId, adminToken,
                "UnderReview", "  Inspection started.  "))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);
            }

            // Complaint owner reads the actual history API.
            using var historyRequest = new HttpRequestMessage(
                HttpMethod.Get,
                $"/api/complaints/{complaintId}/history");

            historyRequest.Headers.Authorization =
                new AuthenticationHeaderValue(
                    "Bearer", ownerToken);

            using var historyResponse =
                await client.SendAsync(historyRequest);

            Assert.Equal(
                HttpStatusCode.OK,
                historyResponse.StatusCode);

            var history = await historyResponse.Content
                .ReadFromJsonAsync<
                    List<ComplaintStatusHistoryResponse>>();

            Assert.NotNull(history);
            var entry = Assert.Single(history);

            Assert.Equal(
                "UnderReview", entry.NewStatus);
            Assert.Equal(
                "Inspection started.", entry.Note);
            Assert.Equal(
                admin.Id, entry.ChangedByUserId);

            var saved = await db.Complaints
                .AsNoTracking()
                .SingleAsync(c => c.Id == complaintId);

            Assert.Equal(
                ComplaintStatus.UnderReview,
                saved.Status);
        }
        finally
        {
            // Clean up only this test's records.
            await db.Notifications
                .Where(n => n.ComplaintId == complaintId)
                .ExecuteDeleteAsync();

            await db.ComplaintStatusHistories
                .Where(h => h.ComplaintId == complaintId)
                .ExecuteDeleteAsync();

            await db.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteDeleteAsync();

            if (ownerCreated)
                await users.DeleteAsync(owner);
        }
    }

    private static async Task<HttpResponseMessage> PatchAsync(
        HttpClient client,
        Guid complaintId,
        string? token,
        string status,
        string? note)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Patch,
            $"/api/complaints/{complaintId}/status");

        request.Content = JsonContent.Create(
            new { status, note });

        if (token is not null)
            request.Headers.Authorization =
                new AuthenticationHeaderValue(
                    "Bearer", token);

        return await client.SendAsync(request);
    }
}
