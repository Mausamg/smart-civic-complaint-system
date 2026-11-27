using System.Net;
using System.Net.Http.Headers;
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

public class ComplaintStatusHistorySecurityTests
{
    [Fact]
    public async Task StatusHistory_EnforcesAccessAndActorIdentityPrivacy()
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

        var createdUsers = new List<ApplicationUser>();

        var complaintId = Guid.NewGuid();
        var emptyComplaintId = Guid.NewGuid();
        var missingComplaintId = Guid.NewGuid();

        async Task<ApplicationUser> CreateUserAsync(
            string label,
            string role)
        {
            var id = Guid.NewGuid();

            var user = new ApplicationUser
            {
                Id = id,
                UserName = $"history-{id}@test.local",
                Email = $"history-{id}@test.local",
                FirstName = "History",
                LastName = label,
                IsActive = true
            };

            var result = await users.CreateAsync(user);

            Assert.True(result.Succeeded);

            createdUsers.Add(user);

            Assert.True(
                (await users.AddToRoleAsync(user, role))
                .Succeeded);

            return user;
        }

        async Task<HttpResponseMessage> GetHistoryAsync(
            Guid id,
            string? token)
        {
            using var request = new HttpRequestMessage(
                HttpMethod.Get,
                $"/api/complaints/{id}/history");

            if (token is not null)
            {
                request.Headers.Authorization =
                    new AuthenticationHeaderValue(
                        "Bearer", token);
            }

            return await client.SendAsync(request);
        }

        async Task AssertStatusAsync(
            Guid id,
            string? token,
            HttpStatusCode expected)
        {
            using var response =
                await GetHistoryAsync(id, token);

            Assert.Equal(expected, response.StatusCode);
        }

        try
        {
            // Create isolated accounts for every access scenario.

            var owner = await CreateUserAsync(
                "Owner", AppRoles.Citizen);

            var otherCitizen = await CreateUserAsync(
                "OtherCitizen", AppRoles.Citizen);

            var assignedStaff = await CreateUserAsync(
                "AssignedStaff", AppRoles.Staff);

            var unassignedStaff = await CreateUserAsync(
                "UnassignedStaff", AppRoles.Staff);

            var admin = await users.FindByEmailAsync(
                config["SeedAdmin:Email"]!);

            Assert.NotNull(admin);

            var ownerToken = tokens.CreateToken(
                owner, new[] { AppRoles.Citizen });

            var otherCitizenToken = tokens.CreateToken(
                otherCitizen, new[] { AppRoles.Citizen });

            var assignedStaffToken = tokens.CreateToken(
                assignedStaff, new[] { AppRoles.Staff });

            var unassignedStaffToken = tokens.CreateToken(
                unassignedStaff, new[] { AppRoles.Staff });

            var adminToken = tokens.CreateToken(
                admin, await users.GetRolesAsync(admin));

            // Seed complaints belonging only to this test.

            db.Complaints.AddRange(
                new Complaint
                {
                    Id = complaintId,
                    Title = "TEST ONLY - Status history security",
                    Description = "Isolated history integration test",
                    Category = "Road",
                    Location = "Kathmandu",
                    SubmittedByUserId = owner.Id,
                    AssignedToUserId = assignedStaff.Id,
                    Status = ComplaintStatus.Resolved
                },
                new Complaint
                {
                    Id = emptyComplaintId,
                    Title = "TEST ONLY - Empty status history",
                    Description = "No recorded transitions",
                    Category = "Road",
                    Location = "Kathmandu",
                    SubmittedByUserId = owner.Id,
                    Status = ComplaintStatus.Submitted
                });

            await db.SaveChangesAsync();

            var firstTime = new DateTime(
                2026, 1, 1, 10, 0, 0,
                DateTimeKind.Utc);

            var first = new ComplaintStatusHistory
            {
                Id = Guid.NewGuid(),
                ComplaintId = complaintId,
                OldStatus = ComplaintStatus.Submitted,
                NewStatus = ComplaintStatus.UnderReview,
                ChangedByUserId = admin.Id,
                ChangedAtUtc = firstTime,
                Note = "Complaint accepted for review."
            };

            var second = new ComplaintStatusHistory
            {
                Id = Guid.NewGuid(),
                ComplaintId = complaintId,
                OldStatus = ComplaintStatus.UnderReview,
                NewStatus = ComplaintStatus.InProgress,
                ChangedByUserId = assignedStaff.Id,
                ChangedAtUtc = firstTime.AddMinutes(5),
                Note = null
            };

            var third = new ComplaintStatusHistory
            {
                Id = Guid.NewGuid(),
                ComplaintId = complaintId,
                OldStatus = ComplaintStatus.InProgress,
                NewStatus = ComplaintStatus.Resolved,
                ChangedByUserId = assignedStaff.Id,
                ChangedAtUtc = firstTime.AddMinutes(10),
                Note = "TEST ONLY: Resolution verified."
            };

            db.ComplaintStatusHistories.AddRange(
                first, second, third);

            await db.SaveChangesAsync();

            // Verify authentication and complaint ownership.

            await AssertStatusAsync(
                complaintId, null,
                HttpStatusCode.Unauthorized);

            await AssertStatusAsync(
                complaintId, otherCitizenToken,
                HttpStatusCode.Forbidden);

            await AssertStatusAsync(
                complaintId, unassignedStaffToken,
                HttpStatusCode.Forbidden);

            await AssertStatusAsync(
                missingComplaintId, ownerToken,
                HttpStatusCode.NotFound);

            await AssertStatusAsync(
                missingComplaintId, adminToken,
                HttpStatusCode.NotFound);

            // Inspect actual JSON, not only deserialized DTOs.

            var expectedEntries = new[]
            {
                third, second, first
            };

            var permittedFields = new[]
            {
                "id",
                "oldStatus",
                "newStatus",
                "changedAtUtc",
                "note"
            };

            async Task AssertHistoryAsync(
                string token,
                bool includeActorIdentity)
            {
                using var response =
                    await GetHistoryAsync(
                        complaintId, token);

                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);

                using var document = JsonDocument.Parse(
                    await response.Content.ReadAsStringAsync());

                var entries = document.RootElement;

                Assert.Equal(
                    JsonValueKind.Array,
                    entries.ValueKind);

                Assert.Equal(
                    expectedEntries.Length,
                    entries.GetArrayLength());

                var expectedFields = includeActorIdentity
                    ? permittedFields.Concat(new[]
                    {
                        "changedByUserId",
                        "changedByName"
                    }).ToArray()
                    : permittedFields;

                for (var i = 0; i < expectedEntries.Length; i++)
                {
                    var expected = expectedEntries[i];
                    var actual = entries[i];

                    Assert.Equal(
                        expectedFields
                            .OrderBy(name => name)
                            .ToArray(),
                        actual.EnumerateObject()
                            .Select(property => property.Name)
                            .OrderBy(name => name)
                            .ToArray());

                    Assert.Equal(
                        expected.Id,
                        actual.GetProperty("id").GetGuid());

                    Assert.Equal(
                        expected.OldStatus.ToString(),
                        actual.GetProperty("oldStatus")
                            .GetString());

                    Assert.Equal(
                        expected.NewStatus.ToString(),
                        actual.GetProperty("newStatus")
                            .GetString());

                    Assert.Equal(
                        expected.ChangedAtUtc,
                        actual.GetProperty("changedAtUtc")
                            .GetDateTime());

                    Assert.Equal(
                        expected.Note,
                        actual.GetProperty("note").GetString());

                    if (includeActorIdentity)
                    {
                        Assert.Equal(
                            expected.ChangedByUserId,
                            actual.GetProperty("changedByUserId")
                                .GetGuid());

                        var actor =
                            expected.ChangedByUserId == admin.Id
                                ? admin
                                : assignedStaff;

                        Assert.Equal(
                            $"{actor.FirstName} {actor.LastName}",
                            actual.GetProperty("changedByName")
                                .GetString());
                    }
                    else
                    {
                        Assert.False(
                            actual.TryGetProperty(
                                "changedByUserId", out _));

                        Assert.False(
                            actual.TryGetProperty(
                                "changedByName", out _));
                    }
                }
            }

            // Citizen receives notes but no actor identities.

            await AssertHistoryAsync(
                ownerToken,
                includeActorIdentity: false);

            // Operational users retain existing identity fields.

            await AssertHistoryAsync(
                assignedStaffToken,
                includeActorIdentity: true);

            await AssertHistoryAsync(
                adminToken,
                includeActorIdentity: true);

            // A complaint with no transitions returns an empty list.

            using var emptyResponse =
                await GetHistoryAsync(
                    emptyComplaintId, ownerToken);

            Assert.Equal(
                HttpStatusCode.OK,
                emptyResponse.StatusCode);

            using var emptyDocument = JsonDocument.Parse(
                await emptyResponse.Content.ReadAsStringAsync());

            Assert.Equal(
                JsonValueKind.Array,
                emptyDocument.RootElement.ValueKind);

            Assert.Equal(
                0,
                emptyDocument.RootElement.GetArrayLength());

            // Ownership checks also apply to empty histories.

            await AssertStatusAsync(
                emptyComplaintId,
                otherCitizenToken,
                HttpStatusCode.Forbidden);
        }
        finally
        {
            // Delete only records belonging to this test.

            await db.ComplaintStatusHistories
                .Where(h =>
                    h.ComplaintId == complaintId ||
                    h.ComplaintId == emptyComplaintId)
                .ExecuteDeleteAsync();

            await db.Complaints
                .Where(c =>
                    c.Id == complaintId ||
                    c.Id == emptyComplaintId)
                .ExecuteDeleteAsync();

            // ExecuteDeleteAsync bypasses EF Core tracking.
            // Detach stale entities before Identity saves changes.
            db.ChangeTracker.Clear();

            foreach (var user in createdUsers)
            {
                var persistedUser = await users.FindByIdAsync(
                    user.Id.ToString());

                if (persistedUser is null)
                    continue;

                var result = await users.DeleteAsync(
                    persistedUser);

                Assert.True(
                    result.Succeeded,
                    string.Join(
                        "; ",
                        result.Errors.Select(
                            error => $"{error.Code}: {error.Description}")));
            }
        }
    }
}
