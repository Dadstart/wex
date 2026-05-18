namespace Wex.Server.Data;

public class Transaction
{
    public Guid Id { get; set; }

    public required string Description { get; set; }

    public DateTime TransactionDate { get; set; }

    public decimal PurchaseAmount { get; set; }
}
