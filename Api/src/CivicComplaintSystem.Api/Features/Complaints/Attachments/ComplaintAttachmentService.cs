using CivicComplaintSystem.Api.Data;
using ImageMagick;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace CivicComplaintSystem.Api.Features.Complaints.Attachments;

public sealed class ComplaintAttachmentService(
    AppDbContext context,
    IWebHostEnvironment environment,
    ILogger<ComplaintAttachmentService> logger)
{
    private const long MaxFileSizeBytes =
        5 * 1024 * 1024;

    public string GetUploadsDirectory()
    {
        return Path.Combine(
            environment.ContentRootPath,
            "private-uploads",
            "complaints");
    }

    public async Task<AttachmentUploadResult> UploadAsync(
        Guid complaintId,
        Guid userId,
        IFormFile file,
        CancellationToken cancellationToken = default)
    {
        if (file.Length == 0)
            return new AttachmentUploadResult
            {
                Error = "File cannot be empty."
            };

        if (file.Length > MaxFileSizeBytes)
            return new AttachmentUploadResult
            {
                Error = "File size cannot exceed 5 MB."
            };
        var extension =
            Path.GetExtension(file.FileName)
                .ToLowerInvariant();

        if (!await IsValidImageAsync(
                file,
                extension,
                cancellationToken))
            return new AttachmentUploadResult
            {
                Error =
                    "File content does not match the image extension."
            };

        // Serialize uploads to this complaint across all API instances.
        await using var uploadTransaction =
            await context.Database.BeginTransactionAsync(
                cancellationToken);

        await using (var lockCommand =
            context.Database.GetDbConnection().CreateCommand())
        {
            lockCommand.Transaction =
                uploadTransaction.GetDbTransaction();

            lockCommand.CommandText =
                @"SELECT 1 FROM ""Complaints""
                  WHERE ""Id"" = @complaintId FOR UPDATE";

            var parameter = lockCommand.CreateParameter();
            parameter.ParameterName = "complaintId";
            parameter.Value = complaintId;
            lockCommand.Parameters.Add(parameter);

            var exists =
                await lockCommand.ExecuteScalarAsync(
                    cancellationToken);

            if (exists is null)
            {
                return new AttachmentUploadResult
                {
                    Error = "Complaint not found."
                };
            }
        }

        var attachmentCount =
            await context.ComplaintAttachments
                .CountAsync(
                    a => a.ComplaintId == complaintId,
                    cancellationToken);

        if (attachmentCount >= 5)
            return new AttachmentUploadResult
            {
                Error = "Maximum of 5 attachments allowed per complaint."
            };

        var uploadsFolder = GetUploadsDirectory();

        Directory.CreateDirectory(uploadsFolder);
        var storedFileName =
            $"{Guid.NewGuid()}{extension}";

        var filePath =
            Path.Combine(
                uploadsFolder,
                storedFileName);

        var persisted = false;

        try
        {
            await using (var stream =
                         new FileStream(
                             filePath,
                             FileMode.CreateNew))
            {
                await file.CopyToAsync(
                    stream,
                    cancellationToken);
            }

            var contentType =
                extension switch
                {
                    ".jpg" or ".jpeg" => "image/jpeg",
                    ".png" => "image/png",
                    ".webp" => "image/webp",
                    _ => "application/octet-stream"
                };
            var attachment =
                new ComplaintAttachment
                {
                    Id = Guid.NewGuid(),
                    ComplaintId = complaintId,
                    FileName = file.FileName,
                    StoredFileName = storedFileName,
                    ContentType = contentType,
                    FileSize = file.Length,
                    UploadedByUserId = userId,
                    CreatedAtUtc = DateTime.UtcNow
                };

            context.ComplaintAttachments.Add(
                attachment);

            await context.SaveChangesAsync(
                cancellationToken);

            await uploadTransaction.CommitAsync(
                cancellationToken);

            persisted = true;

            return new AttachmentUploadResult
            {
                Attachment = attachment
            };
        }
        finally
        {
            if (!persisted)
            {
                try
                {
                    File.Delete(filePath);
                }
                catch (Exception exception) when (
                    exception is IOException or UnauthorizedAccessException)
                {
                    logger.LogWarning(
                        exception,
                        "Unable to remove incomplete evidence file {FilePath}",
                        filePath);
                }
            }
        }
    }


    private static async Task<bool> IsValidImageAsync(
        IFormFile file,
        string extension,
        CancellationToken cancellationToken)
    {
        const long maxFileBytes = 5 * 1024 * 1024;
        const ulong maxPixels = 40_000_000;

        var expectedFormat = extension switch
        {
            ".jpg" or ".jpeg" => MagickFormat.Jpeg,
            ".png" => MagickFormat.Png,
            ".webp" => MagickFormat.WebP,
            _ => MagickFormat.Unknown
        };

        if (expectedFormat == MagickFormat.Unknown ||
            file.Length == 0 ||
            file.Length > maxFileBytes)
        {
            return false;
        }

        cancellationToken.ThrowIfCancellationRequested();

        try
        {
            await using var input = file.OpenReadStream();

            using var buffer = new MemoryStream();

            await input.CopyToAsync(
                buffer,
                cancellationToken);

            if (buffer.Length == 0 ||
                buffer.Length > maxFileBytes)
                return false;

            var bytes = buffer.ToArray();

            var info = new MagickImageInfo();
            info.Read(bytes);

            if (info.Format != expectedFormat ||
                info.Width == 0 ||
                info.Height == 0 ||
                (ulong)info.Width * info.Height > maxPixels)
            {
                return false;
            }

            cancellationToken.ThrowIfCancellationRequested();

            using var image = new MagickImage(bytes);

            return image.Format == expectedFormat &&
                   image.Width > 0 &&
                   image.Height > 0 &&
                   (ulong)image.Width * image.Height <= maxPixels;
        }
        catch (MagickException)
        {
            return false;
        }
    }


    public async Task<List<ComplaintAttachmentResponse>> GetByComplaintIdAsync(
        Guid complaintId,
        CancellationToken cancellationToken = default)
    {
        return await context.ComplaintAttachments
            .AsNoTracking()
            .Where(a => a.ComplaintId == complaintId)
            .OrderBy(a => a.CreatedAtUtc)
            .Select(a =>
                new ComplaintAttachmentResponse
                {
                    Id = a.Id,
                    ComplaintId = a.ComplaintId,
                    FileName = a.FileName,
                    ContentType = a.ContentType,
                    FileSize = a.FileSize,
                    CreatedAtUtc = a.CreatedAtUtc
                })
            .ToListAsync(cancellationToken);
    }


    public async Task<ComplaintAttachment?> GetByIdAsync(
        Guid complaintId,
        Guid attachmentId,
        CancellationToken cancellationToken = default)
    {
        return await context.ComplaintAttachments
            .AsNoTracking()
            .FirstOrDefaultAsync(
                a => a.Id == attachmentId &&
                     a.ComplaintId == complaintId,
                cancellationToken);
    }
}