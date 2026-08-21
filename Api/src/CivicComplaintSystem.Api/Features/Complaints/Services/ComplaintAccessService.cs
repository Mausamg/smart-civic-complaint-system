namespace CivicComplaintSystem.Api.Features.Complaints.Services;

public sealed class ComplaintAccessService
{
    public bool CanViewComplaint(
        Guid currentUserId,
        bool isAdmin,
        bool isStaff,
        Guid submittedByUserId,
        Guid? assignedToUserId)
    {
        if (isAdmin)
            return true;

        if (submittedByUserId == currentUserId)
            return true;

        if (isStaff &&
            assignedToUserId == currentUserId)
            return true;

        return false;
    }
}