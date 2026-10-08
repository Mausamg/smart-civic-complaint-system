using Xunit;
using CivicComplaintSystem.Api.Features.Complaints;

namespace CivicComplaintSystem.Tests;

public class ComplaintStatusRulesTests
{
    [Fact]
    public void ResolvedStatus_ShouldBeTerminal()
    {
        // Arrange
        var status = ComplaintStatus.Resolved;

        // Act
        var result = ComplaintStatusRules.IsTerminal(status);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void SubmittedToUnderReview_ShouldBeAllowed()
    {
        // Act
        var result = ComplaintStatusRules.CanTransition(
            ComplaintStatus.Submitted,
            ComplaintStatus.UnderReview);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void ResolvedToInProgress_ShouldBeRejected()
    {
        // Act
        var result = ComplaintStatusRules.CanTransition(
            ComplaintStatus.Resolved,
            ComplaintStatus.InProgress);

        // Assert
        Assert.False(result);
    }
    
    
    [Theory]
    [InlineData(ComplaintStatus.Submitted,
        ComplaintStatus.Resolved, false)]

    [InlineData(ComplaintStatus.UnderReview,
        ComplaintStatus.InProgress, true)]

    [InlineData(ComplaintStatus.InProgress,
        ComplaintStatus.Resolved, true)]

    [InlineData(ComplaintStatus.Withdrawn,
        ComplaintStatus.UnderReview, false)]

    public void CanTransition_ShouldReturnExpectedResult(
        ComplaintStatus currentStatus,
        ComplaintStatus newStatus,
        bool expected)
    {
        // Act
        var result = ComplaintStatusRules.CanTransition(
            currentStatus, newStatus);

        // Assert
        Assert.Equal(expected, result);
    }

}