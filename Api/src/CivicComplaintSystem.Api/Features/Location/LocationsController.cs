using System.Text.Json;
using CivicComplaintSystem.Api.Features.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.AspNetCore.RateLimiting;

namespace CivicComplaintSystem.Api.Features.Locations;

[ApiController]
[Route("api/locations")]
[Authorize(Roles = AppRoles.Citizen)]
public sealed class LocationsController(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IMemoryCache cache,
    ILogger<LocationsController> logger) : ControllerBase
{
    [HttpGet("search")]
    [EnableRateLimiting("location-search")]
    public async Task<IActionResult> Search(
        [FromQuery] string? q,
        [FromQuery] string? mode,
        CancellationToken cancellationToken)
    {
        var query = q?.Trim();

        if (string.IsNullOrWhiteSpace(query) ||
            query.Length < 3 ||
            query.Length > 120)
        {
            return BadRequest(new
            {
                message = "Enter a location between 3 and 120 characters."
            });
        }

        var searchMode = mode?.Trim().ToLowerInvariant() ?? "city";

        if (searchMode is not ("city" or "place"))
        {
            return BadRequest(new
            {
                message = "Search mode must be city or place."
            });
        }
        var apiKey = configuration["Geoapify:ApiKey"];

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return StatusCode(503, new
            {
                message = "Location search is not configured."
            });
        }

        var cacheKey =
            $"locations:np:{searchMode}:{query.ToLowerInvariant()}";

        if (cache.TryGetValue(
            cacheKey,
            out LocationSearchResult[]? cached))
        {
            return Ok(cached);
        }


        var url =
            "https://api.geoapify.com/v1/geocode/search" +
            $"?text={Uri.EscapeDataString(query!)}" +
            "&filter=countrycode:np" +
            (searchMode == "city" ? "&type=city" : "") +
            "&format=json" +
            "&limit=5" +
            "&lang=en" +
            $"&apiKey={Uri.EscapeDataString(apiKey)}";


        try
        {
            var client = httpClientFactory.CreateClient("Geoapify");

            using var response = await client.GetAsync(
                url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning(
                    "Geoapify returned HTTP {StatusCode}",
                    (int)response.StatusCode);

                return StatusCode(502, new
                {
                    message = "Location search is temporarily unavailable."
                });
            }

            await using var stream =
                await response.Content.ReadAsStreamAsync(
                    cancellationToken);

            using var json = await JsonDocument.ParseAsync(
                stream,
                cancellationToken: cancellationToken);

            var results = new List<LocationSearchResult>();

            if (!json.RootElement.TryGetProperty(
                "results", out var places) ||
                places.ValueKind != JsonValueKind.Array)
            {
                return StatusCode(502, new
                {
                    message = "Unexpected location search response."
                });
            }

            foreach (var place in places.EnumerateArray())
            {
                if (!place.TryGetProperty("lat", out var latValue) ||
                    !place.TryGetProperty("lon", out var lonValue) ||
                    !place.TryGetProperty("formatted", out var nameValue) ||
                    !latValue.TryGetDouble(out var latitude) ||
                    !lonValue.TryGetDouble(out var longitude))
                {
                    continue;
                }

                var name = nameValue.GetString();

                if (!string.IsNullOrWhiteSpace(name))
                {
                    results.Add(new LocationSearchResult(
                        name, latitude, longitude));
                }
            }

            var output = results.ToArray();

            cache.Set(cacheKey, output, TimeSpan.FromMinutes(30));

            return Ok(output);
        }
        catch (HttpRequestException)
        {
            return StatusCode(502, new
            {
                message = "Could not connect to location search."
            });
        }
        catch (JsonException)
        {
            return StatusCode(502, new
            {
                message = "Invalid location search response."
            });
        }
        catch (TaskCanceledException)
            when (!cancellationToken.IsCancellationRequested)
        {
            return StatusCode(504, new
            {
                message = "Location search timed out."
            });
        }
    }
}

public sealed record LocationSearchResult(
    string Name,
    double Latitude,
    double Longitude);
