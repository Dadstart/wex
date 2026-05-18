using Microsoft.EntityFrameworkCore;
using Wex.Server.Data;
using Wex.Server.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
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

app.UseHttpsRedirection();
app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.MapPost("/api/transactions", async (CreateTransactionRequest request, WexDbContext db) =>
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
    await db.SaveChangesAsync();

    return Results.Created($"/api/transactions/{transaction.Id}", transaction);
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
