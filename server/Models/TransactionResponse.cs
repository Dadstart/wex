namespace Wex.Server.Models;

public class TransactionResponse
{
    public Guid Id { get; set; }

    public required string Description { get; set; }

    public DateTime TransactionDate { get; set; }

    public decimal PurchaseAmountUsd { get; set; }

    public string? TargetCurrency { get; set; }

    public decimal? ExchangeRate { get; set; }

    public decimal? ConvertedAmount { get; set; }
}
