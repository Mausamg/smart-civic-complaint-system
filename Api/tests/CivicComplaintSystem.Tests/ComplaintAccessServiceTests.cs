using CivicComplaintSystem.Api.Features.Complaints.Services;

namespace CivicComplaintSystem.Tests;

public class ComplaintAccessServiceTests
{
    [Theory]
    // Admin can view any complaint
    [InlineData(true, false, false, false, true)]

    // Citizen can view their own complaint
    [InlineData(false, false, true, false, true)]

    // Assigned staff can view a complaint
    [InlineData(false, true, false, true, true)]

    // Unrelated citizen cannot view
    [InlineData(false, false, false, false, false)]

    // Unassigned staff cannot view
    [InlineData(false, true, false, false, false)]

    // Assignment alone does not grant citizen access
    [InlineData(false, false, false, true, false)]

    public void CanViewComplaint_ShouldRespectAccessRules(
        bool isAdmin,
        bool isStaff,
        bool isOwner,
        bool isAssigned,
        bool expected)
    {
        // Arrange
        var currentUserId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();

        var submittedByUserId =
            isOwner ? currentUserId : otherUserId;

        Guid? assignedToUserId =
            isAssigned ? currentUserId : null;

        var service = new ComplaintAccessService();

        // Act
        var result = service.CanViewComplaint(
            currentUserId,
            isAdmin,
            isStaff,
            submittedByUserId,
            assignedToUserId);

        // Assert
        Assert.Equal(expected, result);
    }
}
