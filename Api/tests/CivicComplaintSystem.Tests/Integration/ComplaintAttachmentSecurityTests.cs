using System.Net;
using System.Net.Http.Headers;
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

public class ComplaintAttachmentSecurityTests
{
    [Fact]
    public async Task AttachmentEndpoints_EnforceOwnership_AndRejectMalformedImages()
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

        var context = scope.ServiceProvider
            .GetRequiredService<AppDbContext>();

        var users = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();

        var tokens = scope.ServiceProvider
            .GetRequiredService<JwtTokenService>();

        var owner = NewCitizen();
        var stranger = NewCitizen();

        var ownerCreated = false;
        var strangerCreated = false;
        var complaintId = Guid.NewGuid();

        try
        {
            var result = await users.CreateAsync(owner);
            Assert.True(result.Succeeded);
            ownerCreated = true;

            result = await users.CreateAsync(stranger);
            Assert.True(result.Succeeded);
            strangerCreated = true;

            Assert.True((await users.AddToRoleAsync(
                owner, AppRoles.Citizen)).Succeeded);

            Assert.True((await users.AddToRoleAsync(
                stranger, AppRoles.Citizen)).Succeeded);

            context.Complaints.Add(new Complaint
            {
                Id = complaintId,
                Title = "Attachment security test",
                Description = "Testing attachment authorization and validation.",
                Category = "other",
                Location = "Test location",
                SubmittedByUserId = owner.Id,
                Status = ComplaintStatus.Submitted
            });

            await context.SaveChangesAsync();

            var ownerToken = tokens.CreateToken(
                owner, new[] { AppRoles.Citizen });

            var strangerToken = tokens.CreateToken(
                stranger, new[] { AppRoles.Citizen });

            var attachmentUrl =
                $"/api/complaints/{complaintId}/attachments";

            var fileUrl =
                $"{attachmentUrl}/{Guid.NewGuid()}";

            // Unauthenticated requests are denied.
            Assert.Equal(
                HttpStatusCode.Unauthorized,
                await GetStatusAsync(client, attachmentUrl, null));

            Assert.Equal(
                HttpStatusCode.Unauthorized,
                await GetStatusAsync(client, fileUrl, null));

            // Another citizen cannot list or read attachments.
            Assert.Equal(
                HttpStatusCode.Forbidden,
                await GetStatusAsync(
                    client, attachmentUrl, strangerToken));

            Assert.Equal(
                HttpStatusCode.Forbidden,
                await GetStatusAsync(
                    client, fileUrl, strangerToken));

            // The complaint owner can list attachments.
            Assert.Equal(
                HttpStatusCode.OK,
                await GetStatusAsync(
                    client, attachmentUrl, ownerToken));

            // Another citizen cannot upload attachments.
            Assert.Equal(
                HttpStatusCode.Forbidden,
                await PostFakeImageAsync(
                    client, attachmentUrl, strangerToken));

            // A malformed JPEG must fail server-side validation.
            Assert.Equal(
                HttpStatusCode.BadRequest,
                await PostFakeImageAsync(
                    client, attachmentUrl, ownerToken));

            Assert.False(await context.ComplaintAttachments
                .AnyAsync(a => a.ComplaintId == complaintId));
        }
        finally
        {
            await context.ComplaintAttachments
                .Where(a => a.ComplaintId == complaintId)
                .ExecuteDeleteAsync();

            await context.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteDeleteAsync();

            if (strangerCreated)
                await users.DeleteAsync(stranger);

            if (ownerCreated)
                await users.DeleteAsync(owner);
        }
    }


    [Fact]
    public async Task ConcurrentUploads_CannotExceedFive()
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

        var context = scope.ServiceProvider
            .GetRequiredService<AppDbContext>();

        var users = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();

        var tokens = scope.ServiceProvider
            .GetRequiredService<JwtTokenService>();

        var attachments = scope.ServiceProvider
            .GetRequiredService<
                CivicComplaintSystem.Api.Features.Complaints.Attachments
                    .ComplaintAttachmentService>();

        var owner = NewCitizen();
        var complaintId = Guid.NewGuid();
        var ownerCreated = false;

        try
        {
            var result = await users.CreateAsync(owner);
            Assert.True(result.Succeeded);
            ownerCreated = true;

            Assert.True((await users.AddToRoleAsync(
                owner, AppRoles.Citizen)).Succeeded);

            context.Complaints.Add(new Complaint
            {
                Id = complaintId,
                Title = "Concurrent evidence test",
                Description = "Verify the five-photo limit.",
                Category = "other",
                Location = "Test location",
                SubmittedByUserId = owner.Id,
                Status = ComplaintStatus.Submitted
            });

            await context.SaveChangesAsync();

            var token = tokens.CreateToken(
                owner, new[] { AppRoles.Citizen });

            var url =
                $"/api/complaints/{complaintId}/attachments";

            // Upload the first four images normally.
            for (var i = 0; i < 4; i++)
            {
                Assert.Equal(
                    HttpStatusCode.Created,
                    await PostValidPngAsync(client, url, token));
            }

            // Race two requests for the final available slot.
            var results = await Task.WhenAll(
                PostValidPngAsync(client, url, token),
                PostValidPngAsync(client, url, token));

            Assert.Equal(1, results.Count(
                status => status == HttpStatusCode.Created));

            Assert.Equal(1, results.Count(
                status => status == HttpStatusCode.BadRequest));

            var saved = await context.ComplaintAttachments
                .AsNoTracking()
                .Where(a => a.ComplaintId == complaintId)
                .ToListAsync();

            Assert.Equal(5, saved.Count);

            // An existing attachment must still be downloadable.
            Assert.Equal(
                HttpStatusCode.OK,
                await GetStatusAsync(
                    client,
                    $"{url}/{saved[0].Id}",
                    token));
        }
        finally
        {
            var storedNames = await context.ComplaintAttachments
                .AsNoTracking()
                .Where(a => a.ComplaintId == complaintId)
                .Select(a => a.StoredFileName)
                .ToListAsync();

            await context.ComplaintAttachments
                .Where(a => a.ComplaintId == complaintId)
                .ExecuteDeleteAsync();

            await context.Complaints
                .Where(c => c.Id == complaintId)
                .ExecuteDeleteAsync();

            foreach (var name in storedNames)
            {
                File.Delete(Path.Combine(
                    attachments.GetUploadsDirectory(), name));
            }

            if (ownerCreated)
                await users.DeleteAsync(owner);
        }
    }

    private static ApplicationUser NewCitizen()
    {
        var id = Guid.NewGuid();

        return new ApplicationUser
        {
            Id = id,
            UserName = $"attachment-{id}@test.local",
            Email = $"attachment-{id}@test.local",
            FirstName = "Attachment",
            LastName = "Tester",
            IsActive = true
        };
    }

    private static async Task<HttpStatusCode> GetStatusAsync(
        HttpClient client,
        string url,
        string? token)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get, url);

        if (token is not null)
        {
            request.Headers.Authorization =
                new AuthenticationHeaderValue("Bearer", token);
        }

        using var response = await client.SendAsync(request);
        return response.StatusCode;
    }


    private static async Task<HttpStatusCode> PostValidPngAsync(
        HttpClient client,
        string url,
        string token)
    {
        // A real, decodable 2x2 PNG image.
        const string imageBase64 =
            "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91Jpz" +
            "AAAAFklEQVR4nGOUqLzEwMDAxMDAwMDAAAAQFAFnzOolTQ" +
            "AAAABJRU5ErkJggg==";

        using var request = new HttpRequestMessage(
            HttpMethod.Post, url);

        request.Headers.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        using var form = new MultipartFormDataContent();
        using var file = new ByteArrayContent(
            Convert.FromBase64String(imageBase64));

        file.Headers.ContentType =
            new MediaTypeHeaderValue("image/png");

        form.Add(file, "File", "valid-test.png");
        request.Content = form;

        using var response = await client.SendAsync(request);
        return response.StatusCode;
    }

    private static async Task<HttpStatusCode> PostFakeImageAsync(
        HttpClient client,
        string url,
        string token)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Post, url);

        request.Headers.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        // Contains a JPEG signature but is not a valid image.
        var fakeJpeg = new byte[]
        {
            0xFF, 0xD8, 0xFF, 0xE0,
            0x00, 0x10, 0x00, 0x00
        };

        using var form = new MultipartFormDataContent();
        using var file = new ByteArrayContent(fakeJpeg);

        file.Headers.ContentType =
            new MediaTypeHeaderValue("image/jpeg");

        form.Add(file, "File", "malformed.jpg");

        request.Content = form;

        using var response = await client.SendAsync(request);
        return response.StatusCode;
    }
}
