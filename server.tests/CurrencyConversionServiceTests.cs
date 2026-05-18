using Microsoft.Extensions.Caching.Memory;
using Wex.Server.Data;
using Wex.Server.Services;
using Wex.Server.Tests.Testing;

namespace Wex.Server.Tests;

public class CurrencyConversionServiceTests
{
    [Fact]
    public async Task ToResponseAsync_WithoutTargetCurrency_ReturnsUsdOnly()
    {
        var service = CreateService(new FakeTreasuryHandler());
        var transaction = new Transaction
        {
            Id = Guid.NewGuid(),
            Description = "Coffee",
            TransactionDate = new DateTime(2024, 6, 15, 12, 0, 0, DateTimeKind.Utc),
            PurchaseAmount = 12.50m,
        };

        var response = await service.ToResponseAsync(transaction, null);

        Assert.Equal(transaction.Id, response.Id);
        Assert.Equal(12.50m, response.PurchaseAmountUsd);
        Assert.Null(response.TargetCurrency);
        Assert.Null(response.ExchangeRate);
        Assert.Null(response.ConvertedAmount);
    }

    [Fact]
    public async Task ToResponseAsync_WithRate_AppliesExchangeRateAndRounds()
    {
        var service = CreateService(new FakeTreasuryHandler());
        var transaction = new Transaction
        {
            Id = Guid.NewGuid(),
            Description = "Lunch",
            TransactionDate = new DateTime(2024, 6, 15, 9, 0, 0, DateTimeKind.Utc),
            PurchaseAmount = 10m,
        };

        var response = await service.ToResponseAsync(transaction, "Euro");

        Assert.Equal("Euro", response.TargetCurrency);
        Assert.Equal(0.92m, response.ExchangeRate);
        Assert.Equal(9.20m, response.ConvertedAmount);
    }

    [Fact]
    public async Task ToResponseAsync_WhenRateMissing_ThrowsConversionException()
    {
        var handler = new FakeTreasuryHandler { Rates = [] };
        var service = CreateService(handler);
        var transaction = new Transaction
        {
            Id = Guid.NewGuid(),
            Description = "Snack",
            TransactionDate = new DateTime(2024, 6, 15, 9, 0, 0, DateTimeKind.Utc),
            PurchaseAmount = 5m,
        };

        var exception = await Assert.ThrowsAsync<CurrencyConversionException>(
            () => service.ToResponseAsync(transaction, "Euro"));

        Assert.Equal(CurrencyConversionService.ConversionUnavailableMessage, exception.Message);
    }

    private static CurrencyConversionService CreateService(FakeTreasuryHandler handler)
    {
        var treasury = new TreasuryExchangeRateService(
            new HttpClient(handler),
            new MemoryCache(new MemoryCacheOptions()));
        return new CurrencyConversionService(treasury);
    }
}
