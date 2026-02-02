using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace VirtualClassroom.Tests.Integration;

public sealed class VirtualClassroomWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["UseInMemory"] = "true",
                ["Logging:LogLevel:Default"] = "Warning",
                ["Serilog:MinimumLevel:Default"] = "Warning",
                ["EnableSwagger"] = "false"
            });
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Ensure Hangfire and other non-test services don't start in tests if needed
        });
        return base.CreateHost(builder);
    }
}
