using CivicComplaintSystem.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CivicComplaintSystem.Api.Features.Complaints.Services;

public sealed class ComplaintCommandService(
    AppDbContext context)
{
    public async Task<Complaint> CreateAsync(
        Guid userId,
        CreateComplaintRequest request,
        CancellationToken cancellationToken = default)
    {
        var complaint = new Complaint
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Category = request.Category.Trim(),
            Location = request.Location.Trim(),
            Status = ComplaintStatus.Submitted,
            CreatedAt = DateTime.UtcNow,
            SubmittedByUserId = userId
        };

        context.Complaints.Add(complaint);

        await context.SaveChangesAsync(
            cancellationToken);

        return complaint;
    }


    public async Task UpdateAsync(
        Complaint complaint,
        UpdateComplaintRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Title is not null)
            complaint.Title = request.Title.Trim();

        if (request.Description is not null)
            complaint.Description = request.Description.Trim();

        if (request.Category is not null)
            complaint.Category = request.Category.Trim();

        if (request.Location is not null)
            complaint.Location = request.Location.Trim();

        complaint.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync(
            cancellationToken);
    }


    public async Task WithdrawAsync(
        Complaint complaint,
        Guid changedByUserId,
        CancellationToken cancellationToken = default)
    {
        var oldStatus =
            complaint.Status;

        var now =
            DateTime.UtcNow;

        complaint.Status =
            ComplaintStatus.Withdrawn;

        complaint.UpdatedAt =
            now;

        var history =
            new ComplaintStatusHistory
            {
                Id = Guid.NewGuid(),
                ComplaintId = complaint.Id,
                OldStatus = oldStatus,
                NewStatus = ComplaintStatus.Withdrawn,
                ChangedByUserId = changedByUserId,
                ChangedAtUtc = now,
                Note = "Complaint withdrawn by citizen."
            };

        context.ComplaintStatusHistories.Add(
            history);

        await context.SaveChangesAsync(
            cancellationToken);
    }


    public async Task<Complaint?> UpdatePriorityAsync(
        Guid complaintId,
        ComplaintPriority priority,
        CancellationToken cancellationToken = default)
    {
        var complaint = await context.Complaints
            .FirstOrDefaultAsync(
                c => c.Id == complaintId,
                cancellationToken);

        if (complaint is null)
            return null;

        complaint.Priority = priority;
        complaint.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync(
            cancellationToken);

        return complaint;
    }


    public async Task UpdateStatusAsync(
        Complaint complaint,
        ComplaintStatus newStatus,
        Guid changedByUserId,
        CancellationToken cancellationToken = default)
    {
        var oldStatus = complaint.Status;
        var now = DateTime.UtcNow;

        complaint.Status = newStatus;
        complaint.UpdatedAt = now;

        var history = new ComplaintStatusHistory
        {
            Id = Guid.NewGuid(),
            ComplaintId = complaint.Id,
            OldStatus = oldStatus,
            NewStatus = newStatus,
            ChangedByUserId = changedByUserId,
            ChangedAtUtc = now,
            Note = null
        };

        context.ComplaintStatusHistories.Add(
            history);

        await context.SaveChangesAsync(
            cancellationToken);
    }


    public async Task AssignAsync(
        Complaint complaint,
        Guid staffUserId,
        Guid changedByUserId,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        var oldAssignedToUserId =
            complaint.AssignedToUserId;

        var assignmentHistory =
            new ComplaintAssignmentHistory
            {
                Id = Guid.NewGuid(),
                ComplaintId = complaint.Id,

                OldAssignedToUserId =
                    oldAssignedToUserId,

                NewAssignedToUserId =
                    staffUserId,

                ChangedByUserId =
                    changedByUserId,

                ChangedAtUtc =
                    now,

                Note =
                    oldAssignedToUserId.HasValue
                        ? "Complaint reassigned to another staff member."
                        : "Complaint assigned to staff."
            };

        context.ComplaintAssignmentHistories.Add(
            assignmentHistory);

        complaint.AssignedToUserId =
            staffUserId;

        if (complaint.Status ==
            ComplaintStatus.Submitted)
        {
            var oldStatus =
                complaint.Status;

            complaint.Status =
                ComplaintStatus.UnderReview;

            var statusHistory =
                new ComplaintStatusHistory
                {
                    Id = Guid.NewGuid(),
                    ComplaintId = complaint.Id,
                    OldStatus = oldStatus,

                    NewStatus =
                        ComplaintStatus.UnderReview,

                    ChangedByUserId =
                        changedByUserId,

                    ChangedAtUtc =
                        now,

                    Note =
                        "Status automatically changed when complaint was assigned."
                };

            context.ComplaintStatusHistories.Add(
                statusHistory);
        }

        complaint.UpdatedAt =
            now;

        await context.SaveChangesAsync(
            cancellationToken);
    }


    public async Task<ComplaintComment> AddCommentAsync(
        Guid complaintId,
        Guid userId,
        string message,
        CancellationToken cancellationToken = default)
    {
        var comment = new ComplaintComment
        {
            Id = Guid.NewGuid(),
            ComplaintId = complaintId,
            Message = message.Trim(),
            CreatedByUserId = userId,
            CreatedAtUtc = DateTime.UtcNow
        };

        context.ComplaintComments.Add(comment);

        await context.SaveChangesAsync(cancellationToken);

        return comment;
    }
}