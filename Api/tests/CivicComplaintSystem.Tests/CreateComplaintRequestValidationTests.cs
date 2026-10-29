using System.ComponentModel.DataAnnotations;
using CivicComplaintSystem.Api.Features.Complaints;

namespace CivicComplaintSystem.Tests;

public class CreateComplaintRequestValidationTests
{
    private static CreateComplaintRequest CreateRequest(
        DateTimeOffset? observedAt,
        double? latitude = 27.7172,
        double? longitude = 85.3240,
        string? municipality = "Kathmandu Metropolitan City")
    {
        return new CreateComplaintRequest
        {
            Title = "Test pothole",
            Description = "A pothole needs repair.",
            Category = "potholes",
            Location = "Kathmandu",
            ObservedAt = observedAt,
            Latitude = latitude,
            Longitude = longitude,
            Municipality = municipality
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

    [Theory]
    [InlineData(null, null)]
    [InlineData(null, 85.3240)]
    [InlineData(27.7172, null)]
    public void MissingOrIncompleteCoordinates_ShouldBeRejected(
        double? latitude,
        double? longitude)
    {
        var request = CreateRequest(
            DateTimeOffset.UtcNow.AddDays(-1),
            latitude,
            longitude);

        Assert.False(IsValid(request));
    }

    [Fact]
    public void ValidCoordinates_ShouldBeAccepted()
    {
        var request = CreateRequest(
            DateTimeOffset.UtcNow.AddDays(-1));

        Assert.True(IsValid(request));
    }

    [Theory]
    [InlineData(-90.1, 85.3240)]
    [InlineData(90.1, 85.3240)]
    [InlineData(27.7172, -180.1)]
    [InlineData(27.7172, 180.1)]
    public void OutOfRangeCoordinates_ShouldBeRejected(
        double latitude,
        double longitude)
    {
        var request = CreateRequest(
            DateTimeOffset.UtcNow.AddDays(-1),
            latitude,
            longitude);

        Assert.False(IsValid(request));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void MissingOrBlankMunicipality_ShouldBeRejected(
        string? municipality)
    {
        var request = CreateRequest(
            DateTimeOffset.UtcNow.AddDays(-1),
            municipality: municipality);

        Assert.False(IsValid(request));
    }

    [Fact]
    public void MunicipalityWithoutWard_ShouldBeAccepted()
    {
        var request = CreateRequest(
            DateTimeOffset.UtcNow.AddDays(-1));

        Assert.Null(request.Ward);
        Assert.True(IsValid(request));
    }
}
