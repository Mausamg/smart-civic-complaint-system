using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace CivicComplaintSystem.Tests.Infrastructure;

public sealed class TestApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(
        IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        // Validate our dedicated PostgreSQL test database
        _ = PostgresTestDb.CreateOptions();

        var connectionString =
            Environment.GetEnvironmentVariable(
                "CIVIC_TEST_CONNECTION")!;

        // Supply settings before Program.cs executes
        builder.ConfigureHostConfiguration(config =>
        {
            config.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] =
                        connectionString,

                    ["Jwt:Key"] =
                        $"{Guid.NewGuid():N}{Guid.NewGuid():N}",

                    ["Jwt:Issuer"] =
                        "civic-integration-tests",

                    ["Jwt:Audience"] =
                        "civic-integration-tests",

                    ["SeedAdmin:Email"] =
                        "integration-admin@localhost.invalid",

                    ["SeedAdmin:Password"] =
                        $"TestAdmin!7{Guid.NewGuid():N}"
                });
        });

        return base.CreateHost(builder);
    }
    
    
}