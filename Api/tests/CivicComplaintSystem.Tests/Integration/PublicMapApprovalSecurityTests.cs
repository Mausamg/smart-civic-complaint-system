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
public sealed class PublicMapApprovalSecurityTests
{
    [Fact]
    public async Task Approval_IsAdminOnly_AndControlsPublicVisibility()
    {
        // Migrations apply only to civiccomplaint_test.
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

        var config = scope.ServiceProvider
            .GetRequiredService<IConfiguration>();

        var admin = await users.FindByEmailAsync(
            config["SeedAdmin:Email"]!);

        Assert.NotNull(admin);

        var adminToken = tokens.CreateToken(
            admin,
            await users.GetRolesAsync(admin));

        ApplicationUser NewUser(string prefix) => new()
        {
            Id = Guid.NewGuid(),
            UserName = $"{prefix}-{Guid.NewGuid():N}@test.local",
            Email = $"{prefix}-{Guid.NewGuid():N}@test.local",
            FirstName = "Map",
            LastName = "Tester",
            IsActive = true
        };

        var citizen = NewUser("citizen-map");
        var staff = NewUser("staff-map");

        var citizenCreated = false;
        var staffCreated = false;

        Complaint NewComplaint(ComplaintStatus status) => new()
        {
            Id = Guid.NewGuid(),
            Title = "PRIVATE_MAP_APPROVAL_TEST_TITLE",
            Description = "PRIVATE_MAP_APPROVAL_TEST_DESCRIPTION",
            Category = "potholes",
            Location = "PRIVATE_MAP_APPROVAL_TEST_ADDRESS",
            Municipality = "Kathmandu",
            Ward = "7",
            Latitude = 27.71721,
            Longitude = 85.32491,
            Status = status,
            IsPublicMapApproved = false,
            SubmittedByUserId = admin.Id,
            CreatedAt = DateTime.UtcNow
        };

        var eligible = NewComplaint(ComplaintStatus.Submitted);
        var rejected = NewComplaint(ComplaintStatus.Rejected);
        var withdrawn = NewComplaint(ComplaintStatus.Withdrawn);

        var ids = new[]
        {
            eligible.Id,
            rejected.Id,
            withdrawn.Id
        };

        const string queueUrl =
            "/api/admin/public-map/complaints";

        const string publicUrl =
            "/api/public/complaints/map";

        string ApprovalUrl(Guid id) =>
            $"{queueUrl}/{id}/approval";

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
            {
                request.Content = JsonContent.Create(body);
            }

            return await client.SendAsync(request);
        }

        async Task<JsonDocument> PublicFeedAsync()
        {
            using var response = await SendAsync(
                HttpMethod.Get, publicUrl, null);

            Assert.Equal(
                HttpStatusCode.OK,
                response.StatusCode);

            var json = await response.Content
                .ReadAsStringAsync();

            return JsonDocument.Parse(json);
        }

        bool Contains(JsonDocument json, Guid id) =>
            json.RootElement.EnumerateArray()
                .Any(item =>
                    item.GetProperty("id").GetGuid() == id);

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

            db.Complaints.AddRange(
                eligible, rejected, withdrawn);

            await db.SaveChangesAsync();

            // Anonymous users cannot see the admin queue.
            using (var response = await SendAsync(
                HttpMethod.Get, queueUrl, null))
            {
                Assert.Equal(
                    HttpStatusCode.Unauthorized,
                    response.StatusCode);
            }

            // Citizens and staff cannot see the admin queue.
            foreach (var token in new[]
            {
                citizenToken, staffToken
            })
            {
                using var response = await SendAsync(
                    HttpMethod.Get, queueUrl, token);

                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            // The same users cannot approve complaints.
            foreach (var token in new string?[]
            {
                null, citizenToken, staffToken
            })
            {
                using var response = await SendAsync(
                    HttpMethod.Patch,
                    ApprovalUrl(eligible.Id),
                    token,
                    new
                    {
                        isApproved = true,
                        privacyReviewed = true
                    });

                Assert.Equal(
                    token is null
                        ? HttpStatusCode.Unauthorized
                        : HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            // Admin can review the queue.
            using (var response = await SendAsync(
                HttpMethod.Get, queueUrl, adminToken))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);

                using var json = JsonDocument.Parse(
                    await response.Content.ReadAsStringAsync());

                var item = json.RootElement
                    .EnumerateArray()
                    .Single(x =>
                        x.GetProperty("id").GetGuid() == eligible.Id);

                Assert.False(
                    item.GetProperty(
                        "isPublicMapApproved").GetBoolean());
            }

            // Private-by-default: no seeded test record
            // may appear before approval.
            using (var publicFeed = await PublicFeedAsync())
            {
                foreach (var id in ids)
                {
                    Assert.False(Contains(publicFeed, id));
                }
            }

            // Missing approval value is invalid.
            using (var response = await SendAsync(
                HttpMethod.Patch,
                ApprovalUrl(eligible.Id),
                adminToken,
                new { privacyReviewed = true }))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            // Approval requires explicit privacy confirmation.
            using (var response = await SendAsync(
                HttpMethod.Patch,
                ApprovalUrl(eligible.Id),
                adminToken,
                new
                {
                    isApproved = true,
                    privacyReviewed = false
                }))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            // Rejected and withdrawn complaints cannot
            // be approved for public display.
            foreach (var id in new[]
            {
                rejected.Id, withdrawn.Id
            })
            {
                using var response = await SendAsync(
                    HttpMethod.Patch,
                    ApprovalUrl(id),
                    adminToken,
                    new
                    {
                        isApproved = true,
                        privacyReviewed = true
                    });

                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            // Admin approval must not bypass citizen consent.
            using (var response = await SendAsync(
                HttpMethod.Patch,
                ApprovalUrl(eligible.Id),
                adminToken,
                new
                {
                    isApproved = true,
                    privacyReviewed = true
                }))
            {
                Assert.Equal(
                    HttpStatusCode.BadRequest,
                    response.StatusCode);
            }

            Assert.False(eligible.IsPublicMapApproved);

            // Seed consent for the successful approval scenario.
            // Citizen ownership is tested separately.
            eligible.IsPublicMapOptedIn = true;
            await db.SaveChangesAsync();

            // Valid admin approval.
            for (var attempt = 0; attempt < 2; attempt++)
            {
                using var response = await SendAsync(
                    HttpMethod.Patch,
                    ApprovalUrl(eligible.Id),
                    adminToken,
                    new
                    {
                        isApproved = true,
                        privacyReviewed = true
                    });

                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);

                using var json = JsonDocument.Parse(
                    await response.Content.ReadAsStringAsync());

                Assert.True(
                    json.RootElement.GetProperty(
                        "isPublicMapApproved").GetBoolean());
            }

            // Approved complaint becomes public,
            // but never with private descriptions.
            using (var publicFeed = await PublicFeedAsync())
            {
                Assert.True(
                    Contains(publicFeed, eligible.Id));

                Assert.False(
                    Contains(publicFeed, rejected.Id));

                Assert.False(
                    Contains(publicFeed, withdrawn.Id));

                var item = publicFeed.RootElement
                    .EnumerateArray()
                    .Single(x =>
                        x.GetProperty("id").GetGuid() == eligible.Id);

                Assert.Equal(
                    27.717,
                    item.GetProperty("latitude").GetDouble());

                Assert.Equal(
                    85.325,
                    item.GetProperty("longitude").GetDouble());

                var serialized = item.GetRawText();

                Assert.DoesNotContain(
                    "PRIVATE_MAP_APPROVAL_TEST_TITLE",
                    serialized);

                Assert.DoesNotContain(
                    "PRIVATE_MAP_APPROVAL_TEST_DESCRIPTION",
                    serialized);

                Assert.DoesNotContain(
                    "PRIVATE_MAP_APPROVAL_TEST_ADDRESS",
                    serialized);
            }

            // Revoke approval: public visibility ends.
            using (var response = await SendAsync(
                HttpMethod.Patch,
                ApprovalUrl(eligible.Id),
                adminToken,
                new { isApproved = false }))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);

                using var json = JsonDocument.Parse(
                    await response.Content.ReadAsStringAsync());

                Assert.False(
                    json.RootElement.GetProperty(
                        "isPublicMapApproved").GetBoolean());
            }

            using (var publicFeed = await PublicFeedAsync())
            {
                Assert.False(
                    Contains(publicFeed, eligible.Id));
            }

            // Final persisted database state.
            var approvedCount = await db.Complaints
                .AsNoTracking()
                .CountAsync(c =>
                    ids.Contains(c.Id) &&
                    c.IsPublicMapApproved);

            Assert.Equal(0, approvedCount);
        }
        finally
        {
            // Delete only the records created by this test.
            await db.Complaints
                .Where(c => ids.Contains(c.Id))
                .ExecuteDeleteAsync();

            if (staffCreated)
            {
                await users.DeleteAsync(staff);
            }

            if (citizenCreated)
            {
                await users.DeleteAsync(citizen);
            }
        }
    }
}
