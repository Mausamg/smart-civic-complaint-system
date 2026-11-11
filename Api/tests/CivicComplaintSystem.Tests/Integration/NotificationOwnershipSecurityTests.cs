using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using CivicComplaintSystem.Api.Data;
using CivicComplaintSystem.Api.Features.Auth;
using CivicComplaintSystem.Api.Features.Notifications;
using CivicComplaintSystem.Api.Features.Users;
using CivicComplaintSystem.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CivicComplaintSystem.Tests.Integration;

public class NotificationOwnershipSecurityTests
{
    [Fact]
    public async Task Notifications_AreIsolatedByAuthenticatedUser()
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

        var aliceId = Guid.NewGuid();
        var bobId = Guid.NewGuid();

        var aliceNotification1 = Guid.NewGuid();
        var aliceNotification2 = Guid.NewGuid();
        var bobNotification = Guid.NewGuid();

        var createdUsers = new List<ApplicationUser>();

        async Task<(ApplicationUser User, string Token)>
            CreateCitizenAsync(Guid id)
        {
            var user = new ApplicationUser
            {
                Id = id,
                UserName = $"notify-{id}@test.local",
                Email = $"notify-{id}@test.local",
                FirstName = "Notification",
                LastName = "Tester",
                IsActive = true
            };

            Assert.True(
                (await users.CreateAsync(user)).Succeeded);

            createdUsers.Add(user);

            Assert.True(
                (await users.AddToRoleAsync(
                    user, AppRoles.Citizen)).Succeeded);

            return (
                user,
                tokens.CreateToken(
                    user,
                    new[] { AppRoles.Citizen })
            );
        }

        try
        {
            var alice = await CreateCitizenAsync(aliceId);
            var bob = await CreateCitizenAsync(bobId);

            Notification MakeNotification(
                Guid id,
                Guid userId,
                string title) => new()
            {
                Id = id,
                UserId = userId,
                Title = title,
                Message = "Security test notification",
                IsRead = false,
                CreatedAtUtc = DateTime.UtcNow
            };

            db.Notifications.AddRange(
                MakeNotification(
                    aliceNotification1,
                    aliceId,
                    "Alice first"),
                MakeNotification(
                    aliceNotification2,
                    aliceId,
                    "Alice second"),
                MakeNotification(
                    bobNotification,
                    bobId,
                    "Bob private"));

            await db.SaveChangesAsync();

            void Authenticate(string? token)
            {
                client.DefaultRequestHeaders.Authorization =
                    token is null
                        ? null
                        : new AuthenticationHeaderValue(
                            "Bearer", token);
            }

            async Task<bool> IsReadAsync(Guid id) =>
                await db.Notifications
                    .AsNoTracking()
                    .Where(n => n.Id == id)
                    .Select(n => n.IsRead)
                    .SingleAsync();

            // Anonymous requests require authentication.
            Authenticate(null);

            using (var response =
                await client.GetAsync("/api/notifications"))
            {
                Assert.Equal(
                    HttpStatusCode.Unauthorized,
                    response.StatusCode);
            }

            // Alice sees only her notifications.
            Authenticate(alice.Token);

            using (var response =
                await client.GetAsync("/api/notifications"))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);

                using var json = JsonDocument.Parse(
                    await response.Content.ReadAsStringAsync());

                var ids = json.RootElement
                    .EnumerateArray()
                    .Select(n =>
                        n.GetProperty("id").GetGuid())
                    .ToArray();

                Assert.Equal(2, ids.Length);
                Assert.Contains(aliceNotification1, ids);
                Assert.Contains(aliceNotification2, ids);
                Assert.DoesNotContain(bobNotification, ids);
            }

            // Alice cannot mark Bob's notification as read.
            using (var response = await client.PatchAsync(
                $"/api/notifications/{bobNotification}/read",
                null))
            {
                Assert.Equal(
                    HttpStatusCode.NotFound,
                    response.StatusCode);
            }

            Assert.False(
                await IsReadAsync(bobNotification));

            // Alice may mark her own notification as read.
            using (var response = await client.PatchAsync(
                $"/api/notifications/{aliceNotification1}/read",
                null))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);
            }

            Assert.True(
                await IsReadAsync(aliceNotification1));

            // Alice now has exactly one unread notification.
            using (var response = await client.GetAsync(
                "/api/notifications/unread-count"))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);

                using var json = JsonDocument.Parse(
                    await response.Content.ReadAsStringAsync());

                Assert.Equal(
                    1,
                    json.RootElement
                        .GetProperty("unreadCount")
                        .GetInt32());
            }

            // Alice's read-all must not modify Bob's data.
            using (var response = await client.PatchAsync(
                "/api/notifications/read-all",
                null))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);

                using var json = JsonDocument.Parse(
                    await response.Content.ReadAsStringAsync());

                Assert.Equal(
                    1,
                    json.RootElement
                        .GetProperty("updatedCount")
                        .GetInt32());
            }

            Assert.True(
                await IsReadAsync(aliceNotification1));

            Assert.True(
                await IsReadAsync(aliceNotification2));

            Assert.False(
                await IsReadAsync(bobNotification));

            // Bob still sees his own unread notification.
            Authenticate(bob.Token);

            using (var response = await client.GetAsync(
                "/api/notifications/unread-count"))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);

                using var json = JsonDocument.Parse(
                    await response.Content.ReadAsStringAsync());

                Assert.Equal(
                    1,
                    json.RootElement
                        .GetProperty("unreadCount")
                        .GetInt32());
            }

            // Bob cannot modify Alice's notification.
            using (var response = await client.PatchAsync(
                $"/api/notifications/{aliceNotification1}/read",
                null))
            {
                Assert.Equal(
                    HttpStatusCode.NotFound,
                    response.StatusCode);
            }

            // Bob can mark his own notification as read.
            using (var response = await client.PatchAsync(
                $"/api/notifications/{bobNotification}/read",
                null))
            {
                Assert.Equal(
                    HttpStatusCode.OK,
                    response.StatusCode);
            }

            Assert.True(
                await IsReadAsync(bobNotification));
        }
        finally
        {
            var notificationIds = new[]
            {
                aliceNotification1,
                aliceNotification2,
                bobNotification
            };

            await db.Notifications
                .Where(n =>
                    notificationIds.Contains(n.Id))
                .ExecuteDeleteAsync();

            foreach (var user in createdUsers
                .AsEnumerable().Reverse())
            {
                await users.DeleteAsync(user);
            }
        }
    }
}
