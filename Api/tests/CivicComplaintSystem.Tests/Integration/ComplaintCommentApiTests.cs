using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
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

public class ComplaintCommentApiTests
{
    [Fact]
    public async Task Citizen_CanReplyToOwnOpenComplaint()
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

        var citizenId = Guid.NewGuid();
        var complaintId = Guid.NewGuid();

        var citizen = new ApplicationUser
        {
            Id = citizenId,
            UserName = $"citizen-{citizenId}@test.local",
            Email = $"citizen-{citizenId}@test.local",
            FirstName = "Test",
            LastName = "Citizen",
            IsActive = true
        };

        var citizenCreated = false;

        var otherCitizenId = Guid.NewGuid();
        var otherCitizen = new ApplicationUser
        {
            Id = otherCitizenId,
            UserName = $"other-{otherCitizenId}@test.local",
            Email = $"other-{otherCitizenId}@test.local",
            FirstName = "Other",
            LastName = "Citizen",
            IsActive = true
        };

        var otherCitizenCreated = false;

        try
        {
            var result = await users.CreateAsync(citizen);
            Assert.True(result.Succeeded);
            citizenCreated = true;

            Assert.True((await users.AddToRoleAsync(
                citizen, AppRoles.Citizen)).Succeeded);

            db.Complaints.Add(new Complaint
            {
                Id = complaintId,
                Title = "Broken streetlight",
                Description = "Streetlight is not working",
                Category = "Infrastructure",
                Location = "Pokhara",
                SubmittedByUserId = citizenId,
                Status = ComplaintStatus.Submitted
            });

            await db.SaveChangesAsync();

            var token = tokens.CreateToken(
                citizen, new[] { AppRoles.Citizen });

            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"/api/complaints/{complaintId}/comments")
            {
                Content = JsonContent.Create(new
                {
                    message = "Please inspect the streetlight."
                })
            };

            request.Headers.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            using var response = await client.SendAsync(request);

            Assert.Equal(
                HttpStatusCode.Created,
                response.StatusCode);

            var comment = await db.ComplaintComments
                .AsNoTracking()
                .SingleAsync(c => c.ComplaintId == complaintId);

            Assert.Equal(
                "Please inspect the streetlight.",
                comment.Message);

            Assert.Equal(citizenId, comment.CreatedByUserId);

            // Verify the API returns author identity without email.
            using var commentsRequest = new HttpRequestMessage(
                HttpMethod.Get,
                $"/api/complaints/{complaintId}/comments");

            commentsRequest.Headers.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            using var commentsResponse =
                await client.SendAsync(commentsRequest);

            Assert.Equal(
                HttpStatusCode.OK,
                commentsResponse.StatusCode);

            using var document = JsonDocument.Parse(
                await commentsResponse.Content.ReadAsStringAsync());

            var returnedComment =
                Assert.Single(document.RootElement.EnumerateArray());

            var author = returnedComment.GetProperty("createdBy");

            Assert.Equal(
                citizenId.ToString(),
                author.GetProperty("id").GetString());

            Assert.Equal(
                "Test",
                author.GetProperty("firstName").GetString());

            Assert.Equal(
                "Citizen",
                author.GetProperty("lastName").GetString());

            Assert.DoesNotContain(
                author.EnumerateObject(),
                property => string.Equals(
                    property.Name,
                    "email",
                    StringComparison.OrdinalIgnoreCase));

            // Create a second citizen who does not own the complaint.
            var otherResult = await users.CreateAsync(otherCitizen);
            Assert.True(otherResult.Succeeded);
            otherCitizenCreated = true;

            Assert.True((await users.AddToRoleAsync(
                otherCitizen, AppRoles.Citizen)).Succeeded);

            var otherToken = tokens.CreateToken(
                otherCitizen, new[] { AppRoles.Citizen });

            // Another citizen cannot post a comment.
            using var deniedPost = new HttpRequestMessage(
                HttpMethod.Post,
                $"/api/complaints/{complaintId}/comments")
            {
                Content = JsonContent.Create(new
                {
                    message = "Unauthorized message"
                })
            };

            deniedPost.Headers.Authorization =
                new AuthenticationHeaderValue(
                    "Bearer", otherToken);

            using var deniedPostResponse =
                await client.SendAsync(deniedPost);

            Assert.Equal(
                HttpStatusCode.Forbidden,
                deniedPostResponse.StatusCode);

            // Another citizen cannot read the conversation.
            using var deniedGet = new HttpRequestMessage(
                HttpMethod.Get,
                $"/api/complaints/{complaintId}/comments");

            deniedGet.Headers.Authorization =
                new AuthenticationHeaderValue(
                    "Bearer", otherToken);

            using var deniedGetResponse =
                await client.SendAsync(deniedGet);

            Assert.Equal(
                HttpStatusCode.Forbidden,
                deniedGetResponse.StatusCode);

            // Unauthorized attempts must not create comments.
            Assert.Equal(
                1,
                await db.ComplaintComments.CountAsync(
                    c => c.ComplaintId == complaintId));

            // Close the complaint.
            await db.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(
                        c => c.Status,
                        ComplaintStatus.Resolved));

            // Citizens cannot reply to closed complaints.
            using var closedRequest = new HttpRequestMessage(
                HttpMethod.Post,
                $"/api/complaints/{complaintId}/comments")
            {
                Content = JsonContent.Create(new
                {
                    message = "Another reply after resolution"
                })
            };

            closedRequest.Headers.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            using var closedResponse =
                await client.SendAsync(closedRequest);

            Assert.Equal(
                HttpStatusCode.BadRequest,
                closedResponse.StatusCode);

            // The rejected reply must not be saved.
            Assert.Equal(
                1,
                await db.ComplaintComments.CountAsync(
                    c => c.ComplaintId == complaintId));
        }
        finally
        {
            await db.Notifications
                .Where(n => n.ComplaintId == complaintId)
                .ExecuteDeleteAsync();

            await db.ComplaintComments
                .Where(c => c.ComplaintId == complaintId)
                .ExecuteDeleteAsync();

            await db.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteDeleteAsync();

            if (otherCitizenCreated)
                await users.DeleteAsync(otherCitizen);

            if (citizenCreated)
                await users.DeleteAsync(citizen);
        }
    }
}
