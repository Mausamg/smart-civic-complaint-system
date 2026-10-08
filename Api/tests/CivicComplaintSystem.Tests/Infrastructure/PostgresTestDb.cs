using CivicComplaintSystem.Api.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace CivicComplaintSystem.Tests.Infrastructure;

internal static class PostgresTestDb
{
    public static DbContextOptions<AppDbContext> CreateOptions()
    {
        var connectionString =
            Environment.GetEnvironmentVariable(
                "CIVIC_TEST_CONNECTION");

        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException(
                "Test database connection is missing.");

        var builder =
            new NpgsqlConnectionStringBuilder(connectionString);

        if (builder.Database != "civiccomplaint_test" ||
            builder.Username != "civic_test_user" ||
            builder.Host is not ("localhost" or "127.0.0.1"))
        {
            throw new InvalidOperationException(
                "Tests must use the dedicated local test database.");
        }

        return new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(builder.ConnectionString)
            .Options;
    }
}
