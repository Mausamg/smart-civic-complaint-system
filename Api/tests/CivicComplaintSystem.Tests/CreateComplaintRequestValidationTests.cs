using System.ComponentModel.DataAnnotations;
using CivicComplaintSystem.Api.Features.Complaints;

namespace CivicComplaintSystem.Tests;

public class CreateComplaintRequestValidationTests
{
    private static CreateComplaintRequest CreateRequest(
        DateTimeOffset? observedAt)
    {
        return new CreateComplaintRequest
        {
            Title = "Test pothole",
            Description = "A pothole needs repair.",
            Category = "potholes",
            Location = "Kathmandu",
            ObservedAt = observedAt
        };
    }

    private static bool IsValid(
        CreateComplaintRequest request)
    {
        var results = new List<ValidationResult>();

        return Validator.TryValidateObject(
            request,
            new ValidationContext(request),
            results,
            validateAllProperties: true);
    }

    [Fact]
    public void FutureObservation_ShouldBeRejected()
    {
        var request = CreateRequest(
            DateTimeOffset.UtcNow.AddDays(1));

        Assert.False(IsValid(request));
    }

    [Fact]
    public void PastObservation_ShouldBeAccepted()
    {
        var request = CreateRequest(
            DateTimeOffset.UtcNow.AddDays(-1));

        Assert.True(IsValid(request));
    }

    [Fact]
    public void MissingObservation_ShouldBeAccepted()
    {
        var request = CreateRequest(null);

        Assert.True(IsValid(request));
    }

    [Fact]
    public void FutureObservation_WithTimezoneOffset_ShouldBeRejected()
    {
        var future = DateTimeOffset.UtcNow
            .AddHours(2)
            .ToOffset(TimeSpan.FromHours(5.75));

        var request = CreateRequest(future);

        Assert.False(IsValid(request));
    }
}