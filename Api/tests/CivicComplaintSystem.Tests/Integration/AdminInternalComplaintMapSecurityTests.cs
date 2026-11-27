using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Auth;
using CivicComplaintSystem.Api.Features.Complaints;
using CivicComplaintSystem.Api.Features.Departments;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CivicComplaintSystem.Tests.Integration;

[Collection("ComplaintDepartmentRoutingNonParallel")]
public sealed class AdminInternalComplaintMapSecurityTests
{
    private const string InternalMapEndpoint =
        "/api/admin/internal-map/complaints";

    private const string PublicMapEndpoint =
        "/api/public/complaints/map";

    [Fact]
    public async Task InternalMap_EnforcesAuthorization_ReturnsAllValidRecords_AndPreservesPrivacy()
    {
        // Existing infrastructure validates the dedicated
        // local PostgreSQL test database before migration.
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

        var adminRoles = await users.GetRolesAsync(admin);

        Assert.Contains(AppRoles.Admin, adminRoles);

        var createdUsers = new List<ApplicationUser>();
        var seededComplaints = new List<Complaint>();
        var seededDepartments = new List<Department>();

        async Task<ApplicationUser> CreateUserAsync(string role)
        {
            var id = Guid.NewGuid();

            var user = new ApplicationUser
            {
                Id = id,
                UserName = $"internal-map-{id:N}@test.local",
                Email = $"internal-map-{id:N}@test.local",
                FirstName = "InternalMap",
                LastName = role,
                IsActive = true
            };

            var result = await users.CreateAsync(user);

            Assert.True(
                result.Succeeded,
                string.Join(", ",
                    result.Errors.Select(e => e.Description)));

            createdUsers.Add(user);

            var roleResult = await users.AddToRoleAsync(
                user,
                role);

            Assert.True(
                roleResult.Succeeded,
                string.Join(", ",
                    roleResult.Errors.Select(e => e.Description)));

            return user;
        }

        async Task<HttpResponseMessage> GetInternalMapAsync(
            string? token = null)
        {
            using var request = new HttpRequestMessage(
                HttpMethod.Get,
                InternalMapEndpoint);

            if (token is not null)
            {
                request.Headers.Authorization =
                    new AuthenticationHeaderValue("Bearer", token);
            }

            return await client.SendAsync(request);
        }

        try
        {
            var citizen = await CreateUserAsync(AppRoles.Citizen);
            var staff = await CreateUserAsync(AppRoles.Staff);

            var citizenToken = tokens.CreateToken(
                citizen,
                new[] { AppRoles.Citizen });

            var staffToken = tokens.CreateToken(
                staff,
                new[] { AppRoles.Staff });

            var adminToken = tokens.CreateToken(
                admin,
                adminRoles);

            var now = DateTime.UtcNow;

            Department NewDepartment(string name, bool active)
            {
                var fullName = $"{name}-{Guid.NewGuid():N}";

                var department = new Department
                {
                    Id = Guid.NewGuid(),
                    Name = fullName,
                    NormalizedName = fullName.ToUpperInvariant(),
                    IsActive = active
                };

                seededDepartments.Add(department);

                return department;
            }

            var activeDepartment = NewDepartment(
                "Internal Map Roads",
                true);

            var inactiveDepartment = NewDepartment(
                "Internal Map Historical Department",
                false);

            db.Departments.AddRange(seededDepartments);

            Complaint NewComplaint(
                ComplaintStatus status = ComplaintStatus.Submitted,
                double? latitude = 27.708839123,
                double? longitude = 85.319844567)
            {
                var complaint = new Complaint
                {
                    Id = Guid.NewGuid(),
                    Title = "INTERNAL_MAP_TEST_TITLE",
                    Description = "INTERNAL_MAP_PRIVATE_DESCRIPTION",
                    Category = "potholes",
                    Location = "INTERNAL_MAP_TEST_LOCATION",
                    Municipality = "Kathmandu",
                    Ward = "7",
                    Status = status,
                    Priority = ComplaintPriority.Medium,
                    Latitude = latitude,
                    Longitude = longitude,
                    SubmittedByUserId = citizen.Id,
                    CreatedAt = now.AddMinutes(-1),
                    IsPublicMapOptedIn = false,
                    IsPublicMapApproved = false
                };

                seededComplaints.Add(complaint);

                return complaint;
            }

            // More than both existing 100-record and
            // 1000-record limits.
            var validComplaints = Enumerable.Range(0, 1001)
                .Select(_ => NewComplaint())
                .ToList();

            var privateAssigned = NewComplaint(
                ComplaintStatus.InProgress);

            privateAssigned.AssignedToUserId = staff.Id;
            privateAssigned.DepartmentId = activeDepartment.Id;
            privateAssigned.Priority = ComplaintPriority.High;

            var pendingApproval = NewComplaint(
                ComplaintStatus.UnderReview);

            pendingApproval.IsPublicMapOptedIn = true;
            pendingApproval.DepartmentId = activeDepartment.Id;
            pendingApproval.Priority = ComplaintPriority.Critical;

            var publicApproved = NewComplaint(
                ComplaintStatus.Submitted);

            publicApproved.IsPublicMapOptedIn = true;
            publicApproved.IsPublicMapApproved = true;
            publicApproved.CreatedAt = now;

            var resolved = NewComplaint(
                ComplaintStatus.Resolved);

            resolved.DepartmentId = inactiveDepartment.Id;
            resolved.Priority = ComplaintPriority.Low;

            var rejected = NewComplaint(
                ComplaintStatus.Rejected);

            var withdrawn = NewComplaint(
                ComplaintStatus.Withdrawn);

            validComplaints.AddRange(new[]
            {
                privateAssigned,
                pendingApproval,
                publicApproved,
                resolved,
                rejected,
                withdrawn
            });

            // A geographically valid non-Nepal location
            // verifies that the internal map does not apply
            // the public map's Nepal-specific bounds.
            var outsideNepal = NewComplaint(
                latitude: -33.8688123,
                longitude: 151.2093456);

            validComplaints.Add(outsideNepal);

            var invalidComplaints = new[]
            {
                NewComplaint(latitude: null),
                NewComplaint(longitude: null),
                NewComplaint(latitude: null, longitude: null),
                NewComplaint(latitude: 0, longitude: 0),
                NewComplaint(latitude: 91),
                NewComplaint(latitude: -91),
                NewComplaint(longitude: 181),
                NewComplaint(longitude: -181),
                NewComplaint(latitude: double.NaN),
                NewComplaint(longitude: double.NaN),
                NewComplaint(latitude: double.PositiveInfinity),
                NewComplaint(longitude: double.NegativeInfinity)
            };

            db.Complaints.AddRange(seededComplaints);

            await db.SaveChangesAsync();

            var seededIds = seededComplaints
                .Select(c => c.Id)
                .ToHashSet();

            // 1. Authentication and role boundaries.
            using (var response = await GetInternalMapAsync())
            {
                Assert.Equal(
                    HttpStatusCode.Unauthorized,
                    response.StatusCode);
            }

            using (var response =
                   await GetInternalMapAsync(citizenToken))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            using (var response =
                   await GetInternalMapAsync(staffToken))
            {
                Assert.Equal(
                    HttpStatusCode.Forbidden,
                    response.StatusCode);
            }

            // 2. Authorized administrator access.
            using var adminResponse =
                await GetInternalMapAsync(adminToken);

            Assert.Equal(
                HttpStatusCode.OK,
                adminResponse.StatusCode);

            Assert.True(
                adminResponse.Headers.CacheControl?.NoStore == true);

            var body = await adminResponse.Content
                .ReadAsStringAsync();

            using var json = JsonDocument.Parse(body);

            Assert.Equal(
                JsonValueKind.Array,
                json.RootElement.ValueKind);

            var matching = json.RootElement
                .EnumerateArray()
                .Where(item => seededIds.Contains(
                    item.GetProperty("id").GetGuid()))
                .ToDictionary(
                    item => item.GetProperty("id").GetGuid());

            // 3. Completeness: no silently truncated records.
            Assert.True(validComplaints.Count > 1000);

            Assert.Equal(
                validComplaints.Count,
                matching.Count);

            Assert.Equal(
                validComplaints.Select(c => c.Id)
                    .OrderBy(id => id).ToArray(),
                matching.Keys
                    .OrderBy(id => id).ToArray());

            // Verify coverage of every defined status and priority.
            Assert.Equal(
                Enum.GetValues<ComplaintStatus>()
                    .OrderBy(value => value).ToArray(),
                validComplaints.Select(c => c.Status)
                    .Distinct()
                    .OrderBy(value => value).ToArray());

            Assert.Equal(
                Enum.GetValues<ComplaintPriority>()
                    .OrderBy(value => value).ToArray(),
                validComplaints.Select(c => c.Priority)
                    .Distinct()
                    .OrderBy(value => value).ToArray());

            // 4. Reject all invalid coordinates.
            foreach (var complaint in invalidComplaints)
            {
                Assert.DoesNotContain(
                    complaint.Id,
                    matching.Keys);
            }

            // 5. Explicit response field allowlist.
            var allowedFields = new[]
            {
                "id",
                "title",
                "category",
                "status",
                "priority",
                "location",
                "municipality",
                "ward",
                "departmentId",
                "departmentName",
                "isAssigned",
                "latitude",
                "longitude",
                "createdAt"
            }.OrderBy(name => name).ToArray();

            foreach (var complaint in validComplaints)
            {
                var item = matching[complaint.Id];

                var actualFields = item
                    .EnumerateObject()
                    .Select(p => p.Name)
                    .OrderBy(name => name)
                    .ToArray();

                Assert.Equal(allowedFields, actualFields);

                // 6. Preserve exact stored coordinates.
                Assert.Equal(
                    complaint.Latitude!.Value,
                    item.GetProperty("latitude").GetDouble());

                Assert.Equal(
                    complaint.Longitude!.Value,
                    item.GetProperty("longitude").GetDouble());

                Assert.Equal(
                    complaint.Status.ToString(),
                    item.GetProperty("status").GetString());

                Assert.Equal(
                    complaint.Priority.ToString(),
                    item.GetProperty("priority").GetString());

                Assert.Equal(
                    complaint.Category,
                    item.GetProperty("category").GetString());

                Assert.Equal(
                    complaint.Municipality,
                    item.GetProperty("municipality").GetString());

                Assert.Equal(
                    complaint.AssignedToUserId.HasValue,
                    item.GetProperty("isAssigned").GetBoolean());

                if (complaint.DepartmentId.HasValue)
                {
                    var expectedDepartment = seededDepartments.Single(
                        d => d.Id == complaint.DepartmentId.Value);

                    Assert.Equal(
                        expectedDepartment.Id,
                        item.GetProperty("departmentId").GetGuid());

                    Assert.Equal(
                        expectedDepartment.Name,
                        item.GetProperty("departmentName").GetString());
                }
                else
                {
                    Assert.Equal(
                        JsonValueKind.Null,
                        item.GetProperty("departmentId").ValueKind);

                    Assert.Equal(
                        JsonValueKind.Null,
                        item.GetProperty("departmentName").ValueKind);
                }
            }

            Assert.DoesNotContain(
                "INTERNAL_MAP_PRIVATE_DESCRIPTION",
                body);

            Assert.DoesNotContain(citizen.Email!, body);

            Assert.DoesNotContain(staff.Email!, body);

            // 7. Private and terminal-status complaints
            // remain available to administrators.
            Assert.Contains(privateAssigned.Id, matching.Keys);
            Assert.Contains(pendingApproval.Id, matching.Keys);
            Assert.Contains(resolved.Id, matching.Keys);
            Assert.Contains(rejected.Id, matching.Keys);
            Assert.Contains(withdrawn.Id, matching.Keys);
            Assert.Contains(outsideNepal.Id, matching.Keys);

            Assert.True(
                matching[privateAssigned.Id]
                    .GetProperty("isAssigned").GetBoolean());

            Assert.False(
                matching[validComplaints[0].Id]
                    .GetProperty("isAssigned").GetBoolean());

            // Department assignment is independent of staff assignment.
            Assert.Equal(
                activeDepartment.Id,
                matching[privateAssigned.Id]
                    .GetProperty("departmentId").GetGuid());

            Assert.Equal(
                activeDepartment.Name,
                matching[pendingApproval.Id]
                    .GetProperty("departmentName").GetString());

            Assert.False(
                matching[pendingApproval.Id]
                    .GetProperty("isAssigned").GetBoolean());

            // Historical complaints remain visible even if their
            // department has subsequently been deactivated.
            Assert.Equal(
                inactiveDepartment.Id,
                matching[resolved.Id]
                    .GetProperty("departmentId").GetGuid());

            Assert.Equal(
                inactiveDepartment.Name,
                matching[resolved.Id]
                    .GetProperty("departmentName").GetString());

            // 8. Verify the anonymous Public Map still
            // excludes private and unapproved complaints.
            using var publicResponse =
                await client.GetAsync(PublicMapEndpoint);

            Assert.Equal(
                HttpStatusCode.OK,
                publicResponse.StatusCode);

            var publicBody = await publicResponse.Content
                .ReadAsStringAsync();

            using var publicJson =
                JsonDocument.Parse(publicBody);

            var publicMatching = publicJson.RootElement
                .EnumerateArray()
                .Where(item => seededIds.Contains(
                    item.GetProperty("id").GetGuid()))
                .ToDictionary(
                    item => item.GetProperty("id").GetGuid());

            var publicItem = Assert.Single(publicMatching);

            Assert.Equal(publicApproved.Id, publicItem.Key);

            Assert.DoesNotContain(
                privateAssigned.Id,
                publicMatching.Keys);

            Assert.DoesNotContain(
                pendingApproval.Id,
                publicMatching.Keys);

            // The existing public feed must retain its
            // deliberately approximate coordinate policy.
            Assert.Equal(
                Math.Round(publicApproved.Latitude!.Value, 3),
                publicItem.Value
                    .GetProperty("latitude").GetDouble());

            Assert.Equal(
                Math.Round(publicApproved.Longitude!.Value, 3),
                publicItem.Value
                    .GetProperty("longitude").GetDouble());

            Assert.DoesNotContain(
                "INTERNAL_MAP_TEST_TITLE",
                publicBody);

            Assert.DoesNotContain(
                "INTERNAL_MAP_TEST_LOCATION",
                publicBody);

            Assert.DoesNotContain(
                "INTERNAL_MAP_PRIVATE_DESCRIPTION",
                publicBody);
        }
        finally
        {
            // Cleanup only records created by this test.
            var ids = seededComplaints
                .Select(c => c.Id)
                .ToArray();

            if (ids.Length > 0)
            {
                await db.Complaints
                    .Where(c => ids.Contains(c.Id))
                    .ExecuteDeleteAsync();
            }

            var departmentIds = seededDepartments
                .Select(d => d.Id)
                .ToArray();

            if (departmentIds.Length > 0)
            {
                await db.Departments
                    .Where(d => departmentIds.Contains(d.Id))
                    .ExecuteDeleteAsync();
            }

            db.ChangeTracker.Clear();

            foreach (var user in createdUsers)
            {
                var result = await users.DeleteAsync(user);

                Assert.True(
                    result.Succeeded,
                    string.Join(", ",
                        result.Errors.Select(e => e.Description)));
            }
        }
    }
}
