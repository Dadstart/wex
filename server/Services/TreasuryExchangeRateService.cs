using System.Globalization;
using System.Net.Http.Json;
using Microsoft.Extensions.Caching.Memory;

namespace Wex.Server.Services;

public sealed class TreasuryExchangeRateService(HttpClient http, IMemoryCache cache)
{
    private const string RatesBaseUrl =
        "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/rates_of_exchange";

    public const string UsDollarCurrency = "U.S. Dollar";

    public async Task<IReadOnlyList<string>> GetCurrenciesAsync(CancellationToken cancellationToken = default)
    {
        return await cache.GetOrCreateAsync(
            "treasury-currencies",
            async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24);
                var url =
                    $"{RatesBaseUrl}?fields=currency&sort=currency&page%5Bsize%5D=1000";
                var response = await http.GetFromJsonAsync<TreasuryCurrenciesResponse>(
                    url,
                    cancellationToken);
                return (IReadOnlyList<string>)(response?.Data
                        .Select(row => row.Currency)
                        .Where(c => !string.IsNullOrWhiteSpace(c))
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .OrderBy(c => c, StringComparer.OrdinalIgnoreCase)
                        .ToList()
                    ?? []);
            }) ?? [];
    }

    public async Task<ExchangeRateRecord?> FindRateForPurchaseAsync(
        string targetCurrency,
        DateOnly purchaseDate,
        CancellationToken cancellationToken = default)
    {
        if (string.Equals(targetCurrency, UsDollarCurrency, StringComparison.OrdinalIgnoreCase))
        {
            return new ExchangeRateRecord(purchaseDate, 1m);
        }

        var windowStart = purchaseDate.AddMonths(-6);
        var filter =
            $"currency:eq:{targetCurrency},record_date:lte:{purchaseDate:yyyy-MM-dd},record_date:gte:{windowStart:yyyy-MM-dd}";
        var url =
            $"{RatesBaseUrl}?fields=currency,record_date,exchange_rate&filter={Uri.EscapeDataString(filter)}&sort=-record_date&page%5Bsize%5D=100";

        var response = await http.GetFromJsonAsync<TreasuryRatesResponse>(url, cancellationToken);
        if (response?.Data is not { Count: > 0 })
        {
            return null;
        }

        var parsed = response.Data
            .Select(row =>
            {
                if (!DateOnly.TryParse(row.RecordDate, CultureInfo.InvariantCulture, DateTimeStyles.None, out var recordDate))
                {
                    return null;
                }

                if (!decimal.TryParse(row.ExchangeRate, NumberStyles.Number, CultureInfo.InvariantCulture, out var rate))
                {
                    return null;
                }

                return new ExchangeRateRecord(recordDate, rate);
            })
            .Where(row => row is not null)
            .Cast<ExchangeRateRecord>()
            .ToList();

        if (parsed.Count == 0)
        {
            return null;
        }

        var latestDate = parsed.Max(row => row.RecordDate);
        return parsed.Where(row => row.RecordDate == latestDate).Last();
    }
}
