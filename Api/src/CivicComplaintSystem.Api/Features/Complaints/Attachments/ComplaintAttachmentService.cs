using CivicComplaintSystem.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Api.Features.Complaints.Attachments;

public sealed class ComplaintAttachmentService(
    AppDbContext context,
    IWebHostEnvironment environment)
{
    private const long MaxFileSizeBytes =
        5 * 1024 * 1024;

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

        var uploadsFolder = Path.Combine(
            environment.WebRootPath ?? "wwwroot",
            "uploads",
            "complaints");

        Directory.CreateDirectory(uploadsFolder);
        var storedFileName =
            $"{Guid.NewGuid()}{extension}";

        var filePath =
            Path.Combine(
                uploadsFolder,
                storedFileName);

        await using (var stream =
                     new FileStream(
                         filePath,
                         FileMode.Create))
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

        return new AttachmentUploadResult
        {
            Attachment = attachment
        };
    }


    private static async Task<bool> IsValidImageAsync(
        IFormFile file,
        string extension,
        CancellationToken cancellationToken)
    {
        var buffer = new byte[12];

        await using var stream =
            file.OpenReadStream();

        var bytesRead =
            await stream.ReadAsync(
                buffer.AsMemory(
                    0,
                    buffer.Length),
                cancellationToken);

        if (bytesRead < 4)
            return false;

        var isJpeg =
            buffer[0] == 0xFF &&
            buffer[1] == 0xD8 &&
            buffer[2] == 0xFF;

        var isPng =
            bytesRead >= 8 &&
            buffer[0] == 0x89 &&
            buffer[1] == 0x50 &&
            buffer[2] == 0x4E &&
            buffer[3] == 0x47 &&
            buffer[4] == 0x0D &&
            buffer[5] == 0x0A &&
            buffer[6] == 0x1A &&
            buffer[7] == 0x0A;

        var isWebP =
            bytesRead >= 12 &&
            buffer[0] == 0x52 &&
            buffer[1] == 0x49 &&
            buffer[2] == 0x46 &&
            buffer[3] == 0x46 &&
            buffer[8] == 0x57 &&
            buffer[9] == 0x45 &&
            buffer[10] == 0x42 &&
            buffer[11] == 0x50;

        return extension switch
        {
            ".jpg" or ".jpeg" => isJpeg,
            ".png" => isPng,
            ".webp" => isWebP,
            _ => false
        };
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