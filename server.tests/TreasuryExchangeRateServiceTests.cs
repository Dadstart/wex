using Microsoft.Extensions.Caching.Memory;
using Wex.Server.Services;
using Wex.Server.Tests.Testing;

namespace Wex.Server.Tests;

public class TreasuryExchangeRateServiceTests
{
    [Fact]
    public async Task GetCurrenciesAsync_ReturnsDistinctSortedCurrencies()
    {
        var service = CreateService(new FakeTreasuryHandler
        {
            Currencies = ["Zloty", "Euro", "Euro", "  ", "Zloty"],
        });

        var currencies = await service.GetCurrenciesAsync();

        Assert.Equal(["Euro", "Zloty"], currencies);
    }

    [Fact]
    public async Task FindRateForPurchaseAsync_ForUsDollar_ReturnsUnitRate()
    {
        var service = CreateService(new FakeTreasuryHandler());
        var purchaseDate = new DateOnly(2024, 6, 15);

        var rate = await service.FindRateForPurchaseAsync(
            TreasuryExchangeRateService.UsDollarCurrency,
            purchaseDate);

        Assert.NotNull(rate);
        Assert.Equal(1m, rate.ExchangeRate);
        Assert.Equal(purchaseDate, rate.RecordDate);
    }

    [Fact]
    public async Task FindRateForPurchaseAsync_UsesLatestRecordDate()
    {
        var service = CreateService(new FakeTreasuryHandler());
        var purchaseDate = new DateOnly(2024, 6, 15);

        var rate = await service.FindRateForPurchaseAsync("Euro", purchaseDate);

        Assert.NotNull(rate);
        Assert.Equal(new DateOnly(2024, 6, 15), rate.RecordDate);
        Assert.Equal(0.92m, rate.ExchangeRate);
    }

    [Fact]
    public async Task FindRateForPurchaseAsync_WhenNoRates_ReturnsNull()
    {
        var service = CreateService(new FakeTreasuryHandler { Rates = [] });
        var purchaseDate = new DateOnly(2024, 6, 15);

        var rate = await service.FindRateForPurchaseAsync("Euro", purchaseDate);

        Assert.Null(rate);
    }

    private static TreasuryExchangeRateService CreateService(FakeTreasuryHandler handler) =>
        new(new HttpClient(handler), new MemoryCache(new MemoryCacheOptions()));
}
