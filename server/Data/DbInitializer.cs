using Microsoft.EntityFrameworkCore;

namespace Wex.Server.Data;

public static class DbInitializer
{
    private static readonly string[] Summaries =
    [
        "Freezing", "Bracing", "Chilly", "Cool", "Mild",
        "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
    ];

    public static async Task InitializeAsync(WexDbContext db, CancellationToken cancellationToken = default)
    {
        await db.Database.MigrateAsync(cancellationToken);

        if (await db.Forecasts.AnyAsync(cancellationToken))
        {
            return;
        }

        var today = DateOnly.FromDateTime(DateTime.Today);
        var forecasts = Enumerable.Range(1, 5).Select(index =>
            new WeatherForecast
            {
                Date = today.AddDays(index),
                TemperatureC = Random.Shared.Next(-20, 55),
                Summary = Summaries[Random.Shared.Next(Summaries.Length)]
            });

        db.Forecasts.AddRange(forecasts);
        await db.SaveChangesAsync(cancellationToken);
    }
}
