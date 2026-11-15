using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
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
public sealed class AnnouncementApiSecurityTests
{
    [Fact]
    public async Task Announcements_EnforcePermissions_AndPublishingRules()
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
            admin, await users.GetRolesAsync(admin));

        var citizenId = Guid.NewGuid();
        var staffId = Guid.NewGuid();

        var citizen = new ApplicationUser
        {
            Id = citizenId,
            UserName = $"announcement-citizen-{citizenId}@test.local",
            Email = $"announcement-citizen-{citizenId}@test.local",
            FirstName = "Announcement",
            LastName = "Citizen",
            IsActive = true
        };

        var staff = new ApplicationUser
        {
            Id = staffId,
            UserName = $"announcement-staff-{staffId}@test.local",
            Email = $"announcement-staff-{staffId}@test.local",
            FirstName = "Announcement",
            LastName = "Staff",
            IsActive = true
        };

        Guid? announcementId = null;
        var citizenCreated = false;
        var staffCreated = false;

        async Task<HttpResponseMessage> SendAsync(
            HttpMethod method,
            string url,
            string? token,
            object? body = null)
        {
            using var request = new HttpRequestMessage(
                method, url);

            if (token is not null)
            {
                request.Headers.Authorization =
                    new AuthenticationHeaderValue(
                        "Bearer", token);
            }

            if (body is not null)
                request.Content = JsonContent.Create(body);

            return await client.SendAsync(request);
        }

        async Task<List<AnnouncementResponse>> PublicFeedAsync()
        {
            using var response = await SendAsync(
                HttpMethod.Get,
                "/api/announcements",
                null);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var data = await response.Content
                .ReadFromJsonAsync<List<AnnouncementResponse>>();

            Assert.NotNull(data);
            return data;
        }

        try
        {
            Assert.True(
                (await users.CreateAsync(citizen)).Succeeded);

            citizenCreated = true;

            Assert.True(
                (await users.AddToRoleAsync(
                    citizen, AppRoles.Citizen)).Succeeded);

            Assert.True(
                (await users.CreateAsync(staff)).Succeeded);

            staffCreated = true;

            Assert.True(
                (await users.AddToRoleAsync(
                    staff, AppRoles.Staff)).Succeeded);

            var citizenToken = tokens.CreateToken(
                citizen, new[] { AppRoles.Citizen });

            var staffToken = tokens.CreateToken(
                staff, new[] { AppRoles.Staff });

            var draft = new
            {
                title = "  Road closure notice  ",
                body = "  Road maintenance scheduled.  ",
                category = "EMERGENCY",
                locationScope = "local",
                country = "Nepal",
                province = "Bagmati",
                district = "Kathmandu",
                municipality = "Kathmandu Metropolitan City",
                ward = "Ward 7",
                isFeatured = true,
                expiresAtUtc = DateTime.UtcNow.AddDays(7)
            };

            // Public reading requires no authentication.
            _ = await PublicFeedAsync();

            // Management is restricted to administrators.
            using (var response = await SendAsync(
                HttpMethod.Get,
                "/api/announcements/manage",
                null))
            {
                Assert.Equal(
                    HttpStatusCode.Unauthorized,
                    response.StatusCode);
            }

            using (var response = await SendAsync(
                HttpMethod.Get,
                "/api/announcements/manage",
                citizenToken))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            using (var response = await SendAsync(
                HttpMethod.Get,
                "/api/announcements/manage",
                staffToken))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            using (var response = await SendAsync(
                HttpMethod.Post,
                "/api/announcements",
                null,
                draft))
            {
                Assert.Equal(
                    HttpStatusCode.Unauthorized,
                    response.StatusCode);
            }

            using (var response = await SendAsync(
                HttpMethod.Post,
                "/api/announcements",
                citizenToken,
                draft))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            using (var response = await SendAsync(
                HttpMethod.Post,
                "/api/announcements",
                staffToken,
                draft))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            // Reject unsupported categories.
            using (var response = await SendAsync(
                HttpMethod.Post,
                "/api/announcements",
                adminToken,
                new
                {
                    title = "Invalid category",
                    body = "Test only",
                    category = "invalid",
                    isFeatured = false
                }))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            // Reject whitespace-only titles.
            using (var response = await SendAsync(
                HttpMethod.Post,
                "/api/announcements",
                adminToken,
                new
                {
                    title = "   ",
                    body = "Test only",
                    category = "general"
                }))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }


            // Ward alone is not a valid locality.
            using (var response = await SendAsync(
                HttpMethod.Post,
                "/api/announcements",
                adminToken,
                new
                {
                    title = "Ambiguous ward",
                    body = "Test only",
                    category = "general",
                    locationScope = "local",
                    country = "Nepal",
                    ward = "7"
                }))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            // Admin creates a draft.
            using (var response = await SendAsync(
                HttpMethod.Post,
                "/api/announcements",
                adminToken,
                draft))
            {
                Assert.Equal(
                    HttpStatusCode.Created,
                    response.StatusCode);

                var created = await response.Content
                    .ReadFromJsonAsync<AnnouncementResponse>();

                Assert.NotNull(created);

                announcementId = created.Id;

                Assert.False(created.IsPublished);
                Assert.Null(created.PublishedAtUtc);
                Assert.Equal("Road closure notice", created.Title);
                Assert.Equal("emergency", created.Category);
                Assert.Equal("Ward 7", created.Ward);
                Assert.Equal("local", created.LocationScope);
                Assert.Equal("Nepal", created.Country);
                Assert.Equal(
                    "Kathmandu Metropolitan City",
                    created.Municipality);
                Assert.True(created.IsFeatured);
            }

            var id = announcementId!.Value;
            var url = $"/api/announcements/{id}";

            // Draft is persisted, but not public.
            var persisted = await db.Announcements
                .AsNoTracking()
                .SingleAsync(a => a.Id == id);

            Assert.Equal(admin.Id, persisted.CreatedByUserId);
            Assert.False(persisted.IsPublished);

            Assert.DoesNotContain(
                await PublicFeedAsync(),
                a => a.Id == id);

            using (var response = await SendAsync(
                HttpMethod.Get,
                "/api/announcements/manage",
                adminToken))
            {
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);

                var managed = await response.Content
                    .ReadFromJsonAsync<List<AnnouncementResponse>>();

                Assert.NotNull(managed);
                Assert.Contains(managed, a => a.Id == id);
            }

            // Citizen cannot edit, publish or delete.
            using (var response = await SendAsync(
                HttpMethod.Put,
                url,
                citizenToken,
                draft))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            using (var response = await SendAsync(
                HttpMethod.Patch,
                $"{url}/publish",
                citizenToken,
                new { isPublished = true }))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            using (var response = await SendAsync(
                HttpMethod.Delete,
                url,
                citizenToken))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            // Publishing requires an explicit boolean.
            using (var response = await SendAsync(
                HttpMethod.Patch,
                $"{url}/publish",
                adminToken,
                new { }))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            // Admin publishes and the notice becomes public.
            using (var response = await SendAsync(
                HttpMethod.Patch,
                $"{url}/publish",
                adminToken,
                new { isPublished = true }))
            {
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);

                var published = await response.Content
                    .ReadFromJsonAsync<AnnouncementResponse>();

                Assert.NotNull(published);
                Assert.True(published.IsPublished);
                Assert.NotNull(published.PublishedAtUtc);
            }

            Assert.Contains(
                await PublicFeedAsync(),
                a => a.Id == id);

            // Admin edits a published announcement.
            using (var response = await SendAsync(
                HttpMethod.Put,
                url,
                adminToken,
                new
                {
                    title = "Updated road notice",
                    body = "Updated maintenance schedule.",
                    category = "maintenance",
                    locationScope = "local",
                country = "Nepal",
                province = "Bagmati",
                district = "Kathmandu",
                municipality = "Kathmandu Metropolitan City",
                ward = "Ward 5",
                    isFeatured = false,
                    expiresAtUtc = DateTime.UtcNow.AddDays(10)
                }))
            {
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            }

            Assert.Contains(
                await PublicFeedAsync(),
                a => a.Id == id &&
                     a.Title == "Updated road notice" &&
                     a.Ward == "Ward 5");

            // Simulate an announcement whose expiration passed.
            DateTime? expiredAt = DateTime.UtcNow.AddDays(-1);

            await db.Announcements
                .Where(a => a.Id == id)
                .ExecuteUpdateAsync(setters =>
                    setters.SetProperty(
                        a => a.ExpiresAtUtc,
                        expiredAt));

            Assert.DoesNotContain(
                await PublicFeedAsync(),
                a => a.Id == id);

            using (var response = await SendAsync(
                HttpMethod.Patch,
                $"{url}/publish",
                adminToken,
                new { isPublished = true }))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            // Admin unpublishes, then deletes.
            using (var response = await SendAsync(
                HttpMethod.Patch,
                $"{url}/publish",
                adminToken,
                new { isPublished = false }))
            {
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            }

            using (var response = await SendAsync(
                HttpMethod.Delete,
                url,
                adminToken))
            {
                Assert.Equal(
                    HttpStatusCode.NoContent,
                    response.StatusCode);
            }

            using (var response = await SendAsync(
                HttpMethod.Get,
                $"/api/announcements/manage/{id}",
                adminToken))
            {
                Assert.Equal(
                    HttpStatusCode.NotFound,
                    response.StatusCode);
            }

            announcementId = null;
        }
        finally
        {
            if (announcementId.HasValue)
            {
                await db.Announcements
                    .Where(a => a.Id == announcementId.Value)
                    .ExecuteDeleteAsync();
            }

            if (staffCreated)
                await users.DeleteAsync(staff);

            if (citizenCreated)
                await users.DeleteAsync(citizen);
        }
    }
}
