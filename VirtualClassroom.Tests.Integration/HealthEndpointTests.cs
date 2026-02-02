using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace VirtualClassroom.Tests.Integration;

public sealed class HealthEndpointTests : IClassFixture<VirtualClassroomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public HealthEndpointTests(VirtualClassroomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetHealth_ReturnsOk()
    {
        var response = await _client.GetAsync("/health");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetHealthReady_ReturnsOkOrServiceUnavailable()
    {
        var response = await _client.GetAsync("/health/ready");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.ServiceUnavailable);
    }
}
