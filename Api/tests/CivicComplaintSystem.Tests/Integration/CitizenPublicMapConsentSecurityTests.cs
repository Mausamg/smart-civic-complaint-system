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
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CivicComplaintSystem.Tests.Integration;

[Collection("ComplaintDepartmentRoutingNonParallel")]
public sealed class CitizenPublicMapConsentSecurityTests
{
    [Fact]
    public async Task OwnerControlsConsent_AndWithdrawalRevokesApproval()
    {
        var options = PostgresTestDb.CreateOptions();

        await using (var setup = new AppDbContext(options))
        {
            await setup.Database.MigrateAsync();
        }

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

        var configuration = scope.ServiceProvider
            .GetRequiredService<IConfiguration>();

        var admin = await users.FindByEmailAsync(
            configuration["SeedAdmin:Email"]!);

        Assert.NotNull(admin);

        var adminToken = tokens.CreateToken(
            admin, await users.GetRolesAsync(admin));

        ApplicationUser NewCitizen() => new()
        {
            Id = Guid.NewGuid(),
            UserName = $"consent-{Guid.NewGuid():N}@test.local",
            Email = $"consent-{Guid.NewGuid():N}@test.local",
            FirstName = "Consent",
            LastName = "Tester",
            IsActive = true
        };

        var owner = NewCitizen();
        var outsider = NewCitizen();

        var ownerCreated = false;
        var outsiderCreated = false;

        var complaint = new Complaint
        {
            Id = Guid.NewGuid(),
            Title = "PRIVATE_CONSENT_TEST_TITLE",
            Description = "PRIVATE_CONSENT_TEST_DESCRIPTION",
            Category = "potholes",
            Location = "PRIVATE_CONSENT_TEST_ADDRESS",
            Municipality = "Kathmandu",
            Ward = "7",
            Latitude = 27.71721,
            Longitude = 85.32491,
            SubmittedByUserId = owner.Id,
            Status = ComplaintStatus.Submitted,
            IsPublicMapOptedIn = false,
            IsPublicMapApproved = false,
            CreatedAt = DateTime.UtcNow
        };

        var consentUrl =
            $"/api/complaints/{complaint.Id}/public-map-consent";

        var approvalUrl =
            $"/api/admin/public-map/complaints/{complaint.Id}/approval";

        const string mapUrl = "/api/public/complaints/map";

        async Task<HttpResponseMessage> SendAsync(
            HttpMethod method,
            string url,
            string? token,
            object? body = null)
        {
            using var request = new HttpRequestMessage(method, url);

            if (token is not null)
            {
                request.Headers.Authorization =
                    new AuthenticationHeaderValue("Bearer", token);
            }

            if (body is not null)
                request.Content = JsonContent.Create(body);

            return await client.SendAsync(request);
        }

        async Task<bool> IsPublicAsync()
        {
            using var response = await client.GetAsync(mapUrl);

            Assert.Equal(
                HttpStatusCode.OK, response.StatusCode);

            using var json = JsonDocument.Parse(
                await response.Content.ReadAsStringAsync());

            return json.RootElement.EnumerateArray()
                .Any(item =>
                    item.GetProperty("id").GetGuid()
                    == complaint.Id);
        }

        async Task<(bool OptedIn, bool Approved)> StateAsync()
        {
            var current = await db.Complaints
                .AsNoTracking()
                .Where(c => c.Id == complaint.Id)
                .Select(c => new
                {
                    c.IsPublicMapOptedIn,
                    c.IsPublicMapApproved
                })
                .SingleAsync();

            return (
                current.IsPublicMapOptedIn,
                current.IsPublicMapApproved);
        }

        try
        {
            Assert.True(
                (await users.CreateAsync(owner)).Succeeded);
            ownerCreated = true;

            Assert.True(
                (await users.AddToRoleAsync(
                    owner, AppRoles.Citizen)).Succeeded);

            Assert.True(
                (await users.CreateAsync(outsider)).Succeeded);
            outsiderCreated = true;

            Assert.True(
                (await users.AddToRoleAsync(
                    outsider, AppRoles.Citizen)).Succeeded);

            var ownerToken = tokens.CreateToken(
                owner, new[] { AppRoles.Citizen });

            var outsiderToken = tokens.CreateToken(
                outsider, new[] { AppRoles.Citizen });

            db.Complaints.Add(complaint);
            await db.SaveChangesAsync();

            Assert.False(await IsPublicAsync());

            // Authentication and role restrictions.
            using (var response = await SendAsync(
                HttpMethod.Patch, consentUrl, null,
                new { isPublicMapOptedIn = true }))
            {
                Assert.Equal(
                    HttpStatusCode.Unauthorized,
                    response.StatusCode);
            }

            using (var response = await SendAsync(
                HttpMethod.Patch, consentUrl, adminToken,
                new { isPublicMapOptedIn = true }))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            // Another citizen cannot change the owner's consent.
            using (var response = await SendAsync(
                HttpMethod.Patch, consentUrl, outsiderToken,
                new { isPublicMapOptedIn = true }))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            // Consent must be explicitly provided.
            using (var response = await SendAsync(
                HttpMethod.Patch, consentUrl, ownerToken,
                new { }))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            // Owner opts in, but map remains private.
            using (var response = await SendAsync(
                HttpMethod.Patch, consentUrl, ownerToken,
                new { isPublicMapOptedIn = true }))
            {
                Assert.Equal(
                    HttpStatusCode.OK, response.StatusCode);
            }

            Assert.Equal((true, false), await StateAsync());
            Assert.False(await IsPublicAsync());

            // Admin approval makes the opted-in complaint public.
            using (var response = await SendAsync(
                HttpMethod.Patch, approvalUrl, adminToken,
                new
                {
                    isApproved = true,
                    privacyReviewed = true
                }))
            {
                Assert.Equal(
                    HttpStatusCode.OK, response.StatusCode);
            }

            Assert.True(await IsPublicAsync());

            // Citizen withdrawal revokes both consent and approval.
            using (var response = await SendAsync(
                HttpMethod.Patch, consentUrl, ownerToken,
                new { isPublicMapOptedIn = false }))
            {
                Assert.Equal(
                    HttpStatusCode.OK, response.StatusCode);
            }

            Assert.Equal((false, false), await StateAsync());
            Assert.False(await IsPublicAsync());

            // Re-opt-in does not restore approval automatically.
            using (var response = await SendAsync(
                HttpMethod.Patch, consentUrl, ownerToken,
                new { isPublicMapOptedIn = true }))
            {
                Assert.Equal(
                    HttpStatusCode.OK, response.StatusCode);
            }

            Assert.Equal((true, false), await StateAsync());
            Assert.False(await IsPublicAsync());

            // Only fresh admin approval republishes it.
            using (var response = await SendAsync(
                HttpMethod.Patch, approvalUrl, adminToken,
                new
                {
                    isApproved = true,
                    privacyReviewed = true
                }))
            {
                Assert.Equal(
                    HttpStatusCode.OK, response.StatusCode);
            }

            Assert.True(await IsPublicAsync());
        }
        finally
        {
            await db.Complaints
                .Where(c => c.Id == complaint.Id)
                .ExecuteDeleteAsync();

            if (outsiderCreated)
                await users.DeleteAsync(outsider);

            if (ownerCreated)
                await users.DeleteAsync(owner);
        }
    }
}
