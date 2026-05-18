using Wex.Server.Data;
using Wex.Server.Models;

namespace Wex.Server.Services;

public sealed class CurrencyConversionService(TreasuryExchangeRateService treasuryRates)
{
    public const string ConversionUnavailableMessage =
        "The purchase cannot be converted to the target currency.";

    public async Task<TransactionResponse> ToResponseAsync(
        Transaction transaction,
        string? targetCurrency,
        CancellationToken cancellationToken = default)
    {
        var response = new TransactionResponse
        {
            Id = transaction.Id,
            Description = transaction.Description,
            TransactionDate = transaction.TransactionDate,
            PurchaseAmountUsd = transaction.PurchaseAmount,
        };

        if (string.IsNullOrWhiteSpace(targetCurrency))
        {
            return response;
        }

        response.TargetCurrency = targetCurrency.Trim();
        var purchaseDate = DateOnly.FromDateTime(transaction.TransactionDate);

        var rateRecord = await treasuryRates.FindRateForPurchaseAsync(
            response.TargetCurrency,
            purchaseDate,
            cancellationToken);

        if (rateRecord is null)
        {
            throw new CurrencyConversionException(ConversionUnavailableMessage);
        }

        response.ExchangeRate = rateRecord.ExchangeRate;
        response.ConvertedAmount = Math.Round(
            transaction.PurchaseAmount * rateRecord.ExchangeRate,
            2,
            MidpointRounding.AwayFromZero);

        return response;
    }
}
