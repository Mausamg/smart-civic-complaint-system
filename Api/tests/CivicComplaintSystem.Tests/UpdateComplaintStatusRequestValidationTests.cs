using System.ComponentModel.DataAnnotations;
using CivicComplaintSystem.Api.Features.Complaints;

namespace CivicComplaintSystem.Tests;

public class UpdateComplaintStatusRequestValidationTests
{
    private static bool IsValid(UpdateComplaintStatusRequest request)
    {
        var results = new List<ValidationResult>();

        return Validator.TryValidateObject(
            request,
            new ValidationContext(request),
            results,
            validateAllProperties: true);
    }

    [Fact]
    public void MissingNote_ShouldBeAccepted()
    {
        var request = new UpdateComplaintStatusRequest
        {
            Status = ComplaintStatus.InProgress
        };

        Assert.True(IsValid(request));
    }

    [Fact]
    public void NoteWith500Characters_ShouldBeAccepted()
    {
        var request = new UpdateComplaintStatusRequest
        {
            Status = ComplaintStatus.InProgress,
            Note = new string('A', 500)
        };

        Assert.True(IsValid(request));
    }

    [Fact]
    public void NoteWith501Characters_ShouldBeRejected()
    {
        var request = new UpdateComplaintStatusRequest
        {
            Status = ComplaintStatus.InProgress,
            Note = new string('A', 501)
        };

        Assert.False(IsValid(request));
    }
}
