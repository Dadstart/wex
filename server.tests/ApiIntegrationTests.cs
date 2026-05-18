using System.Net;
using System.Net.Http.Json;
using Wex.Server.Models;
using Wex.Server.Tests.Testing;

namespace Wex.Server.Tests;

public class ApiIntegrationTests : IClassFixture<WexWebApplicationFactory>
{
    private readonly HttpClient _client;

    public ApiIntegrationTests(WexWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Health_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/health");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        Assert.Equal("ok", body?["status"]);
    }

    [Fact]
    public async Task GetCurrencies_ReturnsTreasuryCurrencies()
    {
        var response = await _client.GetAsync("/api/currencies");

        response.EnsureSuccessStatusCode();
        var currencies = await response.Content.ReadFromJsonAsync<string[]>();
        Assert.NotNull(currencies);
        Assert.Contains("Euro", currencies);
    }

    [Fact]
    public async Task CreateTransaction_WithInvalidDescription_ReturnsValidationProblem()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/transactions",
            new { description = "", date = DateTime.UtcNow, amount = 10m });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateTransaction_ThenListWithoutCurrency_ReturnsCreatedTransaction()
    {
        var createResponse = await _client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                description = "Integration test",
                date = new DateTime(2024, 6, 15, 14, 30, 0, DateTimeKind.Utc),
                amount = 42.75m,
            });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<TransactionResponse>();
        Assert.NotNull(created);
        Assert.Equal("Integration test", created.Description);
        Assert.Equal(42.75m, created.PurchaseAmountUsd);

        var listResponse = await _client.GetAsync("/api/transactions");
        listResponse.EnsureSuccessStatusCode();
        var transactions = await listResponse.Content.ReadFromJsonAsync<TransactionResponse[]>();

        Assert.Contains(transactions!, t => t.Id == created.Id);
    }

    [Fact]
    public async Task GetTransactions_WithCurrency_ConvertsAmounts()
    {
        await _client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                description = "Converted",
                date = new DateTime(2024, 6, 15, 10, 0, 0, DateTimeKind.Utc),
                amount = 10m,
            });

        var response = await _client.GetAsync(
            "/api/transactions?currency=" + Uri.EscapeDataString("Euro"));

        response.EnsureSuccessStatusCode();
        var transactions = await response.Content.ReadFromJsonAsync<TransactionResponse[]>();
        var converted = Assert.Single(transactions!, t => t.Description == "Converted");

        Assert.Equal("Euro", converted.TargetCurrency);
        Assert.Equal(0.92m, converted.ExchangeRate);
        Assert.Equal(9.20m, converted.ConvertedAmount);
    }
}
