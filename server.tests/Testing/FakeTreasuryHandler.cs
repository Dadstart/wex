using System.Net;
using System.Text;
using System.Text.Json;
using Wex.Server.Services;

namespace Wex.Server.Tests.Testing;

internal sealed class FakeTreasuryHandler : HttpMessageHandler
{
    public IReadOnlyList<string> Currencies { get; init; } =
    [
        "Euro",
        TreasuryExchangeRateService.UsDollarCurrency,
    ];

    public IReadOnlyList<TreasuryRateFixture> Rates { get; init; } =
    [
        new("Euro", "2024-06-15", "0.92"),
        new("Euro", "2024-06-01", "0.90"),
    ];

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var path = request.RequestUri?.PathAndQuery ?? "";

        if (path.Contains("record_date", StringComparison.Ordinal))
        {
            var payload = new { data = Rates.Select(r => r.ToRow()).ToArray() };
            return Task.FromResult(JsonResponse(payload));
        }

        if (path.Contains("fields=currency", StringComparison.Ordinal))
        {
            var payload = new
            {
                data = Currencies.Select(c => new { currency = c }).ToArray(),
            };
            return Task.FromResult(JsonResponse(payload));
        }

        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
    }

    private static HttpResponseMessage JsonResponse(object payload)
    {
        var json = JsonSerializer.Serialize(payload);
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
        };
    }

    internal sealed record TreasuryRateFixture(string Currency, string RecordDate, string ExchangeRate)
    {
        public object ToRow() => new
        {
            currency = Currency,
            record_date = RecordDate,
            exchange_rate = ExchangeRate,
        };
    }
}
