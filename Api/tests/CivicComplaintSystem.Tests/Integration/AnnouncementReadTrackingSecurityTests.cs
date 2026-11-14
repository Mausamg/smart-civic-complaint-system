using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Announcements.Responses;
using CivicComplaintSystem.Api.Features.Auth;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CivicComplaintSystem.Tests.Integration;

[Collection("ComplaintDepartmentRoutingNonParallel")]
public sealed class AnnouncementReadTrackingSecurityTests
{
    [Fact]
    public async Task ReadTracking_IsPrivate_Idempotent_AndVisibilityAware()
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

        var admin = await users.FindByEmailAsync(
            config["SeedAdmin:Email"]!);

        Assert.NotNull(admin);

        var adminToken = tokens.CreateToken(
            admin,
            await users.GetRolesAsync(admin));

        var firstId = Guid.NewGuid();
        var secondId = Guid.NewGuid();

        ApplicationUser NewCitizen(Guid id) => new()
        {
            Id = id,
            UserName = $"read-test-{id}@test.local",
            Email = $"read-test-{id}@test.local",
            FirstName = "Read",
            LastName = "Tester",
            IsActive = true
        };

        var first = NewCitizen(firstId);
        var second = NewCitizen(secondId);

        var firstCreated = false;
        var secondCreated = false;

        var createdAnnouncements = new List<Guid>();

        async Task<HttpResponseMessage> SendAsync(
            HttpMethod method,
            string url,
            string? token,
            object? body = null)
        {
            using var request = new HttpRequestMessage(
                method, url);

            if (token is not null)
                request.Headers.Authorization =
                    new AuthenticationHeaderValue(
                        "Bearer", token);

            if (body is not null)
                request.Content = JsonContent.Create(body);

            return await client.SendAsync(request);
        }

        async Task<int> UnreadAsync(string token)
        {
            using var response = await SendAsync(
                HttpMethod.Get,
                "/api/announcements/unread-count",
                token);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using var json = await JsonDocument.ParseAsync(
                await response.Content.ReadAsStreamAsync());

            return json.RootElement
                .GetProperty("unreadCount").GetInt32();
        }

        try
        {
            Assert.True((await users.CreateAsync(first)).Succeeded);
            firstCreated = true;

            Assert.True((await users.AddToRoleAsync(
                first, AppRoles.Citizen)).Succeeded);

            Assert.True((await users.CreateAsync(second)).Succeeded);
            secondCreated = true;

            Assert.True((await users.AddToRoleAsync(
                second, AppRoles.Citizen)).Succeeded);

            var firstToken = tokens.CreateToken(
                first, new[] { AppRoles.Citizen });

            var secondToken = tokens.CreateToken(
                second, new[] { AppRoles.Citizen });

            // Anonymous and admin access to citizen-only endpoints.
            using (var response = await SendAsync(
                HttpMethod.Get,
                "/api/announcements/unread-count",
                null))
            {
                Assert.Equal(
                    HttpStatusCode.Unauthorized,
                    response.StatusCode);
            }

            using (var response = await SendAsync(
                HttpMethod.Get,
                "/api/announcements/unread-count",
                adminToken))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            var firstBaseline = await UnreadAsync(firstToken);
            var secondBaseline = await UnreadAsync(secondToken);

            var notice = new
            {
                title = "Read tracking integration test",
                body = "A temporary test announcement.",
                category = "general",
                locationScope = "all",
                isFeatured = false,
                expiresAtUtc = DateTime.UtcNow.AddDays(5)
            };

            // Create a draft using the real admin endpoint.
            using var createdResponse = await SendAsync(
                HttpMethod.Post,
                "/api/announcements",
                adminToken,
                notice);

            Assert.Equal(
                HttpStatusCode.Created,
                createdResponse.StatusCode);

            var created = await createdResponse.Content
                .ReadFromJsonAsync<AnnouncementResponse>();

            Assert.NotNull(created);

            var announcementId = created.Id;
            createdAnnouncements.Add(announcementId);

            var readUrl =
                $"/api/announcements/{announcementId}/read";

            var publishUrl =
                $"/api/announcements/{announcementId}/publish";

            // Draft must not increase unread counts.
            Assert.Equal(
                firstBaseline,
                await UnreadAsync(firstToken));

            Assert.Equal(
                secondBaseline,
                await UnreadAsync(secondToken));

            using (var response = await SendAsync(
                HttpMethod.Post, readUrl, firstToken))
            {
                Assert.Equal(
                    HttpStatusCode.NotFound,
                    response.StatusCode);
            }

            // Admin and anonymous users cannot mark as read.
            using (var response = await SendAsync(
                HttpMethod.Post, readUrl, null))
            {
                Assert.Equal(
                    HttpStatusCode.Unauthorized,
                    response.StatusCode);
            }

            using (var response = await SendAsync(
                HttpMethod.Post, readUrl, adminToken))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            // Publish. Both citizens independently gain one unread.
            using (var response = await SendAsync(
                HttpMethod.Patch,
                publishUrl,
                adminToken,
                new { isPublished = true }))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);
            }

            Assert.Equal(
                firstBaseline + 1,
                await UnreadAsync(firstToken));

            Assert.Equal(
                secondBaseline + 1,
                await UnreadAsync(secondToken));

            // First citizen reads the notice twice.
            for (var i = 0; i < 2; i++)
            {
                using var response = await SendAsync(
                    HttpMethod.Post,
                    readUrl,
                    firstToken);

                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);
            }

            Assert.Equal(
                firstBaseline,
                await UnreadAsync(firstToken));

            // Second citizen is still unread.
            Assert.Equal(
                secondBaseline + 1,
                await UnreadAsync(secondToken));

            var receiptCount = await db.AnnouncementReads
                .AsNoTracking()
                .CountAsync(r =>
                    r.UserId == firstId &&
                    r.AnnouncementId == announcementId);

            Assert.Equal(1, receiptCount);

            // Unpublishing hides the notice from the counter.
            using (var response = await SendAsync(
                HttpMethod.Patch,
                publishUrl,
                adminToken,
                new { isPublished = false }))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);
            }

            Assert.Equal(
                secondBaseline,
                await UnreadAsync(secondToken));

            // Republish: first user's receipt remains,
            // while second user still has not read the notice.
            using (var response = await SendAsync(
                HttpMethod.Patch,
                publishUrl,
                adminToken,
                new { isPublished = true }))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);
            }

            Assert.Equal(
                firstBaseline,
                await UnreadAsync(firstToken));

            Assert.Equal(
                secondBaseline + 1,
                await UnreadAsync(secondToken));

            // Expired announcements cannot be read.
            DateTime? expired = DateTime.UtcNow.AddMinutes(-1);

            await db.Announcements
                .Where(a => a.Id == announcementId)
                .ExecuteUpdateAsync(setters =>
                    setters.SetProperty(
                        a => a.ExpiresAtUtc,
                        expired));

            Assert.Equal(
                secondBaseline,
                await UnreadAsync(secondToken));

            using (var response = await SendAsync(
                HttpMethod.Post,
                readUrl,
                secondToken))
            {
                Assert.Equal(
                    HttpStatusCode.NotFound,
                    response.StatusCode);
            }
        }
        finally
        {
            if (createdAnnouncements.Count > 0)
            {
                await db.Announcements
                    .Where(a => createdAnnouncements.Contains(a.Id))
                    .ExecuteDeleteAsync();
            }

            if (secondCreated)
                await users.DeleteAsync(second);

            if (firstCreated)
                await users.DeleteAsync(first);
        }
    }
}
