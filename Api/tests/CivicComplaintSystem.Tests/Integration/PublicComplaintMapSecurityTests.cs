using System.Net;
using System.Text.Json;
using CivicComplaintSystem.Api.Data;
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
public sealed class PublicComplaintMapSecurityTests
{
    [Fact]
    public async Task PublicMap_ProtectsPrivateData_AndCoordinates()
    {
        // Dedicated test database only.
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

        var config = scope.ServiceProvider
            .GetRequiredService<IConfiguration>();

        var admin = await users.FindByEmailAsync(
            config["SeedAdmin:Email"]!);

        Assert.NotNull(admin);

        Complaint NewComplaint(
            ComplaintStatus status,
            double? latitude,
            double? longitude)
        {
            return new Complaint
            {
                Id = Guid.NewGuid(),
                Title = "PRIVATE_TITLE_SHOULD_NOT_LEAK",
                Description = "PRIVATE_DESCRIPTION_SHOULD_NOT_LEAK",
                Location = "PRIVATE_ADDRESS_SHOULD_NOT_LEAK",
                Category = "potholes",
                Municipality = "Kathmandu",
                Ward = "7",
                Status = status,
                Latitude = latitude,
                Longitude = longitude,
                SubmittedByUserId = admin.Id,
                CreatedAt = DateTime.UtcNow
            };
        }

        var submitted = NewComplaint(
            ComplaintStatus.Submitted,
            27.71721,
            85.32491);

        var reviewing = NewComplaint(
            ComplaintStatus.UnderReview,
            27.72,
            85.33);

        var invalidCoordinates = NewComplaint(
            ComplaintStatus.InProgress,
            0,
            0);

        var missingCoordinates = NewComplaint(
            ComplaintStatus.Resolved,
            null,
            null);

        var rejected = NewComplaint(
            ComplaintStatus.Rejected,
            27.71,
            85.32);

        var withdrawn = NewComplaint(
            ComplaintStatus.Withdrawn,
            27.71,
            85.32);

        submitted.IsPublicMapApproved = true;
        reviewing.IsPublicMapApproved = true;
        invalidCoordinates.IsPublicMapApproved = true;
        missingCoordinates.IsPublicMapApproved = true;

        var unapproved = NewComplaint(
            ComplaintStatus.Submitted,
            27.715,
            85.32);

        var seeded = new[]
        {
            submitted,
            reviewing,
            invalidCoordinates,
            missingCoordinates,
            rejected,
            withdrawn,
            unapproved
        };

        var ids = seeded.Select(c => c.Id).ToArray();

        try
        {
            db.Complaints.AddRange(seeded);

            await db.SaveChangesAsync();

            // No authorization header: endpoint must be public.
            using var response = await client.GetAsync(
                "/api/public/complaints/map");

            Assert.Equal(
                HttpStatusCode.OK,
                response.StatusCode);

            Assert.True(
                response.Headers.CacheControl?.NoStore == true);

            var body = await response.Content
                .ReadAsStringAsync();

            using var json = JsonDocument.Parse(body);

            Assert.Equal(
                JsonValueKind.Array,
                json.RootElement.ValueKind);

            var matching = json.RootElement
                .EnumerateArray()
                .Where(item =>
                    ids.Contains(
                        item.GetProperty("id").GetGuid()))
                .ToDictionary(
                    item => item.GetProperty("id").GetGuid());

            // These four statuses remain visible.
            Assert.Equal(4, matching.Count);

            Assert.Contains(submitted.Id, matching.Keys);
            Assert.Contains(reviewing.Id, matching.Keys);
            Assert.Contains(invalidCoordinates.Id, matching.Keys);
            Assert.Contains(missingCoordinates.Id, matching.Keys);

            // Withdrawn and rejected never appear.
            Assert.DoesNotContain(rejected.Id, matching.Keys);
            Assert.DoesNotContain(withdrawn.Id, matching.Keys);
            Assert.DoesNotContain(unapproved.Id, matching.Keys);

            // Public response has an explicit field allowlist.
            var allowed = new[]
            {
                "id",
                "category",
                "status",
                "municipality",
                "ward",
                "latitude",
                "longitude",
                "reportedAtUtc"
            }.OrderBy(name => name).ToArray();

            foreach (var item in matching.Values)
            {
                var fields = item.EnumerateObject()
                    .Select(property => property.Name)
                    .OrderBy(name => name)
                    .ToArray();

                Assert.Equal(allowed, fields);
            }

            // Public positions are deliberately approximate.
            var location = matching[submitted.Id];

            Assert.Equal(
                27.717,
                location.GetProperty("latitude").GetDouble());

            Assert.Equal(
                85.325,
                location.GetProperty("longitude").GetDouble());

            // Invalid/missing coordinates produce no fake pins.
            foreach (var id in new[]
            {
                invalidCoordinates.Id,
                missingCoordinates.Id
            })
            {
                Assert.Equal(
                    JsonValueKind.Null,
                    matching[id].GetProperty("latitude").ValueKind);

                Assert.Equal(
                    JsonValueKind.Null,
                    matching[id].GetProperty("longitude").ValueKind);
            }

            // No private title, description, or address.
            Assert.DoesNotContain(
                "PRIVATE_TITLE_SHOULD_NOT_LEAK", body);

            Assert.DoesNotContain(
                "PRIVATE_DESCRIPTION_SHOULD_NOT_LEAK", body);

            Assert.DoesNotContain(
                "PRIVATE_ADDRESS_SHOULD_NOT_LEAK", body);
        }
        finally
        {
            // Remove only records inserted by this test.
            await db.Complaints
                .Where(c => ids.Contains(c.Id))
                .ExecuteDeleteAsync();
        }
    }
}
