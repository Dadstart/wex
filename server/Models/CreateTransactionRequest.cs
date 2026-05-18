namespace Wex.Server.Models;

public record CreateTransactionRequest(
    string Description,
    DateTime Date,
    decimal Amount);
