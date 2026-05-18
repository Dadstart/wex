using Microsoft.EntityFrameworkCore;
using Wex.Server.Data;
using Wex.Server.Models;
using Wex.Server.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<TreasuryExchangeRateService>();
builder.Services.AddScoped<CurrencyConversionService>();
builder.Services.AddDbContext<WexDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    await DbInitializer.InitializeAsync(scope.ServiceProvider.GetRequiredService<WexDbContext>());
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHsts();
}

if (!app.Environment.IsEnvironment("Testing"))
{
    app.UseHttpsRedirection();
}
app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/api/currencies", async (TreasuryExchangeRateService treasuryRates, CancellationToken cancellationToken) =>
    Results.Ok(await treasuryRates.GetCurrenciesAsync(cancellationToken)))
.WithName("GetCurrencies");

app.MapGet("/api/transactions", async (
    string? currency,
    WexDbContext db,
    CurrencyConversionService conversion,
    CancellationToken cancellationToken) =>
{
    var transactions = await db.Transactions
        .AsNoTracking()
        .OrderByDescending(t => t.TransactionDate)
        .ToListAsync(cancellationToken);

    try
    {
        var responses = new List<TransactionResponse>(transactions.Count);
        foreach (var transaction in transactions)
        {
            responses.Add(await conversion.ToResponseAsync(transaction, currency, cancellationToken));
        }

        return Results.Ok(responses);
    }
    catch (CurrencyConversionException ex)
    {
        return Results.UnprocessableEntity(new { title = ex.Message });
    }
})
.WithName("GetTransactions");

app.MapPost("/api/transactions", async (
    CreateTransactionRequest request,
    WexDbContext db,
    CurrencyConversionService conversion,
    CancellationToken cancellationToken) =>
{
    var validationError = ValidateCreateTransactionRequest(request);
    if (validationError is not null)
    {
        return validationError;
    }

    var transaction = new Transaction
    {
        Id = Guid.NewGuid(),
        Description = request.Description.Trim(),
        TransactionDate = request.Date,
        PurchaseAmount = request.Amount
    };

    db.Transactions.Add(transaction);
    await db.SaveChangesAsync(cancellationToken);

    var response = await conversion.ToResponseAsync(transaction, null, cancellationToken);
    return Results.Created($"/api/transactions/{transaction.Id}", response);
})
.WithName("CreateTransaction");

app.MapFallbackToFile("index.html");

app.Run();

static IResult? ValidateCreateTransactionRequest(CreateTransactionRequest request)
{
    var errors = new Dictionary<string, string[]>();

    if (string.IsNullOrWhiteSpace(request.Description))
    {
        errors["description"] = ["Description is required."];
    }
    else if (request.Description.Length > 50)
    {
        errors["description"] = ["Description must be 50 characters or less."];
    }

    return errors.Count > 0 ? Results.ValidationProblem(errors) : null;
}
