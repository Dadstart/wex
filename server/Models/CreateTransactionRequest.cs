namespace Wex.Server.Models;

public record CreateTransactionRequest(
    string Description,
    DateOnly Date,
    decimal Amount);
